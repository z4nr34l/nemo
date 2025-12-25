/**
 * Tests for header forwarding in middlewares
 * 
 * Covers issue #170: Forwarded request headers in middlewares are missing in final forwarded request
 * https://github.com/z4nr34l/nemo/issues/170
 * 
 * Problem:
 * When a middleware returns NextResponse.next({ request: { headers } }), Next.js stores these
 * headers in the response as x-middleware-request-* headers. These headers need to be:
 * 1. Extracted from the response
 * 2. Applied to the request object for subsequent middlewares in the chain
 * 3. Included in the final response so they can be accessed in page.tsx via headers()
 * 
 * Current behavior (bug):
 * Headers from NextResponse.next({ request: { headers } }) are not being forwarded to
 * subsequent middlewares or included in the final response when the response is non-terminating
 * (i.e., not a rewrite, redirect, or JSON response).
 * 
 * Expected behavior:
 * Headers should be forwarded through the middleware chain and be available in:
 * - Subsequent middlewares (via request.headers)
 * - Final response (as x-middleware-request-* headers, which Next.js then makes available via headers())
 */

import { describe, expect, it } from "bun:test";
import { createNEMO, type GlobalMiddlewareConfig } from "../src";
import { NextRequest, NextResponse } from "next/server";
import { NemoEvent } from "../src/event";

