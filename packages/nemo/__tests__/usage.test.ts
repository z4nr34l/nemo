import { describe, expect, mock, test } from "bun:test";
import { NextRequest, NextResponse, type NextFetchEvent } from "next/server";
import { NEMO, createNEMO } from "../src";

describe("Usage and DX Tests", () => {
  const mockRequest = (path: string = "/") =>
    new NextRequest(`http://localhost${path}`);

  const mockEvent: NextFetchEvent = {
    waitUntil: mock(() => {}),
  } as never as NextFetchEvent;

  describe("Storage usage in middleware", () => {
    test("should persist data between middlewares in the same chain", async () => {
      const nemo = new NEMO({
        "/": [
          async (req, { storage }) => {
            storage.set("testKey", "testValue");
          },
          async (req, { storage }) => {
            const value = storage.get<string>("testKey");
            expect(value).toBe("testValue");
          },
        ],
      });

      const response = await nemo.middleware(mockRequest(), mockEvent);
      expect(response instanceof Response).toBe(true);
    });

    test("should maintain type safety when using storage", async () => {
      interface UserData {
        id: number;
        name: string;
      }

      const nemo = new NEMO({
        "/": [
          async (req, { storage }) => {
            const userData: UserData = {
              id: 1,
              name: "Test",
            };
            storage.set<UserData>("user", userData);

            const user = storage.get<UserData>("user");
            expect(user).toBeDefined();
            expect(user?.id).toBe(1);
            expect(user?.name).toBe("Test");
          },
        ],
      });

      const response = await nemo.middleware(mockRequest(), mockEvent);
      expect(response instanceof Response).toBe(true);
    });

    test("should handle complex storage operations", async () => {
      const nemo = new NEMO({
        "/": [
          async (req, { storage }) => {
            storage.set("counter", 1);
            storage.set("items", ["a", "b"]);
            storage.set("meta", { updated: new Date() });

            expect(storage.get<number>("counter")).toBe(1);
            expect(storage.get<string[]>("items")).toEqual(["a", "b"]);
            expect(storage.has("meta")).toBe(true);

            storage.delete("counter");
            expect(storage.has("counter")).toBe(false);
          },
        ],
      });

      const response = await nemo.middleware(mockRequest(), mockEvent);
      expect(response instanceof Response).toBe(true);
    });

    test("should maintain data between before/main/after middleware", async () => {
      const order: string[] = [];

      const nemo = new NEMO(
        {
          "/": async (req, { storage }) => {
            const value = storage.get<string>("step");
            expect(value).toBe("before");
            storage.set("step", "main");
            order.push("main");
          },
        },
        {
          before: async (req, { storage }) => {
            storage.set("step", "before");
            order.push("before");
          },
          after: async (req, { storage }) => {
            const value = storage.get<string>("step");
            expect(value).toBe("main");
            order.push("after");
          },
        },
      );

      const response = await nemo.middleware(mockRequest(), mockEvent);
      expect(response instanceof Response).toBe(true);
      expect(order).toEqual(["before", "main", "after"]);
    });
  });

  describe("createNEMO function", () => {
    test("should work with basic middleware configuration", async () => {
      const testMiddleware = mock((req) => {
        req.headers.set("x-test-header", "test-value");
        return NextResponse.next();
      });

      const middleware = createNEMO({
        "/api": testMiddleware,
      });

      const response = await middleware(mockRequest("/api"), mockEvent);
      expect(response instanceof Response).toBe(true);
      expect(testMiddleware).toHaveBeenCalled();
      expect(response.headers.get("x-test-header")).toBe("test-value");
    });

    test("should work with global middleware", async () => {
      const order: string[] = [];
      const beforeMiddleware = mock(() => {
        order.push("before");
        return NextResponse.next();
      });
      const mainMiddleware = mock(() => {
        order.push("main");
        return NextResponse.next();
      });
      const afterMiddleware = mock(() => {
        order.push("after");
        return NextResponse.next();
      });

      const middleware = createNEMO(
        { "/": mainMiddleware },
        {
          before: beforeMiddleware,
          after: afterMiddleware,
        },
      );

      await middleware(mockRequest(), mockEvent);
      expect(order).toEqual(["before", "main", "after"]);
    });

    test("should work with NEMO configuration", async () => {
      const errorHandler = mock(() => NextResponse.next());

      const middleware = createNEMO(
        {
          "/": () => {
            throw new Error("Test error");
          },
        },
        undefined,
        {
          silent: true,
          errorHandler,
        },
      );

      await middleware(mockRequest(), mockEvent);
      expect(errorHandler).toHaveBeenCalled();
    });

    test("should share storage between middleware functions", async () => {
      const middleware = createNEMO({
        "/": [
          async (req, { storage }) => {
            storage.set("testKey", "createNEMO-value");
            return NextResponse.next();
          },
          async (req, { storage }) => {
            const value = storage.get<string>("testKey");
            expect(value).toBe("createNEMO-value");
            return NextResponse.next();
          },
        ],
      });

      const response = await middleware(mockRequest(), mockEvent);
      expect(response instanceof Response).toBe(true);
    });
  });
});
