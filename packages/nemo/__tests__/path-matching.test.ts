import { describe, expect, mock, test } from "bun:test";
import type { NextFetchEvent } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { NEMO } from "../src";

describe("NEMO Path Matching", () => {
  const mockRequest = (path: string = "/") =>
    new NextRequest(`http://localhost${path}`);

  const mockEvent: NextFetchEvent = {
    waitUntil: mock(() => {}),
  } as never as NextFetchEvent;

  test("should handle invalid regex patterns gracefully", async () => {
    // Test error handling in matchesPath method
    // Use a pattern that would cause pathToRegexp to throw an error
    // For example, unbalanced parentheses or invalid regex syntax
    const invalidPattern = "/(test(/:id";
    const middleware = mock(() => NextResponse.next());

    // Access private methods for testing
    const nemo = new NEMO({ [invalidPattern]: middleware });

    // This should throw
    await expect(
      nemo.middleware(mockRequest("/test/123"), mockEvent),
    ).resolves.toThrow();

    // Middleware should not be called since pattern is invalid
    expect(middleware).not.toHaveBeenCalled();
  });

  test("should handle URL-encoded characters in paths", async () => {
    const middleware = mock(() => NextResponse.next());
    const nemo = new NEMO({ "/test/:name": middleware });

    await nemo.middleware(mockRequest("/test/john%20doe"), mockEvent);
    expect(middleware).toHaveBeenCalled();
  });

  test("should handle malformed URI components", async () => {
    const middleware = mock(() => NextResponse.next());
    const nemo = new NEMO({ "/user/:name": middleware });

    // Use a path with malformed percent encoding
    // This would normally cause decodeURIComponent to throw
    const badPath = "/user/bad%2-encoding";

    // This should throw
    await expect(
      nemo.middleware(new NextRequest(`http://localhost${badPath}`), mockEvent),
    ).resolves.toThrow();
  });

  test("should handle unicode path patterns correctly", async () => {
    const middleware = mock(() => NextResponse.next());
    // Use a pattern with unicode characters
    const nemo = new NEMO({ "/café/:item": middleware });

    await nemo.middleware(mockRequest("/café/croissant"), mockEvent);
    expect(middleware).toHaveBeenCalled();
  });

  test("should match parameters correctly", async () => {
    const middleware = mock((req, event) => {
      expect(event.params).toEqual({
        category: "electronics",
        id: "123",
      });
      return NextResponse.next();
    });

    const nemo = new NEMO({
      "/products/:category/:id": middleware,
    });

    await nemo.middleware(mockRequest("/products/electronics/123"), mockEvent);
    expect(middleware).toHaveBeenCalled();
  });

  test("should correctly exclude specific values in path segments", async () => {
    const middleware = mock(() => NextResponse.next());

    const nemo = new NEMO({
      "/:project/:env(dev|staging|prod)/:resource(!secrets)": middleware,
    });

    // Should match valid paths
    await nemo.middleware(mockRequest("/myproject/dev/config"), mockEvent);
    expect(middleware).toHaveBeenCalled();

    middleware.mockClear();

    await nemo.middleware(mockRequest("/myproject/prod/data"), mockEvent);
    expect(middleware).toHaveBeenCalled();

    middleware.mockClear();

    // Should not match excluded value
    await nemo.middleware(mockRequest("/myproject/staging/secrets"), mockEvent);
    expect(middleware).not.toHaveBeenCalled();
  });
});
