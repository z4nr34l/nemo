import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { NextRequest, NextResponse, type NextFetchEvent } from "next/server";
import {
  createMiddleware,
  NEMO,
  NemoMiddlewareError,
  type ErrorHandler,
  type NemoRequest,
  type NextMiddleware,
} from "../src";

describe("NEMO", () => {
  const mockRequest = (path: string = "/") => {
    return new NextRequest(`http://localhost${path}`, {
      headers: new Headers({ "x-initial": "value" }),
    });
  };

  const mockEvent = {
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
      test("should break chain on NextResponse.next()", async () => {
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

      test("should break chain on new NextResponse", async () => {
        const order: string[] = [];
        const middleware1: NextMiddleware = () => {
          order.push("first");
          return new NextResponse(null, { status: 200 });
        };
        const middleware2: NextMiddleware = () => {
          order.push("second");
        };

        const nemo = new NEMO({ "/": [middleware1, middleware2] });
        const response = await nemo.middleware(mockRequest(), mockEvent);

        expect(order).toEqual(["first"]);
        expect(response?.status).toBe(200);
      });

      test("should break chain on new Response", async () => {
        const order: string[] = [];
        const middleware1: NextMiddleware = () => {
          order.push("first");
          return new Response(null, { status: 200 });
        };
        const middleware2: NextMiddleware = () => {
          order.push("second");
        };

        const nemo = new NEMO({ "/": [middleware1, middleware2] });
        const response = await nemo.middleware(mockRequest(), mockEvent);

        expect(order).toEqual(["first"]);
        expect(response instanceof Response).toBe(true);
        expect(response?.status).toBe(200);
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

  describe("Path Matching Cache", () => {
    test("should cache path matching results", async () => {
      const middleware = mock(() => NextResponse.next());
      const nemo = new NEMO({ "/test/:id": middleware });

      // First request - should compute and cache
      await nemo.middleware(mockRequest("/test/123"), mockEvent);

      // Second request - should use cache
      await nemo.middleware(mockRequest("/test/123"), mockEvent);

      expect(middleware).toHaveBeenCalledTimes(2);
    });

    test("should clear cache when clearContext is called", async () => {
      const middleware = mock(() => NextResponse.next());
      const nemo = new NEMO({ "/test/:id": middleware });

      // First request
      await nemo.middleware(mockRequest("/test/123"), mockEvent);

      // Clear cache
      nemo.clearContext();

      // Second request - should recompute
      await nemo.middleware(mockRequest("/test/123"), mockEvent);

      expect(middleware).toHaveBeenCalledTimes(2);
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

  describe("Headers Handling", () => {
    test("should preserve modified headers", async () => {
      const middleware: NextMiddleware = (req) => {
        req.headers.set("x-modified", "value");
      };

      const nemo = new NEMO({ "/": middleware });
      const response = await nemo.middleware(mockRequest(), mockEvent);

      expect(response?.headers.get("x-modified")).toBe("value");
    });

    test("should handle multiple header modifications", async () => {
      const middleware1: NextMiddleware = (req) => {
        req.headers.set("x-first", "first");
      };

      const middleware2: NextMiddleware = (req) => {
        req.headers.set("x-second", "second");
      };

      const nemo = new NEMO({ "/": [middleware1, middleware2] });
      const response = await nemo.middleware(mockRequest(), mockEvent);

      expect(response?.headers.get("x-first")).toBe("first");
      expect(response?.headers.get("x-second")).toBe("second");
    });
  });

  describe("Context Handling", () => {
    test("should share context between middleware in chain", async () => {
      const middleware1: NextMiddleware = (req: NextRequest) => {
        (req as NemoRequest).context.set("test", "value");
      };

      const middleware2: NextMiddleware = (req: NextRequest) => {
        expect((req as NemoRequest).context.get("test")).toBe("value");
        return NextResponse.next();
      };

      const nemo = new NEMO({ "/": [middleware1, middleware2] });
      await nemo.middleware(mockRequest(), mockEvent);
    });

    test("should clear context when clearContext is called", async () => {
      const middleware1: NextMiddleware = (req: NextRequest) => {
        (req as NemoRequest).context.set("test", "value");
      };

      const nemo = new NEMO({ "/": middleware1 });
      await nemo.middleware(mockRequest(), mockEvent);

      nemo.clearContext();

      // Use a new request with the fresh context
      const req = mockRequest();
      await nemo.middleware(req, mockEvent);
      expect((req as NemoRequest).context.get("test")).toBeUndefined();
    });
  });

  describe("Debug Mode", () => {
    test("should enable debug logging", async () => {
      const originalConsoleLog = console.log;
      const consoleSpy = mock((...args: any[]) => {
        originalConsoleLog(...args);
      });
      console.log = consoleSpy;

      const middleware: NextMiddleware = () => NextResponse.next();
      const nemo = new NEMO({ "/": middleware }, undefined, { debug: true });
      await nemo.middleware(mockRequest(), mockEvent);

      expect(consoleSpy).toHaveBeenCalled();

      // Restore original console.log
      console.log = originalConsoleLog;
    });

    test("should not log when debug is disabled", async () => {
      const originalConsoleLog = console.log;
      const consoleSpy = mock((...args: any[]) => {
        originalConsoleLog(...args);
      });
      console.log = consoleSpy;

      const middleware: NextMiddleware = () => NextResponse.next();
      const nemo = new NEMO({ "/": middleware }); // debug not enabled
      await nemo.middleware(mockRequest(), mockEvent);

      expect(consoleSpy).not.toHaveBeenCalled();

      // Restore original console.log
      console.log = originalConsoleLog;
    });
  });

  describe("Error Handling", () => {
    test("should provide context for errors in before middleware", async () => {
      const errorMiddleware: NextMiddleware = () => {
        throw new Error("Test error");
      };

      const nemo = new NEMO({ "/": () => {} }, { before: errorMiddleware });

      try {
        await nemo.middleware(mockRequest(), mockEvent);
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(NemoMiddlewareError);
        const nemoError = error as NemoMiddlewareError;
        expect(nemoError.context.chain).toBe("before");
        expect(nemoError.context.index).toBe(0);
        expect(nemoError.context.pathname).toBe("/");
        expect(nemoError.context.routeKey).toBe("/");
        expect(nemoError.originalError).toBeInstanceOf(Error);
      }
    });

    test("should provide context for errors in main middleware", async () => {
      const errorMiddleware: NextMiddleware = () => {
        throw new Error("Test error");
      };

      const nemo = new NEMO({
        "/test": errorMiddleware,
      });

      try {
        await nemo.middleware(mockRequest("/test"), mockEvent);
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(NemoMiddlewareError);
        const nemoError = error as NemoMiddlewareError;
        expect(nemoError.context.chain).toBe("main");
        expect(nemoError.context.pathname).toBe("/test");
        expect(nemoError.context.routeKey).toBe("/test");
        expect(nemoError.context.index).toBe(0);
        expect(nemoError.originalError).toBeInstanceOf(Error);
      }
    });

    test("should provide context for errors in after middleware", async () => {
      const errorMiddleware: NextMiddleware = () => {
        throw new Error("Test error");
      };

      const nemo = new NEMO({ "/": () => {} }, { after: errorMiddleware });

      try {
        await nemo.middleware(mockRequest(), mockEvent);
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(NemoMiddlewareError);
        const nemoError = error as NemoMiddlewareError;
        expect(nemoError.context.chain).toBe("after");
        expect(nemoError.context.index).toBe(0);
        expect(nemoError.context.pathname).toBe("/");
        expect(nemoError.context.routeKey).toBe("/");
        expect(nemoError.originalError).toBeInstanceOf(Error);
      }
    });

    test("should provide correct error context in middleware chains", async () => {
      const middleware1: NextMiddleware = () => {};
      const errorMiddleware: NextMiddleware = () => {
        throw new Error("Test error");
      };
      const middleware3: NextMiddleware = () => {};

      const nemo = new NEMO({
        "/test": [middleware1, errorMiddleware, middleware3],
      });

      try {
        await nemo.middleware(mockRequest("/test"), mockEvent);
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(NemoMiddlewareError);
        const nemoError = error as NemoMiddlewareError;
        expect(nemoError.context.chain).toBe("main");
        expect(nemoError.context.pathname).toBe("/test");
        expect(nemoError.context.routeKey).toBe("/test");
        expect(nemoError.context.index).toBe(1);
        expect(nemoError.originalError).toBeInstanceOf(Error);
      }
    });

    test("should include route key in error context for pattern paths", async () => {
      const errorMiddleware: NextMiddleware = () => {
        throw new Error("Test error");
      };

      const nemo = new NEMO({
        "/test/:id": errorMiddleware,
      });

      try {
        await nemo.middleware(mockRequest("/test/123"), mockEvent);
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(NemoMiddlewareError);
        const nemoError = error as NemoMiddlewareError;
        expect(nemoError.context.chain).toBe("main");
        expect(nemoError.context.pathname).toBe("/test/123");
        expect(nemoError.context.routeKey).toBe("/test/:id");
        expect(nemoError.context.index).toBe(0);
      }
    });
  });

  describe("Enhanced Error Handling", () => {
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

    test("should preserve error context in silent mode", async () => {
      const errorMiddleware: NextMiddleware = () => {
        throw new Error("Test error");
      };

      const nextMiddleware: NextMiddleware = (req: NextRequest) => {
        const context = (req as NemoRequest).context;
        expect(context.get("lastError")).toBeInstanceOf(Error);
        return NextResponse.next();
      };

      const nemo = new NEMO(
        { "/": [errorMiddleware, nextMiddleware] },
        undefined,
        { silent: true },
      );

      await nemo.middleware(mockRequest(), mockEvent);
    });
  });

  describe("Timing Features", () => {
    test("should track timing when enabled", async () => {
      const middleware: NextMiddleware = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return NextResponse.next();
      };

      const consoleSpy = mock(console.log);
      console.log = consoleSpy;

      const nemo = new NEMO({ "/": middleware }, undefined, {
        debug: true,
        enableTiming: true,
      });

      await nemo.middleware(mockRequest(), mockEvent);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[NEMO]"),
        "Chain timing summary:",
        expect.objectContaining({
          main: expect.stringMatching(/\d+\.\d+ms/),
          total: expect.stringMatching(/\d+\.\d+ms/),
        }),
      );

      console.log = consoleSpy as unknown as typeof console.log;
    });

    test("should not track timing when disabled", async () => {
      const middleware: NextMiddleware = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return NextResponse.next();
      };

      const consoleSpy = mock(console.log);
      console.log = consoleSpy;

      const nemo = new NEMO({ "/": middleware }, undefined, {
        debug: true,
        enableTiming: false,
      });

      await nemo.middleware(mockRequest(), mockEvent);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("[NEMO]"),
        "Chain timing summary:",
        expect.any(Object),
      );

      console.log = consoleSpy as unknown as typeof console.log;
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
        "[NEMO] `createMiddleware` is deprecated. Use `new NEMO()` instead.",
      );
    });

    test("should return a working middleware instance", async () => {
      const testMiddleware = mock(() => NextResponse.next());
      const { middleware } = createMiddleware({ "/test": testMiddleware });

      await middleware(mockRequest("/test"), mockEvent);
      expect(testMiddleware).toHaveBeenCalled();
    });

    test("should handle global middleware", async () => {
      const order: string[] = [];
      const beforeMiddleware: NextMiddleware = () => {
        order.push("before");
      };
      const mainMiddleware: NextMiddleware = () => {
        order.push("main");
      };
      const afterMiddleware: NextMiddleware = () => {
        order.push("after");
      };

      const { middleware } = createMiddleware(
        { "/": mainMiddleware },
        {
          before: beforeMiddleware,
          after: afterMiddleware,
        },
      );

      await middleware(mockRequest(), mockEvent);
      expect(order).toEqual(["before", "main", "after"]);
    });
  });
});