describe("Header Forwarding in Middlewares", () => {
  const createMockRequest = (pathname: string = "/"): NextRequest => {
    return new NextRequest(new URL(`http://localhost:3000${pathname}`));
  };

  const createMockEvent = (): NemoEvent => {
    return new NemoEvent(new Event("fetch") as any);
  };

  describe("NextResponse.next() with request headers", () => {
    it("should forward headers from NextResponse.next({ request: { headers } }) in global before middleware", async () => {
      const addHeaderMiddleware = (request: NextRequest) => {
        const newHeaders = new Headers(request.headers);
        newHeaders.set("x-nemo-header", "hello world");
        return NextResponse.next({
          request: {
            headers: newHeaders,
          },
        });
      };

      const globalMiddlewares: GlobalMiddlewareConfig = {
        before: [addHeaderMiddleware],
      };

      const middleware = createNEMO({}, globalMiddlewares);
      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
      expect(result instanceof NextResponse).toBe(true);
      if (!result) return; // Type guard

      // When NextResponse.next({ request: { headers } }) is used,
      // Next.js stores these in x-middleware-request-* headers in the response
      // These headers should be extracted and made available in the final response
      // so they can be accessed in page.tsx via headers()
      const forwardedHeader = result.headers.get("x-middleware-request-x-nemo-header");
      expect(forwardedHeader).toBe("hello world");
    });

    it("should forward headers from NextResponse.next({ request: { headers } }) in route middleware", async () => {
      const middleware = createNEMO({
        "/": [
          async (request) => {
            const newHeaders = new Headers(request.headers);
            newHeaders.set("x-nemo-header", "hello world");
            return NextResponse.next({
              request: {
                headers: newHeaders,
              },
            });
          },
        ],
      });

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
      expect(result instanceof NextResponse).toBe(true);
      if (!result) return; // Type guard

      // Check that the header was forwarded
      const forwardedHeader = result.headers.get("x-middleware-request-x-nemo-header");
      expect(forwardedHeader).toBe("hello world");
    });

    it("should forward multiple headers from NextResponse.next({ request: { headers } })", async () => {
      const middleware = createNEMO({
        "/": [
          async (request) => {
            const newHeaders = new Headers(request.headers);
            newHeaders.set("x-nemo-header-1", "value1");
            newHeaders.set("x-nemo-header-2", "value2");
            newHeaders.set("x-nemo-header-3", "value3");
            return NextResponse.next({
              request: {
                headers: newHeaders,
              },
            });
          },
        ],
      });

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
      expect(result instanceof NextResponse).toBe(true);
      if (!result) return; // Type guard

      // Check that all headers were forwarded
      expect(result.headers.get("x-middleware-request-x-nemo-header-1")).toBe("value1");
      expect(result.headers.get("x-middleware-request-x-nemo-header-2")).toBe("value2");
      expect(result.headers.get("x-middleware-request-x-nemo-header-3")).toBe("value3");
    });

    it("should forward headers through middleware chain", async () => {
      const middleware = createNEMO({
        "/": [
          async (request) => {
            const newHeaders = new Headers(request.headers);
            newHeaders.set("x-first-middleware", "first");
            return NextResponse.next({
              request: {
                headers: newHeaders,
              },
            });
          },
          async (request) => {
            // The header from the first middleware should be available in the request
            // This is the core issue: headers from NextResponse.next({ request: { headers } })
            // should be forwarded to subsequent middlewares
            const firstHeader = request.headers.get("x-first-middleware");
            expect(firstHeader).toBe("first");

            const newHeaders = new Headers(request.headers);
            newHeaders.set("x-second-middleware", "second");
            return NextResponse.next({
              request: {
                headers: newHeaders,
              },
            });
          },
        ],
      });

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
      expect(result instanceof NextResponse).toBe(true);
      if (!result) return; // Type guard

      // Both headers should be forwarded in the final response
      expect(result.headers.get("x-middleware-request-x-first-middleware")).toBe("first");
      expect(result.headers.get("x-middleware-request-x-second-middleware")).toBe("second");
    });

    it("should forward headers from global before middleware to route middleware", async () => {
      const globalMiddlewares: GlobalMiddlewareConfig = {
        before: [
          async (request) => {
            const newHeaders = new Headers(request.headers);
            newHeaders.set("x-global-before", "global-before-value");
            return NextResponse.next({
              request: {
                headers: newHeaders,
              },
            });
          },
        ],
      };

      const middleware = createNEMO(
        {
          "/": [
            async (request) => {
              // This is the key issue: headers from global before middleware
              // that were set via NextResponse.next({ request: { headers } })
              // should be available in subsequent middlewares
              const globalHeader = request.headers.get("x-global-before");
              expect(globalHeader).toBe("global-before-value");

              const newHeaders = new Headers(request.headers);
              newHeaders.set("x-route-middleware", "route-value");
              return NextResponse.next({
                request: {
                  headers: newHeaders,
                },
              });
            },
          ],
        },
        globalMiddlewares,
      );

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
      expect(result instanceof NextResponse).toBe(true);
      if (!result) return; // Type guard

      // Both headers should be forwarded in the final response
      expect(result.headers.get("x-middleware-request-x-global-before")).toBe("global-before-value");
      expect(result.headers.get("x-middleware-request-x-route-middleware")).toBe("route-value");
    });

    it("should forward headers from global after middleware", async () => {
      const globalMiddlewares: GlobalMiddlewareConfig = {
        after: [
          async (request) => {
            const newHeaders = new Headers(request.headers);
            newHeaders.set("x-global-after", "global-after-value");
            return NextResponse.next({
              request: {
                headers: newHeaders,
              },
            });
          },
        ],
      };

      const middleware = createNEMO({}, globalMiddlewares);
      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
      expect(result instanceof NextResponse).toBe(true);
      if (!result) return; // Type guard

      // Header should be forwarded
      expect(result.headers.get("x-middleware-request-x-global-after")).toBe("global-after-value");
    });
  });

  describe("Header forwarding with different response types", () => {
    it("should forward headers when middleware returns NextResponse.next() (non-terminating)", async () => {
      const middleware = createNEMO({
        "/": [
          async (request) => {
            const newHeaders = new Headers(request.headers);
            newHeaders.set("x-nemo-header", "hello world");
            return NextResponse.next({
              request: {
                headers: newHeaders,
              },
            });
          },
        ],
      });

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
      expect(result instanceof NextResponse).toBe(true);
      if (!result) return; // Type guard
      expect(result.headers.has("x-middleware-request-x-nemo-header")).toBe(true);
    });

    it("should NOT forward headers when middleware returns rewrite (terminating)", async () => {
      const middleware = createNEMO({
        "/": [
          async (request) => {
            const newHeaders = new Headers(request.headers);
            newHeaders.set("x-nemo-header", "hello world");
            return NextResponse.rewrite(new URL("/rewritten", request.url), {
              request: {
                headers: newHeaders,
              },
            });
          },
        ],
      });

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
      expect(result instanceof NextResponse).toBe(true);
      if (!result) return; // Type guard
      // Rewrite responses are terminating, so headers forwarding works differently
      expect(result.headers.has("x-middleware-rewrite")).toBe(true);
    });

    it("should NOT forward headers when middleware returns redirect (terminating)", async () => {
      const middleware = createNEMO({
        "/": [
          async (request) => {
            const newHeaders = new Headers(request.headers);
            newHeaders.set("x-nemo-header", "hello world");
            // Redirect doesn't support request headers forwarding, use next() instead
            return NextResponse.redirect(new URL("/redirected", request.url));
          },
        ],
      });

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
      expect(result instanceof NextResponse).toBe(true);
      if (!result) return; // Type guard
      // Redirect responses are terminating
      expect(result.headers.has("Location")).toBe(true);
    });
  });

  describe("Reproduction of issue #170", () => {
    it("should reproduce the exact scenario from issue #170", async () => {
      // This is the exact scenario from the issue
      const addHeaderMiddleware = (request: NextRequest) => {
        const newHeaders = new Headers(request.headers);
        newHeaders.set("x-nemo-header", "hello world");
        return NextResponse.next({
          request: {
            headers: newHeaders,
          },
        });
      };

      const middlewares = {
        "/": [
          async (_request: NextRequest) => {
            // Empty middleware that just passes through
          },
        ],
      };

      const globalMiddlewares: GlobalMiddlewareConfig = {
        before: [addHeaderMiddleware],
      };

      const proxy = createNEMO(middlewares, globalMiddlewares);

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await proxy(request, event as any);

      expect(result).toBeDefined();
      expect(result instanceof NextResponse).toBe(true);
      if (!result) return; // Type guard

      // The header should be forwarded in x-middleware-request-* format
      // This is what Next.js does when you use NextResponse.next({ request: { headers } })
      const forwardedHeader = result.headers.get("x-middleware-request-x-nemo-header");
      expect(forwardedHeader).toBe("hello world");
    });

    it("should forward headers that can be accessed in page.tsx via headers()", async () => {
      // Simulating the scenario where headers need to be accessible in page.tsx
      const middleware = createNEMO({
        "/": [
          async (request) => {
            const newHeaders = new Headers(request.headers);
            newHeaders.set("x-nemo-header", "hello world");
            return NextResponse.next({
              request: {
                headers: newHeaders,
              },
            });
          },
        ],
      });

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
      expect(result instanceof NextResponse).toBe(true);
      if (!result) return; // Type guard

      // Headers should be forwarded so they can be accessed in page.tsx
      // Next.js stores them as x-middleware-request-* and then makes them available
      // via the headers() function in Server Components
      const forwardedHeader = result.headers.get("x-middleware-request-x-nemo-header");
      expect(forwardedHeader).toBe("hello world");
    });
  });

  describe("Header forwarding edge cases", () => {
    it("should handle empty headers object", async () => {
      const middleware = createNEMO({
        "/": [
          async (request) => {
            return NextResponse.next({
              request: {
                headers: new Headers(),
              },
            });
          },
        ],
      });

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
      expect(result instanceof NextResponse).toBe(true);
    });

    it("should preserve existing headers when adding new ones", async () => {
      const request = createMockRequest("/");
      request.headers.set("x-existing-header", "existing-value");

      const middleware = createNEMO({
        "/": [
          async (req) => {
            const newHeaders = new Headers(req.headers);
            newHeaders.set("x-new-header", "new-value");
            // Existing header should still be present
            expect(newHeaders.get("x-existing-header")).toBe("existing-value");
            return NextResponse.next({
              request: {
                headers: newHeaders,
              },
            });
          },
        ],
      });

      const event = createMockEvent();
      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
      expect(result instanceof NextResponse).toBe(true);
      if (!result) return; // Type guard

      // Both headers should be forwarded
      expect(result.headers.get("x-middleware-request-x-existing-header")).toBe("existing-value");
      expect(result.headers.get("x-middleware-request-x-new-header")).toBe("new-value");
    });

    it("should handle header overwrites in middleware chain", async () => {
      const middleware = createNEMO({
        "/": [
          async (request) => {
            const newHeaders = new Headers(request.headers);
            newHeaders.set("x-test-header", "first-value");
            return NextResponse.next({
              request: {
                headers: newHeaders,
              },
            });
          },
          async (request) => {
            const newHeaders = new Headers(request.headers);
            newHeaders.set("x-test-header", "second-value"); // Overwrite
            return NextResponse.next({
              request: {
                headers: newHeaders,
              },
            });
          },
        ],
      });

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
      expect(result instanceof NextResponse).toBe(true);
      if (!result) return; // Type guard

      // Last value should win
      expect(result.headers.get("x-middleware-request-x-test-header")).toBe("second-value");
    });
  });
});

