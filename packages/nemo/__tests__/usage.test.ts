import { describe, expect, mock, test } from "bun:test";
import { NextRequest, type NextFetchEvent } from "next/server";
import { NEMO } from "../src";

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
});
