/**
 * Tests for skipping remaining middlewares in the chain
 * Covers discussion #159: https://github.com/z4nr34l/nemo/discussions/159
 * 
 * Feature: Allow middleware to skip the rest of the middleware chain
 * without returning a terminating response (like redirect/rewrite)
 */

import { describe, expect, it } from "bun:test";
import { createNEMO, type GlobalMiddlewareConfig } from "../src";
import { NextRequest, NextResponse } from "next/server";
import { NemoEvent } from "../src/event";

describe("Skip Middleware Chain", () => {
  const createMockRequest = (pathname: string = "/"): NextRequest => {
    return new NextRequest(new URL(`http://localhost:3000${pathname}`));
  };

  const createMockEvent = (): NemoEvent => {
    return new NemoEvent(new Event("fetch") as any);
  };

  describe("event.skip() method", () => {
    it("should skip remaining middlewares in route middleware chain", async () => {
      const executionOrder: string[] = [];

      const middleware = createNEMO({
        "/": [
          async (request, event) => {
            executionOrder.push("first");
            event.skip();
          },
          async (request, event) => {
            executionOrder.push("second"); // Should not execute
          },
          async (request, event) => {
            executionOrder.push("third"); // Should not execute
          },
        ],
      });

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["first"]);
      expect(result).toBeDefined();
      expect(result instanceof NextResponse).toBe(true);
    });

    it("should skip remaining middlewares after event.skip() is called", async () => {
      const executionOrder: string[] = [];

      const middleware = createNEMO({
        "/api": [
          async (request, event) => {
            executionOrder.push("middleware-1");
            // Do some work
            request.headers.set("x-processed", "true");
          },
          async (request, event) => {
            executionOrder.push("middleware-2");
            event.skip(); // Skip remaining middlewares
          },
          async (request, event) => {
            executionOrder.push("middleware-3"); // Should not execute
          },
          async (request, event) => {
            executionOrder.push("middleware-4"); // Should not execute
          },
        ],
      });

      const request = createMockRequest("/api");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["middleware-1", "middleware-2"]);
      expect(result).toBeDefined();
    });

    it("should skip remaining middlewares in global before chain", async () => {
      const executionOrder: string[] = [];

      const globalMiddlewares: GlobalMiddlewareConfig = {
        before: [
          async (request, event) => {
            executionOrder.push("before-1");
            event.skip();
          },
          async (request, event) => {
            executionOrder.push("before-2"); // Should not execute
          },
        ],
      };

      const middleware = createNEMO(
        {
          "/": [
            async (request, event) => {
              executionOrder.push("main-1");
            },
          ],
        },
        globalMiddlewares,
      );

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["before-1", "main-1"]);
      expect(result).toBeDefined();
    });

    it("should skip remaining middlewares in global after chain", async () => {
      const executionOrder: string[] = [];

      const globalMiddlewares: GlobalMiddlewareConfig = {
        after: [
          async (request, event) => {
            executionOrder.push("after-1");
            event.skip();
          },
          async (request, event) => {
            executionOrder.push("after-2"); // Should not execute
          },
        ],
      };

      const middleware = createNEMO({}, globalMiddlewares);

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["after-1"]);
      expect(result).toBeDefined();
    });

    it("should skip remaining middlewares but continue with after chain", async () => {
      const executionOrder: string[] = [];

      const globalMiddlewares: GlobalMiddlewareConfig = {
        after: [
          async (request, event) => {
            executionOrder.push("after-1");
          },
        ],
      };

      const middleware = createNEMO(
        {
          "/": [
            async (request, event) => {
              executionOrder.push("main-1");
              event.skip(); // Skip remaining main middlewares
            },
            async (request, event) => {
              executionOrder.push("main-2"); // Should not execute
            },
          ],
        },
        globalMiddlewares,
      );

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      // After chain should still execute
      expect(executionOrder).toEqual(["main-1", "after-1"]);
      expect(result).toBeDefined();
    });

    it("should skip remaining middlewares in nested routes", async () => {
      const executionOrder: string[] = [];

      const middleware = createNEMO({
        "/admin": {
          middleware: async (request, event) => {
            executionOrder.push("admin-parent");
          },
          "/users": [
            async (request, event) => {
              executionOrder.push("admin-users-1");
              event.skip();
            },
            async (request, event) => {
              executionOrder.push("admin-users-2"); // Should not execute
            },
          ],
        },
      });

      const request = createMockRequest("/admin/users");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["admin-parent", "admin-users-1"]);
      expect(result).toBeDefined();
    });

    it("should allow returning response after calling event.skip()", async () => {
      const executionOrder: string[] = [];

      const middleware = createNEMO({
        "/": [
          async (request, event) => {
            executionOrder.push("first");
            event.skip();
            // Can still return a response
            return NextResponse.next({
              headers: { "x-skipped": "true" },
            });
          },
          async (request, event) => {
            executionOrder.push("second"); // Should not execute
          },
        ],
      });

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["first"]);
      expect(result).toBeDefined();
      expect(result instanceof NextResponse).toBe(true);
      expect(result.headers.get("x-skipped")).toBe("true");
    });

    it("should not skip if event.skip() is not called", async () => {
      const executionOrder: string[] = [];

      const middleware = createNEMO({
        "/": [
          async (request, event) => {
            executionOrder.push("first");
            // Don't call event.skip()
          },
          async (request, event) => {
            executionOrder.push("second"); // Should execute
          },
          async (request, event) => {
            executionOrder.push("third"); // Should execute
          },
        ],
      });

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["first", "second", "third"]);
      expect(result).toBeDefined();
    });

    it("should skip remaining middlewares but preserve headers from previous middlewares", async () => {
      const middleware = createNEMO({
        "/": [
          async (request, event) => {
            request.headers.set("x-header-1", "value-1");
          },
          async (request, event) => {
            request.headers.set("x-header-2", "value-2");
            event.skip();
          },
          async (request, event) => {
            request.headers.set("x-header-3", "value-3"); // Should not execute
          },
        ],
      });

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
      // Headers from executed middlewares should be preserved
      expect(request.headers.get("x-header-1")).toBe("value-1");
      expect(request.headers.get("x-header-2")).toBe("value-2");
      expect(request.headers.get("x-header-3")).toBeNull();
    });

    it("should skip remaining middlewares when called in conditional logic", async () => {
      const executionOrder: string[] = [];

      const middleware = createNEMO({
        "/": [
          async (request, event) => {
            executionOrder.push("first");
            const shouldSkip = true;
            if (shouldSkip) {
              event.skip();
            }
          },
          async (request, event) => {
            executionOrder.push("second"); // Should not execute
          },
        ],
      });

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["first"]);
      expect(result).toBeDefined();
    });

    it("should work with terminating responses (redirect/rewrite still break chain)", async () => {
      const executionOrder: string[] = [];

      const middleware = createNEMO({
        "/": [
          async (request, event) => {
            executionOrder.push("first");
            event.skip(); // Skip is called but...
            return NextResponse.redirect("https://example.com"); // Redirect still breaks chain
          },
          async (request, event) => {
            executionOrder.push("second"); // Should not execute (redirect breaks chain)
          },
        ],
      });

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["first"]);
      expect(result).toBeDefined();
      expect(result instanceof NextResponse).toBe(true);
      expect(result.headers.get("Location")).toBe("https://example.com/");
    });
  });

  describe("Integration with existing chain breaking", () => {
    it("should respect skip() even when middleware returns NextResponse.next()", async () => {
      const executionOrder: string[] = [];

      const middleware = createNEMO({
        "/": [
          async (request, event) => {
            executionOrder.push("first");
            event.skip();
            return NextResponse.next(); // next() normally continues, but skip() prevents it
          },
          async (request, event) => {
            executionOrder.push("second"); // Should not execute
          },
        ],
      });

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["first"]);
      expect(result).toBeDefined();
    });

    it("should work correctly with multiple skip() calls (idempotent)", async () => {
      const executionOrder: string[] = [];

      const middleware = createNEMO({
        "/": [
          async (request, event) => {
            executionOrder.push("first");
            event.skip();
            event.skip(); // Calling multiple times should be safe
            event.skip();
          },
          async (request, event) => {
            executionOrder.push("second"); // Should not execute
          },
        ],
      });

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["first"]);
      expect(result).toBeDefined();
    });
  });

  describe("event.skip() with skipAfter option", () => {
    it("should skip after chain when skipAfter option is true from before chain", async () => {
      const executionOrder: string[] = [];

      const globalMiddlewares: GlobalMiddlewareConfig = {
        before: [
          async (request, event) => {
            executionOrder.push("before-1");
            event.skip({ skipAfter: true }); // Skip after chain
          },
        ],
        after: [
          async (request, event) => {
            executionOrder.push("after-1"); // Should not execute
          },
          async (request, event) => {
            executionOrder.push("after-2"); // Should not execute
          },
        ],
      };

      const middleware = createNEMO(
        {
          "/": [
            async (request, event) => {
              executionOrder.push("main-1");
            },
          ],
        },
        globalMiddlewares,
      );

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["before-1", "main-1"]);
      expect(result).toBeDefined();
    });

    it("should skip after chain when skipAfter option is true from main chain", async () => {
      const executionOrder: string[] = [];

      const globalMiddlewares: GlobalMiddlewareConfig = {
        after: [
          async (request, event) => {
            executionOrder.push("after-1"); // Should not execute
          },
          async (request, event) => {
            executionOrder.push("after-2"); // Should not execute
          },
        ],
      };

      const middleware = createNEMO(
        {
          "/": [
            async (request, event) => {
              executionOrder.push("main-1");
              event.skip({ skipAfter: true }); // Skip remaining main and after chain
            },
            async (request, event) => {
              executionOrder.push("main-2"); // Should not execute
            },
          ],
        },
        globalMiddlewares,
      );

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["main-1"]);
      expect(result).toBeDefined();
    });

    it("should skip after chain when skipAfter option is true from after chain itself", async () => {
      const executionOrder: string[] = [];

      const globalMiddlewares: GlobalMiddlewareConfig = {
        after: [
          async (request, event) => {
            executionOrder.push("after-1");
            event.skip({ skipAfter: true }); // Skip remaining after middlewares
          },
          async (request, event) => {
            executionOrder.push("after-2"); // Should not execute
          },
          async (request, event) => {
            executionOrder.push("after-3"); // Should not execute
          },
        ],
      };

      const middleware = createNEMO({}, globalMiddlewares);

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["after-1"]);
      expect(result).toBeDefined();
    });

    it("should skip both current chain and after chain when skipAfter is true", async () => {
      const executionOrder: string[] = [];

      const globalMiddlewares: GlobalMiddlewareConfig = {
        after: [
          async (request, event) => {
            executionOrder.push("after-1"); // Should not execute
          },
        ],
      };

      const middleware = createNEMO(
        {
          "/": [
            async (request, event) => {
              executionOrder.push("main-1");
              event.skip({ skipAfter: true }); // Skip remaining main and after chain
            },
            async (request, event) => {
              executionOrder.push("main-2"); // Should not execute
            },
          ],
        },
        globalMiddlewares,
      );

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["main-1"]);
      expect(result).toBeDefined();
    });

    it("should work correctly with multiple skip() calls with skipAfter (idempotent)", async () => {
      const executionOrder: string[] = [];

      const globalMiddlewares: GlobalMiddlewareConfig = {
        after: [
          async (request, event) => {
            executionOrder.push("after-1"); // Should not execute
          },
        ],
      };

      const middleware = createNEMO(
        {
          "/": [
            async (request, event) => {
              executionOrder.push("main-1");
              event.skip({ skipAfter: true });
              event.skip({ skipAfter: true }); // Calling multiple times should be safe
              event.skip({ skipAfter: true });
            },
          ],
        },
        globalMiddlewares,
      );

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["main-1"]);
      expect(result).toBeDefined();
    });

    it("should skip after chain in nested routes", async () => {
      const executionOrder: string[] = [];

      const globalMiddlewares: GlobalMiddlewareConfig = {
        after: [
          async (request, event) => {
            executionOrder.push("after-1"); // Should not execute
          },
        ],
      };

      const middleware = createNEMO(
        {
          "/admin": {
            middleware: async (request, event) => {
              executionOrder.push("admin-parent");
            },
            "/users": [
              async (request, event) => {
                executionOrder.push("admin-users-1");
                event.skip({ skipAfter: true }); // Skip after chain
              },
            ],
          },
        },
        globalMiddlewares,
      );

      const request = createMockRequest("/admin/users");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["admin-parent", "admin-users-1"]);
      expect(result).toBeDefined();
    });

    it("should not skip after chain if skipAfter option is not provided", async () => {
      const executionOrder: string[] = [];

      const globalMiddlewares: GlobalMiddlewareConfig = {
        after: [
          async (request, event) => {
            executionOrder.push("after-1"); // Should execute
          },
        ],
      };

      const middleware = createNEMO(
        {
          "/": [
            async (request, event) => {
              executionOrder.push("main-1");
              event.skip(); // Skip remaining main, but not after
            },
            async (request, event) => {
              executionOrder.push("main-2"); // Should not execute
            },
          ],
        },
        globalMiddlewares,
      );

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["main-1", "after-1"]);
      expect(result).toBeDefined();
    });

    it("should allow skip() without options and then skip() with skipAfter", async () => {
      const executionOrder: string[] = [];

      const globalMiddlewares: GlobalMiddlewareConfig = {
        after: [
          async (request, event) => {
            executionOrder.push("after-1"); // Should not execute
          },
        ],
      };

      const middleware = createNEMO(
        {
          "/": [
            async (request, event) => {
              executionOrder.push("main-1");
              event.skip(); // Skip remaining main
            },
            async (request, event) => {
              executionOrder.push("main-2"); // Should not execute
              event.skip({ skipAfter: true }); // This won't execute, but test that it's safe
            },
          ],
        },
        globalMiddlewares,
      );

      const request = createMockRequest("/");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(executionOrder).toEqual(["main-1", "after-1"]);
      expect(result).toBeDefined();
    });
  });
});

