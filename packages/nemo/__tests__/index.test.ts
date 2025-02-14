import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { NextRequest, NextResponse, type NextFetchEvent } from "next/server";
import {
  createMiddleware,
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
        "[NEMO] `createMiddleware` is deprecated. Use `new NEMO()` instead.",
      );
    });

    test("should return a working middleware instance", async () => {
      const testMiddleware = mock(() => NextResponse.next());
      const { middleware } = createMiddleware({ "/test": testMiddleware });

      await middleware(mockRequest("/test"), mockEvent);
      expect(testMiddleware).toHaveBeenCalled();
    });
  });
});
