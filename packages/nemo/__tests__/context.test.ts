import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { NEMO, type MiddlewareConfig } from "../src";

describe("NEMO Middleware Context", () => {
  const createMockRequest = (path: string = "/") =>
    new NextRequest(new URL(`http://localhost${path}`));

  test("should maintain context within single middleware", async () => {
    const nemo = new NEMO({
      "/test": async (req, event) => {
        const context = event.context;
        context.set("visited", true);
        expect(context.get<boolean>("visited")).toBe(true);
        return null;
      },
    } satisfies MiddlewareConfig);

    await nemo.middleware(createMockRequest("/test"), {} as any);
  });

  test("should share context between middleware chain", async () => {
    const nemo = new NEMO({
      "/shared": [
        async (req, event) => {
          event.context.set("step1", "completed");
          return null;
        },
        async (req, event) => {
          expect(event.context.get<string>("step1")).toBe("completed");
          event.context.set("step2", "completed");
          return null;
        },
        async (req, event) => {
          expect(event.context.get<string>("step1")).toBe("completed");
          expect(event.context.get<string>("step2")).toBe("completed");
          return null;
        },
      ],
    });

    await nemo.middleware(createMockRequest("/shared"), {} as any);
  });

  test("should isolate context between different requests", async () => {
    const contextValues: string[] = [];
    const nemo = new NEMO({
      "/": async (req, event) => {
        const requestId = req.nextUrl.searchParams.get("id");
        event.context.set("requestId", requestId);
        contextValues.push(event.context.get<string>("requestId")!);
        return null;
      },
    });

    const request1 = createMockRequest("/?id=1");
    const request2 = createMockRequest("/?id=2");

    await Promise.all([
      nemo.middleware(request1, {} as any),
      nemo.middleware(request2, {} as any),
    ]);

    expect(contextValues).toContain("1");
    expect(contextValues).toContain("2");
  });

  test("should maintain context in global middleware chain", async () => {
    const nemo = new NEMO(
      {
        "/global-test": async (req, event) => {
          expect(event.context.get<string>("before")).toBe("done");
          event.context.set("main", "done");
          return null;
        },
      },
      {
        before: async (req, event) => {
          event.context.set("before", "done");
          return null;
        },
        after: async (req, event) => {
          expect(event.context.get<string>("before")).toBe("done");
          expect(event.context.get<string>("main")).toBe("done");
          event.context.set("after", "done");
          return null;
        },
      },
    );

    await nemo.middleware(createMockRequest("/global-test"), {} as any);
  });

  test("should handle async operations in context", async () => {
    const nemo = new NEMO({
      "/async": [
        async (req, event) => {
          event.context.set("pending", true);
          await new Promise((resolve) => setTimeout(resolve, 10));
          event.context.set("completed", true);
          return null;
        },
        async (req, event) => {
          expect(event.context.get<boolean>("pending")).toBe(true);
          expect(event.context.get<boolean>("completed")).toBe(true);
          return null;
        },
      ],
    });

    await nemo.middleware(createMockRequest("/async"), {} as any);
  });

  test("should preserve context types", async () => {
    const nemo = new NEMO({
      "/types": async (req, event) => {
        const context = event.context;

        context.set("number", 123);
        context.set("string", "test");
        context.set("object", { key: "value" });

        expect(context.get<number>("number")).toBe(123);
        expect(context.get<string>("string")).toBe("test");
        expect(context.get<{ key: string }>("object")).toEqual({
          key: "value",
        });
        return null;
      },
    });

    await nemo.middleware(createMockRequest("/types"), {} as any);
  });
});
