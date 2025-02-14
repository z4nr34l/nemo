import { describe, expect, mock, test } from "bun:test";
import { NextRequest, NextResponse, type NextFetchEvent } from "next/server";
import { NEMO, NemoMiddlewareError, type NextMiddleware } from "../src";

describe("NEMO", () => {
  const mockRequest = (path: string = "/") => {
    return new NextRequest(`http://localhost${path}`, {
      headers: new Headers({ "x-initial": "value" }),
    });
  };

  const mockEvent = {
    waitUntil: mock(() => {}),
  } as never as NextFetchEvent;

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
});
