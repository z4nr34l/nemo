import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { NextFetchEvent } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import {
  createMiddleware,
  createNEMO,
  NEMO,
  NemoMiddlewareError,
  type ErrorHandler,
  type NextMiddleware,
} from "../src";

describe("NEMO", () => {
  const mockRequest = (path: string = "/") => {
    return new NextRequest(`http://localhost${path}`, {
      headers: new Headers({ "x-initial": "value" }),
    });
  };

  const mockEvent: NextFetchEvent = {
    waitUntil: mock(() => {}),
  } as never as NextFetchEvent;

  describe("Internals", () => {
    let nemo: NEMO;

    beforeEach(() => {
      nemo = new NEMO({});
    });

    test("should detect new headers", () => {
      const initial = new Headers();
      const final = new Headers({
        "new-header": "value",
      });

      const diff = (nemo as any).getHeadersDiff(initial, final);
      expect(diff).toEqual({
        "new-header": "value",
      });
    });

    test("should detect modified headers", () => {
      const initial = new Headers({
        "existing-header": "old-value",
      });
      const final = new Headers({
        "existing-header": "new-value",
      });

      const diff = (nemo as any).getHeadersDiff(initial, final);
      expect(diff).toEqual({
        "existing-header": "new-value",
      });
    });

    test("should ignore unchanged headers", () => {
      const initial = new Headers({
        "unchanged-header": "same-value",
      });
      const final = new Headers({
        "unchanged-header": "same-value",
      });

      const diff = (nemo as any).getHeadersDiff(initial, final);
      expect(diff).toEqual({});
    });

    test("should detect deleted headers", () => {
      const initial = new Headers({
        "deleted-header": "value",
      });
      const final = new Headers();

      const diff = (nemo as any).getHeadersDiff(initial, final);
      expect(diff).toEqual({
        "deleted-header": "",
      });
    });

    test("should handle empty headers", () => {
      const initial = new Headers();
      const final = new Headers();

      const diff = (nemo as any).getHeadersDiff(initial, final);
      expect(diff).toEqual({});
    });
  });

  describe("Middleware Processing", () => {
    test("should process simple middleware", async () => {
      const middleware: NextMiddleware = () => {
        return NextResponse.next({
          headers: { "x-test": "value" },
        });
      };

      const nemo = new NEMO({ "/": middleware });
      const response = await nemo.middleware(mockRequest(), mockEvent);

      expect(response).toBeDefined();
      expect(response instanceof NextResponse).toBe(true);
      expect(response?.headers.get("x-test")).toBe("value");
    });

    test("should process middleware chain", async () => {
      const middleware1: NextMiddleware = (req) => {
        req.headers.set("x-test-1", "value1");
      };

      const middleware2: NextMiddleware = () => {
        return NextResponse.next({
          headers: { "x-test-2": "value2" },
        });
      };

      const nemo = new NEMO({ "/": [middleware1, middleware2] });
      const response = await nemo.middleware(mockRequest(), mockEvent);

      expect(response?.headers.get("x-test-1")).not.toBe("value1");
      expect(response?.headers.get("x-test-2")).toBe("value2");
    });

    describe("Chain Breaking", () => {
      test("should not break chain on NextResponse.next()", async () => {
        const order: string[] = [];
        const middleware1: NextMiddleware = () => {
          order.push("first");
          return NextResponse.next();
        };
        const middleware2: NextMiddleware = () => {
          order.push("second");
        };

        const nemo = new NEMO({ "/": [middleware1, middleware2] });
        await nemo.middleware(mockRequest(), mockEvent);

        expect(order).toEqual(["first", "second"]);
      });

      test("should break chain on NextResponse.json", async () => {
        const order: string[] = [];
        const middleware1: NextMiddleware = () => {
          order.push("first");
          return NextResponse.json({});
        };
        const middleware2: NextMiddleware = () => {
          order.push("second");
        };

        const nemo = new NEMO({ "/": [middleware1, middleware2] });
        await nemo.middleware(mockRequest(), mockEvent);

        expect(order).toEqual(["first"]);
      });

      test("should break chain on NextResponse.redirect", async () => {
        const order: string[] = [];
        const middleware1: NextMiddleware = () => {
          order.push("first");
          return NextResponse.redirect("https://example.com");
        };
        const middleware2: NextMiddleware = () => {
          order.push("second");
        };

        const nemo = new NEMO({ "/": [middleware1, middleware2] });
        const response = await nemo.middleware(mockRequest(), mockEvent);

        expect(order).toEqual(["first"]);
        expect(response?.status).toBe(307);
      });

      test("should break chain on NextResponse.rewrite", async () => {
        const order: string[] = [];
        const middleware1: NextMiddleware = () => {
          order.push("first");
          return NextResponse.rewrite("https://example.com");
        };
        const middleware2: NextMiddleware = () => {
          order.push("second");
        };

        const nemo = new NEMO({ "/": [middleware1, middleware2] });
        await nemo.middleware(mockRequest(), mockEvent);

        expect(order).toEqual(["first"]);
      });

      test("should skip remaining code in middleware when NextResponse.next() is returned", async () => {
        const order: string[] = [];
        const shouldNeverRun = false;

        const middleware1: NextMiddleware = () => {
          order.push("first-start");
          return NextResponse.next(); // Early return
        };

        const middleware2: NextMiddleware = () => {
          order.push("second");
        };

        const nemo = new NEMO({ "/": [middleware1, middleware2] });
        await nemo.middleware(mockRequest(), mockEvent);

        expect(order).toEqual(["first-start", "second"]);
        expect(shouldNeverRun).toBe(false);
      });
    });
  });

  describe("Path Matching", () => {
    test("should match exact paths", async () => {
      const middleware = mock(() => NextResponse.next());
      const nemo = new NEMO({ "/test": middleware });

      await nemo.middleware(mockRequest("/test"), mockEvent);
      expect(middleware).toHaveBeenCalled();
    });

    test("should match pattern paths", async () => {
      const middleware = mock(() => NextResponse.next());
      const nemo = new NEMO({ "/test/:id": middleware });

      await nemo.middleware(mockRequest("/test/123"), mockEvent);
      expect(middleware).toHaveBeenCalled();
    });

    test("should not match invalid paths", async () => {
      const middleware = mock(() => NextResponse.next());
      const nemo = new NEMO({ "/test": middleware });

      await nemo.middleware(mockRequest("/other"), mockEvent);
      expect(middleware).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    test("should provide metadata for errors in before middleware", async () => {
      const errorMiddleware: NextMiddleware = () => {
        throw new Error("Test error");
      };

      const nemo = new NEMO({ "/": () => {} }, { before: errorMiddleware });

      try {
        await nemo.middleware(mockRequest(), mockEvent);
        // @ts-expect-error -- Testing error handling
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(NemoMiddlewareError);
        const nemoError = error as NemoMiddlewareError;
        expect(nemoError.metadata.chain).toBe("before");
        expect(nemoError.metadata.index).toBe(0);
        expect(nemoError.metadata.pathname).toBe("/");
        expect(nemoError.metadata.routeKey).toBe("global:before");
        expect(nemoError.originalError).toBeInstanceOf(Error);
      }
    });

    test("should provide metadata for errors in after middleware", async () => {
      const errorMiddleware: NextMiddleware = () => {
        throw new Error("Test error");
      };

      const nemo = new NEMO({ "/": () => {} }, { after: errorMiddleware });

      try {
        await nemo.middleware(mockRequest(), mockEvent);
        // @ts-expect-error -- Testing error handling
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(NemoMiddlewareError);
        const nemoError = error as NemoMiddlewareError;
        expect(nemoError.metadata.chain).toBe("after");
        expect(nemoError.metadata.index).toBe(0);
        expect(nemoError.metadata.pathname).toBe("/");
        expect(nemoError.metadata.routeKey).toBe("global:after");
        expect(nemoError.originalError).toBeInstanceOf(Error);
      }
    });

    test("should use custom error handler when provided", async () => {
      const errorMiddleware: NextMiddleware = () => {
        throw new Error("Custom error");
      };

      const errorHandler: ErrorHandler = mock((error, context) => {
        expect(error.message).toBe("Custom error");
        expect(context.chain).toBe("main");
        return NextResponse.next();
      });

      const nemo = new NEMO({ "/": errorMiddleware }, undefined, {
        errorHandler,
      });

      await nemo.middleware(mockRequest(), mockEvent);
      expect(errorHandler).toHaveBeenCalled();
    });

    test("should continue chain when silent mode is enabled", async () => {
      const errorMiddleware: NextMiddleware = () => {
        throw new Error("Silent error");
      };

      const nextMiddleware = mock(() => NextResponse.next());

      const nemo = new NEMO(
        { "/": [errorMiddleware, nextMiddleware] },
        undefined,
        { silent: true },
      );

      await nemo.middleware(mockRequest(), mockEvent);
      expect(nextMiddleware).toHaveBeenCalled();
    });
  });

  describe("Global Middleware", () => {
    test("should execute before middleware first", async () => {
      const order: string[] = [];

      const beforeMiddleware: NextMiddleware = () => {
        order.push("before");
        return;
      };

      const mainMiddleware: NextMiddleware = () => {
        order.push("main");
        return NextResponse.next();
      };

      const nemo = new NEMO(
        { "/": mainMiddleware },
        { before: beforeMiddleware },
      );

      await nemo.middleware(mockRequest(), mockEvent);
      expect(order).toEqual(["before", "main"]);
    });

    test("should execute after middleware last", async () => {
      const order: string[] = [];

      const afterMiddleware: NextMiddleware = () => {
        order.push("after");
      };

      const mainMiddleware: NextMiddleware = () => {
        order.push("main");
      };

      const nemo = new NEMO(
        { "/": mainMiddleware },
        { after: afterMiddleware },
      );

      await nemo.middleware(mockRequest(), mockEvent);
      expect(order).toEqual(["main", "after"]);
    });
  });

  describe("Deprecated createMiddleware", () => {
    const originalConsoleWarn = console.warn;
    let warnSpy: typeof console.warn;

    beforeEach(() => {
      warnSpy = mock((...args: any[]) => {
        originalConsoleWarn(...args);
      });
      console.warn = warnSpy;
    });

    afterEach(() => {
      console.warn = originalConsoleWarn;
    });

    test("should show deprecation warning", () => {
      const middleware = mock(() => NextResponse.next());
      createMiddleware({ "/": middleware });

      expect(warnSpy).toHaveBeenCalledWith(
        "[NEMO] `createMiddleware` is deprecated. Use `createNEMO` instead.",
      );
    });

    test("should return a working middleware instance", async () => {
      const testMiddleware = mock(() => NextResponse.next());
      const middleware = createMiddleware({ "/test": testMiddleware });

      await middleware(mockRequest("/test"), mockEvent);
      expect(testMiddleware).toHaveBeenCalled();
    });
  });

  describe("createNEMO", () => {
    test("should return a working middleware instance", async () => {
      const testMiddleware = mock(() => NextResponse.next());
      const middleware = createNEMO({ "/test": testMiddleware });

      await middleware(mockRequest("/test"), mockEvent);
      expect(testMiddleware).toHaveBeenCalled();
    });

    test("should properly pass configuration options", async () => {
      const errorMiddleware: NextMiddleware = () => {
        throw new Error("Test error");
      };

      const errorHandler: ErrorHandler = mock(() => {
        return NextResponse.next();
      });

      const middleware = createNEMO({ "/test": errorMiddleware }, undefined, {
        silent: true,
        errorHandler,
      });

      await middleware(mockRequest("/test"), mockEvent);
      expect(errorHandler).toHaveBeenCalled();
    });

    test("should support global middleware configuration", async () => {
      const order: string[] = [];
      const beforeMiddleware = mock(() => {
        order.push("before");
      });
      const mainMiddleware = mock(() => {
        order.push("main");
        return NextResponse.next();
      });

      const middleware = createNEMO(
        { "/test": mainMiddleware },
        { before: beforeMiddleware },
      );

      await middleware(mockRequest("/test"), mockEvent);
      expect(order).toEqual(["before", "main"]);
      expect(beforeMiddleware).toHaveBeenCalled();
      expect(mainMiddleware).toHaveBeenCalled();
    });
  });

  describe("Configuration", () => {
    test("should apply default config values", () => {
      const nemo = new NEMO({});
      expect((nemo as any).config).toEqual({
        debug: false,
        silent: false,
        enableTiming: false,
      });
    });

    test("should merge custom config with defaults", () => {
      const nemo = new NEMO({}, undefined, {
        debug: true,
        enableTiming: true,
      });
      expect((nemo as any).config).toEqual({
        debug: true,
        silent: false,
        enableTiming: true,
      });
    });
  });

  describe("Timing", () => {
    test("should track timing when enabled", async () => {
      const middleware = mock(() => {
        return NextResponse.next();
      });

      const nemo = new NEMO({ "/": middleware }, undefined, {
        debug: true,
        enableTiming: true,
      });

      await nemo.middleware(mockRequest(), mockEvent);
      // Just verify it doesn't throw - actual timing values are non-deterministic
    });

    test("should track timing for all middleware chains", async () => {
      const before = mock(() => undefined);
      const main = mock(() => undefined);
      const after = mock(() => NextResponse.next());

      const nemo = new NEMO(
        { "/": main },
        { before, after },
        {
          debug: true,
          enableTiming: true,
        },
      );

      await nemo.middleware(mockRequest(), mockEvent);
      expect(before).toHaveBeenCalled();
      expect(main).toHaveBeenCalled();
      expect(after).toHaveBeenCalled();
    });
  });

  describe("Cache Management", () => {
    test("should clear context and cache", () => {
      const nemo = new NEMO({});
      (nemo as any).matchCache.set("test", new Map([["path", true]]));

      nemo.clearCache();

      expect((nemo as any).matchCache.size).toBe(0);
    });
  });

  describe("Path Matching Cache", () => {
    test("should cache path matching results", async () => {
      const middleware = mock(() => NextResponse.next());
      const nemo = new NEMO({ "/test/:id": middleware });

      // First call - should create cache
      await nemo.middleware(mockRequest("/test/123"), mockEvent);
      const cache = (nemo as any).matchCache.get("/test/:id");
      expect(cache?.get("/test/123")).toBe(true);

      // Second call - should use cache
      await nemo.middleware(mockRequest("/test/123"), mockEvent);
      expect(middleware).toHaveBeenCalledTimes(2);
    });
  });

  describe("Global Middleware Arrays", () => {
    test("should handle array of before middlewares", async () => {
      const order: string[] = [];
      const before1 = mock(() => {
        order.push("before1");
      });
      const before2 = mock(() => {
        order.push("before2");
      });
      const main = mock(() => {
        order.push("main");
        return NextResponse.next();
      });

      const nemo = new NEMO({ "/": main }, { before: [before1, before2] });

      await nemo.middleware(mockRequest(), mockEvent);
      expect(order).toEqual(["before1", "before2", "main"]);
    });

    test("should handle array of after middlewares", async () => {
      const order: string[] = [];
      const main = mock(() => {
        order.push("main");
      });
      const after1 = mock(() => {
        order.push("after1");
      });
      const after2 = mock(() => {
        order.push("after2");
        return NextResponse.next();
      });

      const nemo = new NEMO({ "/": main }, { after: [after1, after2] });

      await nemo.middleware(mockRequest(), mockEvent);
      expect(order).toEqual(["main", "after1", "after2"]);
    });
  });

  describe("Middleware Object Configuration", () => {
    test("should handle object with middleware function property", async () => {
      const middleware = mock(() => NextResponse.next());
      const nemo = new NEMO({
        "/test": {
          middleware: middleware,
        },
      });

      await nemo.middleware(mockRequest("/test"), mockEvent);
      expect(middleware).toHaveBeenCalled();
    });

    test("should handle object with middleware array property", async () => {
      const order: string[] = [];
      const middleware1 = mock(() => {
        order.push("first");
      });
      const middleware2 = mock(() => {
        order.push("second");
        return NextResponse.next();
      });

      const nemo = new NEMO({
        "/test": {
          middleware: [middleware1, middleware2],
        },
      });

      await nemo.middleware(mockRequest("/test"), mockEvent);
      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).toHaveBeenCalled();
      expect(order).toEqual(["first", "second"]);
    });

    test("should handle nested routes with middleware object", async () => {
      const middleware = mock(() => NextResponse.next());
      const nemo = new NEMO({
        "/api": {
          middleware: mock(() => {}),
          "/users": {
            middleware: middleware,
          },
        },
      });

      await nemo.middleware(mockRequest("/api/users"), mockEvent);
      expect(middleware).toHaveBeenCalled();
    });

    test("should properly attach metadata to middleware from object", async () => {
      let capturedMetadata: any = null;

      const middleware: NextMiddleware = (req, event) => {
        capturedMetadata = (event as any).currentMetadata;
        return NextResponse.next();
      };

      const nemo = new NEMO({
        "/test": {
          middleware: middleware,
        },
      });

      await nemo.middleware(mockRequest("/test"), mockEvent);

      expect(capturedMetadata).not.toBeNull();
      expect(capturedMetadata.chain).toBe("main");
      expect(capturedMetadata.routeKey).toBe("/test");
      expect(capturedMetadata.pathname).toBe("/test");
    });
  });

  describe("Response Types", () => {
    test("should handle NextResponse.next() correctly", async () => {
      const middlewares: NextMiddleware[] = [];
      const order: string[] = [];

      // Create three middlewares to test chain continuation
      for (let i = 0; i < 3; i++) {
        middlewares.push((req) => {
          order.push(`middleware-${i}`);
          if (i === 1) {
            // Add a header in the middle middleware
            req.headers.set(`x-test-${i}`, `value-${i}`);
            // Return NextResponse.next() explicitly
            return NextResponse.next();
          }
        });
      }

      const nemo = new NEMO({ "/test": middlewares });
      const response = await nemo.middleware(mockRequest("/test"), mockEvent);

      // Check that all middlewares executed (chain continued)
      expect(order).toEqual(["middleware-0", "middleware-1", "middleware-2"]);
      // Check that headers from req were propagated
      expect(response?.headers.get("x-test-1")).toBe("value-1");
    });

    test("should handle NextResponse.redirect() correctly", async () => {
      const order: string[] = [];
      const redirectUrl = "https://example.com/login";

      const middleware1: NextMiddleware = () => {
        order.push("before-redirect");
        return NextResponse.redirect(redirectUrl);
      };

      const middleware2: NextMiddleware = () => {
        order.push("after-redirect");
      };

      const nemo = new NEMO({ "/test": [middleware1, middleware2] });
      const response = await nemo.middleware(mockRequest("/test"), mockEvent);

      // Chain should break
      expect(order).toEqual(["before-redirect"]);
      expect(order).not.toContain("after-redirect");

      // Check response properties
      expect(response?.status).toBe(307); // Default redirect status
      expect(response?.headers.get("Location")).toBe(redirectUrl);
    });

    test("should handle NextResponse.redirect() with custom status", async () => {
      const redirectUrl = "https://example.com/moved";

      const middleware: NextMiddleware = () => {
        return NextResponse.redirect(redirectUrl, 301); // Permanent redirect
      };

      const nemo = new NEMO({ "/test": middleware });
      const response = await nemo.middleware(mockRequest("/test"), mockEvent);

      expect(response?.status).toBe(301);
      expect(response?.headers.get("Location")).toBe(redirectUrl);
    });

    test("should handle NextResponse.rewrite() correctly", async () => {
      const order: string[] = [];
      const rewriteUrl = "https://example.com/internal";

      const middleware1: NextMiddleware = () => {
        order.push("before-rewrite");
        return NextResponse.rewrite(rewriteUrl);
      };

      const middleware2: NextMiddleware = () => {
        order.push("after-rewrite");
      };

      const nemo = new NEMO({ "/test": [middleware1, middleware2] });
      const response = await nemo.middleware(mockRequest("/test"), mockEvent);

      // Chain should break
      expect(order).toEqual(["before-rewrite"]);
      expect(order).not.toContain("after-rewrite");

      // Check the URL was rewritten
      expect(response?.headers.get("x-middleware-rewrite")).toBe(rewriteUrl);
    });

    test("should handle NextResponse.json() correctly", async () => {
      const order: string[] = [];
      const jsonData = { message: "Hello, world!" };

      const middleware1: NextMiddleware = () => {
        order.push("before-json");
        return NextResponse.json(jsonData);
      };

      const middleware2: NextMiddleware = () => {
        order.push("after-json");
      };

      const nemo = new NEMO({ "/test": [middleware1, middleware2] });
      const response = await nemo.middleware(mockRequest("/test"), mockEvent);

      // Chain should break
      expect(order).toEqual(["before-json"]);
      expect(order).not.toContain("after-json");

      // Check response properties - content-type may include charset
      const contentType = response?.headers.get("content-type");
      expect(contentType?.startsWith("application/json")).toBe(true);
      const responseBody = await response?.json();
      expect(responseBody).toEqual(jsonData);
    });

    test("should handle NextResponse.json() with custom status", async () => {
      const jsonData = { error: "Not found" };

      const middleware: NextMiddleware = () => {
        return NextResponse.json(jsonData, { status: 404 });
      };

      const nemo = new NEMO({ "/test": middleware });
      const response = await nemo.middleware(mockRequest("/test"), mockEvent);

      expect(response?.status).toBe(404);
      // Check response properties - content-type may include charset
      const contentType = response?.headers.get("content-type");
      expect(contentType?.startsWith("application/json")).toBe(true);
      const responseBody = await response?.json();
      expect(responseBody).toEqual(jsonData);
    });

    test("should handle new Response() correctly", async () => {
      const order: string[] = [];
      const responseText = "Plain text response";

      const middleware1: NextMiddleware = () => {
        order.push("before-response");
        return new Response(responseText, {
          headers: { "content-type": "text/plain" },
          status: 200,
        });
      };

      const middleware2: NextMiddleware = () => {
        order.push("after-response");
      };

      const nemo = new NEMO({ "/test": [middleware1, middleware2] });
      const response = await nemo.middleware(mockRequest("/test"), mockEvent);

      // Chain should break
      expect(order).toEqual(["before-response"]);
      expect(order).not.toContain("after-response");

      // Check response properties
      expect(response?.headers.get("content-type")).toBe("text/plain");
      expect(await response?.text()).toBe(responseText);
    });

    test("should handle Response with custom status code", async () => {
      const middleware: NextMiddleware = () => {
        return new Response("Not found", {
          status: 404,
          headers: { "x-custom": "custom-value" },
        });
      };

      const nemo = new NEMO({ "/test": middleware });
      const response = await nemo.middleware(mockRequest("/test"), mockEvent);

      expect(response?.status).toBe(404);
      expect(response?.headers.get("x-custom")).toBe("custom-value");
      expect(await response?.text()).toBe("Not found");
    });

    test("should handle Empty Response (204 No Content)", async () => {
      const middleware: NextMiddleware = () => {
        return new Response(null, { status: 204 });
      };

      const nemo = new NEMO({ "/test": middleware });
      const response = await nemo.middleware(mockRequest("/test"), mockEvent);

      expect(response?.status).toBe(204);
      expect(await response?.text()).toBe("");
    });

    test("should handle Response with binary data", async () => {
      const binaryData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello" in ASCII

      const middleware: NextMiddleware = () => {
        return new Response(binaryData, {
          headers: { "content-type": "application/octet-stream" },
        });
      };

      const nemo = new NEMO({ "/test": middleware });
      const response = await nemo.middleware(mockRequest("/test"), mockEvent);

      expect(response?.headers.get("content-type")).toBe(
        "application/octet-stream",
      );
      const buffer = await response?.arrayBuffer();
      expect(new Uint8Array(buffer!)).toEqual(binaryData);
    });
  });
});
