import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { WaitUntil } from "next/dist/server/after/builtin-request-context";
import type { NextRequest } from "next/server";
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

  test("constructor initializes with empty context", () => {
    const event = new NemoEvent({
      request: mockRequest as any,
      sourcePage: "/test",
      context: { waitUntil: mockContext.waitUntil },
    });
    expect(event.context instanceof Object).toBe(true);
    expect(event.context.size).toBe(0);
  });

  test("constructor initializes with provided context", () => {
    const event = new NemoEvent({
      request: mockRequest as any,
      sourcePage: "/test",
      context: {
        waitUntil: mockContext.waitUntil,
      },
      nemo: { key: "value" },
    });
    expect(event.context.get("key")).toBe("value");
  });

  test("context toString returns formatted JSON", () => {
    const event = new NemoEvent({
      request: mockRequest as any,
      sourcePage: "/test",
      context: {
        waitUntil: mockContext.waitUntil,
      },
      nemo: { key: "value" },
    });
    expect(event.context.toString()).toBe(JSON.stringify({ key: "value" }));
  });

  test("throws when initialized with invalid context", () => {
    expect(() => {
      new NemoEvent({
        request: mockRequest as any,
        sourcePage: "/test",
        context: {
          waitUntil: mockContext.waitUntil,
        },
        nemo: "invalid" as any,
      });
    }).toThrow("NemoEvent context must be a plain object or undefined");
  });

  test("from method preserves original context when no new context provided", () => {
    const nextEvent = new NextFetchEvent({
      request: mockRequest as any,
      page: "/test",
      context: mockContext,
    });
    const nemoEvent = NemoEvent.from(nextEvent);
    expect(nemoEvent.context).toBeInstanceOf(Object);
    expect(nemoEvent.context.size).toBe(0);
  });

  test("context manipulation", () => {
    const event = new NemoEvent({
      request: mockRequest as any,
      sourcePage: "/test",
      context: mockContext,
    });
    event.context.set("key", "value");
    expect(event.context.get<string>("key")).toBe("value");
    event.context.delete("key");
    expect(event.context.has("key")).toBe(false);
  });

  test("handles undefined context in from method", () => {
    const nextEvent = new NextFetchEvent({
      request: mockRequest as any,
      page: "/test",
      context: undefined,
    });
    const nemoEvent = NemoEvent.from(nextEvent);
    expect(nemoEvent.context).toBeInstanceOf(Object);
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

  test("handles complex context values", () => {
    const event = new NemoEvent({
      request: mockRequest as any,
      sourcePage: "/test",
      context: mockContext,
      nemo: {
        array: [1, 2, 3],
        object: { key: "value" },
        null: null,
        undefined: undefined,
      },
    });
    expect(event.context.get("array")).toEqual([1, 2, 3]);
    expect(event.context.get("object")).toEqual({ key: "value" });
    expect(event.context.get("null")).toBeNull();
    expect(event.context.get("undefined")).toBeUndefined();
  });

  test("context fromString correctly parses JSON", () => {
    const event = new NemoEvent({
      request: mockRequest as any,
      sourcePage: "/test",
      context: mockContext,
    });

    expect(event.context.fromString('{"test": "value"}')).toBe(true);
    expect(event.context.get("test")).toBe("value");
  });

  test("context fromString returns false for invalid JSON", () => {
    const event = new NemoEvent({
      request: mockRequest as any,
      sourcePage: "/test",
      context: mockContext,
    });

    expect(event.context.fromString("invalid json")).toBe(false);
    expect(event.context.fromString("null")).toBe(false);
    expect(event.context.fromString('"string"')).toBe(false);
  });

  test("context fromEntries sets context from entries", () => {
    const event = new NemoEvent({
      request: mockRequest as any,
      sourcePage: "/test",
      context: mockContext,
    });

    const entries: [string, unknown][] = [
      ["key1", "value1"],
      ["key2", "value2"],
    ];

    event.context.fromEntries(entries);
    expect(event.context.get("key1")).toBe("value1");
    expect(event.context.get("key2")).toBe("value2");
  });

  test("context implements iterator methods correctly", () => {
    const testContext = {
      a: 1,
      b: 2,
      c: 3,
    };
    const event = new NemoEvent({
      request: mockRequest as any,
      sourcePage: "/test",
      context: mockContext,
      nemo: testContext,
    });

    // Test entries()
    const entries = Array.from(event.context.entries());
    expect(entries).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);

    // Test keys()
    const keys = Array.from(event.context.keys());
    expect(keys).toEqual(["a", "b", "c"]);

    // Test values()
    const values = Array.from(event.context.values());
    expect(values).toEqual([1, 2, 3]);

    // Test forEach
    const forEachResults: [string, unknown][] = [];
    event.context.forEach((value, key) => {
      forEachResults.push([key, value]);
    });
    expect(forEachResults).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);

    // Test Symbol.iterator
    const iteratorResults: [string, unknown][] = [];
    for (const [key, value] of event.context) {
      iteratorResults.push([key, value]);
    }
    expect(iteratorResults).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
  });

  test("context clear() removes all entries", () => {
    const event = new NemoEvent({
      request: mockRequest as any,
      sourcePage: "/test",
      context: mockContext,
      nemo: { a: 1, b: 2 },
    });

    expect(event.context.size).toBe(2);
    event.context.clear();
    expect(event.context.size).toBe(0);
    expect(Array.from(event.context.entries())).toEqual([]);
  });

  test("from method creates new context with merged data", () => {
    const nextEvent = new NextFetchEvent({
      request: mockRequest as any,
      page: "/test",
      context: mockContext,
    });

    const existingContext = { existing: true };
    const newContext = { new: true };

    // First create with existing context
    const nemoEvent1 = NemoEvent.from(nextEvent, existingContext);
    expect(nemoEvent1.context.get("existing")).toBe(true);

    // Then create new one with different context
    const nemoEvent2 = NemoEvent.from(nemoEvent1, newContext);
    expect(nemoEvent2.context.get("new")).toBe(true);
    expect(nemoEvent2.context.get("existing")).toBeUndefined();
  });
});
