import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { WaitUntil } from "next/dist/server/after/builtin-request-context";
import type { NextRequest } from "next/server";
import type { MiddlewareMetadata } from "../src";
import {
  FetchEvent,
  NemoEvent,
  NextFetchEvent,
  getWaitUntilPromiseFromEvent,
} from "../src/event";

describe("FetchEvent", () => {
  let mockRequest: Request;
  let mockWaitUntil: WaitUntil;

  beforeEach(() => {
    mockRequest = new Request("https://example.com");
    mockWaitUntil = mock(() => {});
  });

  test("constructor initializes with internal waitUntil when no external provided", () => {
    const event = new FetchEvent(mockRequest);
    expect(event).toBeDefined();
  });

  test("constructor initializes with external waitUntil when provided", () => {
    const event = new FetchEvent(mockRequest, mockWaitUntil);
    event.waitUntil(Promise.resolve());
    expect(mockWaitUntil).toHaveBeenCalled();
  });

  test("respondWith sets response", async () => {
    const event = new FetchEvent(mockRequest);
    const mockResponse = new Response("test");
    event.respondWith(mockResponse);
    const responsePromise = (event as any)[Symbol.for("response")];
    const response = await responsePromise;
    expect(response).toBe(mockResponse);
  });

  test("passThroughOnException sets passThrough flag", () => {
    const event = new FetchEvent(mockRequest);
    event.passThroughOnException();
    expect((event as any)[Symbol.for("passThrough")]).toBe(true);
  });

  test("waitUntil with internal handling", async () => {
    const event = new FetchEvent(mockRequest);
    const promise = Promise.resolve("test");
    event.waitUntil(promise);
    const result = await getWaitUntilPromiseFromEvent(event);
    expect(result).toBeUndefined();
  });

  test("waitUntil throws if called after response is set", async () => {
    const event = new FetchEvent(mockRequest);
    event.respondWith(new Response("test"));
    expect(() => event.waitUntil(Promise.resolve())).toThrow();
  });

  test("respondWith throws if called multiple times", () => {
    const event = new FetchEvent(mockRequest);
    event.respondWith(new Response("test"));
    expect(() => event.respondWith(new Response("test2"))).toThrow();
  });

  test("waitUntil handles rejected promises", async () => {
    const event = new FetchEvent(mockRequest);
    const error = new Error("test error");
    const promise = Promise.reject(error);
    event.waitUntil(promise);
    await expect(getWaitUntilPromiseFromEvent(event)).rejects.toThrow(
      "test error",
    );
  });

  test("implements Event interface methods", () => {
    const event = new FetchEvent(mockRequest);
    expect(() => event.preventDefault()).toThrow("Method not implemented");
    expect(() => event.stopPropagation()).toThrow("Method not implemented");
    expect(() => event.stopImmediatePropagation()).toThrow(
      "Method not implemented",
    );
    expect(() => event.initEvent("test")).toThrow("Method not implemented");
    expect(() => event.composedPath()).toThrow("Method not implemented");
  });

  test("has correct Event interface properties", () => {
    const event = new FetchEvent(mockRequest);
    expect(event.NONE).toBe(0);
    expect(event.CAPTURING_PHASE).toBe(1);
    expect(event.AT_TARGET).toBe(2);
    expect(event.BUBBLING_PHASE).toBe(3);
    expect(event.target).toBe(null);
    expect(event.currentTarget).toBe(null);
    expect(event.eventPhase).toBeDefined();
  });

  test("waitUntil handles multiple promises", async () => {
    const event = new FetchEvent(mockRequest);
    const promise1 = Promise.resolve("test1");
    const promise2 = Promise.resolve("test2");
    event.waitUntil(promise1);
    event.waitUntil(promise2);
    await getWaitUntilPromiseFromEvent(event);
  });
});

describe("NextFetchEvent", () => {
  let mockRequest: Request;
  let mockContext: { waitUntil: WaitUntil };

  beforeEach(() => {
    mockRequest = new Request("https://example.com");
    mockContext = { waitUntil: mock(() => {}) };
  });

  test("constructor initializes with correct properties", () => {
    const event = new NextFetchEvent({
      request: mockRequest as any,
      page: "/test",
      context: mockContext,
    });
    expect(event.sourcePage).toBe("/test");
  });

  test("waitUntil delegates to context", async () => {
    const event = new NextFetchEvent({
      request: mockRequest as any,
      page: "/test",
      context: mockContext,
    });
    const promise = Promise.resolve();
    event.waitUntil(promise);
    expect(mockContext.waitUntil).toHaveBeenCalledWith(promise);
  });

  test("sourcePage defaults to / when not provided", () => {
    const event = new NextFetchEvent({
      request: mockRequest as unknown as NextRequest,
      page: "/",
      context: mockContext,
    });
    expect(event.sourcePage).toBe("/");
  });

  test("handles undefined context", () => {
    const event = new NextFetchEvent({
      request: mockRequest as any,
      page: "/test",
      context: undefined,
    });
    expect(() => event.waitUntil(Promise.resolve())).not.toThrow();
  });

  test("preserves request object", () => {
    const event = new NextFetchEvent({
      request: mockRequest as any,
      page: "/test",
      context: mockContext,
    });
    expect(event instanceof FetchEvent).toBe(true);
  });
});

describe("NemoEvent", () => {
  let mockRequest: Request;
  let mockContext: { waitUntil: WaitUntil };

  beforeEach(() => {
    mockRequest = new Request("https://example.com");
    mockContext = { waitUntil: mock(() => {}) };
  });

  test("preserves context waitUntil functionality", () => {
    const event = new NemoEvent({
      request: mockRequest as any,
      sourcePage: "/test",
      context: mockContext,
    });
    const promise = Promise.resolve();
    event.waitUntil(promise);
    expect(mockContext.waitUntil).toHaveBeenCalledWith(promise);
  });

  describe("getParams", () => {
    test("extracts simple parameters from URL path", () => {
      const event = new NemoEvent({
        request: new Request("https://example.com/users/123") as any,
        sourcePage: "/users/[id]",
        context: mockContext,
      });

      const params = event.getParams({
        chain: "main",
        index: 0,
        pathname: "/users/123",
        routeKey: "/users/:id",
        nestLevel: 0,
      });

      expect(params).toEqual({ id: "123" });
    });

    test("extracts multiple parameters from URL path", () => {
      const event = new NemoEvent({
        request: new Request("https://example.com/users/123/posts/456") as any,
        sourcePage: "/users/[userId]/posts/[postId]",
        context: mockContext,
      });

      const params = event.getParams({
        chain: "main",
        index: 0,
        pathname: "/users/123/posts/456",
        routeKey: "/users/:userId/posts/:postId",
        nestLevel: 0,
      });

      expect(params).toEqual({ userId: "123", postId: "456" });
    });

    test("handles wildcard patterns", () => {
      const event = new NemoEvent({
        request: new Request(
          "https://example.com/api/products/category/electronics",
        ) as any,
        sourcePage: "/api/products/[...slug]",
        context: mockContext,
      });

      const params = event.getParams({
        chain: "main",
        index: 0,
        pathname: "/api/products/category/electronics",
        routeKey: "/api/products/:slug*",
        nestLevel: 0,
      });

      expect(params).toHaveProperty("slug");
      expect(
        Array.isArray(params.slug) || typeof params.slug === "string",
      ).toBe(true);
    });

    test("returns empty object when no metadata provided", () => {
      const event = new NemoEvent({
        request: new Request("https://example.com/users/123") as any,
        sourcePage: "/users/[id]",
        context: mockContext,
      });

      const params = event.getParams(undefined as any);
      expect(params).toEqual({});
    });

    test("returns empty object when no routeKey in metadata", () => {
      const event = new NemoEvent({
        request: new Request("https://example.com/users/123") as any,
        sourcePage: "/users/[id]",
        context: mockContext,
      });

      const params = event.getParams({
        chain: "main",
        index: 0,
        pathname: "/users/123",
        routeKey: "/users",
        nestLevel: 0,
      });

      expect(params).toEqual({});
    });

    test("handles URL encoded parameters", () => {
      const event = new NemoEvent({
        request: new Request("https://example.com/search/some%20query") as any,
        sourcePage: "/search/[query]",
        context: mockContext,
      });

      const params = event.getParams({
        chain: "main",
        index: 0,
        pathname: "/search/some%20query",
        routeKey: "/search/:query",
        nestLevel: 0,
      });

      expect(params).toEqual({ query: "some query" });
    });

    test("uses current middleware metadata when no metadata is provided", () => {
      const event = new NemoEvent({
        request: new Request("https://example.com/users/123") as any,
        sourcePage: "/users/[id]",
        context: mockContext,
      });

      const metadata: MiddlewareMetadata = {
        chain: "main",
        index: 0,
        pathname: "/users/123",
        routeKey: "/users/:id",
        nestLevel: 0,
      };

      event.setCurrentMetadata(metadata);
      const params = event.getParams();

      expect(params).toEqual({ id: "123" });
    });

    test("provided metadata overrides current metadata", () => {
      const event = new NemoEvent({
        request: new Request("https://example.com/users/123") as any,
        sourcePage: "/users/[id]",
        context: mockContext,
      });

      // Set current metadata
      event.setCurrentMetadata({
        chain: "main",
        index: 0,
        pathname: "/users/123",
        routeKey: "/users/:id",
        nestLevel: 0,
      });

      // Provide different metadata
      const params = event.getParams({
        chain: "main",
        index: 1,
        pathname: "/users/456/posts/789",
        routeKey: "/users/:userId/posts/:postId",
        nestLevel: 0,
      });

      expect(params).toEqual({ userId: "456", postId: "789" });
    });

    test("current metadata updates with each middleware execution", () => {
      const event = new NemoEvent({
        request: new Request("https://example.com/users/123/posts/456") as any,
        sourcePage: "/users/[userId]/posts/[postId]",
        context: mockContext,
      });

      // Set first middleware metadata
      event.setCurrentMetadata({
        chain: "main",
        index: 0,
        pathname: "/users/123/posts/456",
        routeKey: "/users/:userId",
        nestLevel: 0,
      });

      const firstParams = event.getParams();
      expect(firstParams).not.toEqual({ userId: "123", postId: "456" });

      // Update with second middleware metadata
      event.setCurrentMetadata({
        chain: "main",
        index: 1,
        pathname: "/users/123/posts/456",
        routeKey: "/users/:userId/posts/:postId",
        nestLevel: 0,
      });

      const secondParams = event.getParams();
      expect(secondParams).toEqual({ userId: "123", postId: "456" });
    });
  });
});
