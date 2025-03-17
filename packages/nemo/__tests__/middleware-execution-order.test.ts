import { describe, expect, it, mock } from "bun:test";
import { NextRequest, type NextFetchEvent } from "next/server";
import { createNEMO } from "../src";

describe("Middleware Execution Order", () => {
  // Create a helper function to create a mock NextFetchEvent
  const mockEvent: NextFetchEvent = {
    waitUntil: mock(() => {}),
  } as never as NextFetchEvent;

  it("should execute middleware in correct order for nested routes", async () => {
    const executionOrder: string[] = [];

    const middleware = createNEMO({
      "/": async (req, event) => {
        executionOrder.push("root");
      },
      "/dashboard": {
        middleware: async (req, event) => {
          executionOrder.push("dashboard");
        },
        "/users": {
          middleware: async (req, event) => {
            executionOrder.push("users");
          },
          "/:userId": async (req, event) => {
            executionOrder.push("userId");
          },
        },
      },
    });

    const request = new NextRequest("http://localhost/dashboard/users/123");
    await middleware(request, mockEvent);

    expect(executionOrder).toEqual(["dashboard", "users", "userId"]);
  });

  it("should execute middleware in correct order for multiple nested parent routes", async () => {
    const executionOrder: string[] = [];

    const middleware = createNEMO({
      "/api": {
        middleware: async (req, event) => {
          executionOrder.push("api");
        },
        "/v1": {
          middleware: async (req, event) => {
            executionOrder.push("v1");
          },
          "/users": {
            middleware: async (req, event) => {
              executionOrder.push("users");
            },
            "/:id": async (req, event) => {
              executionOrder.push("user-id");
            },
          },
        },
      },
    });

    const request = new NextRequest("http://localhost/api/v1/users/123");
    await middleware(request, mockEvent);

    expect(executionOrder).toEqual(["api", "v1", "users", "user-id"]);
  });

  it("should execute global before/after middleware in correct order", async () => {
    const executionOrder: string[] = [];

    const middleware = createNEMO(
      {
        "/": async (req, event) => {
          executionOrder.push("root");
        },
        "/admin": {
          middleware: async (req, event) => {
            executionOrder.push("admin");
          },
          "/dashboard": async (req, event) => {
            executionOrder.push("dashboard");
          },
        },
      },
      {
        before: [
          async (req, event) => {
            executionOrder.push("global-before-1");
          },
          async (req, event) => {
            executionOrder.push("global-before-2");
          },
        ],
        after: [
          async (req, event) => {
            executionOrder.push("global-after-1");
          },
          async (req, event) => {
            executionOrder.push("global-after-2");
          },
        ],
      },
    );

    const request = new NextRequest("http://localhost/admin/dashboard");
    await middleware(request, mockEvent);

    expect(executionOrder).toEqual([
      "global-before-1",
      "global-before-2",
      "admin",
      "dashboard",
      "global-after-1",
      "global-after-2",
    ]);
  });

  it("should stop execution chain when middleware returns a response", async () => {
    const executionOrder: string[] = [];

    const middleware = createNEMO(
      {
        "/": async (req, event) => {
          executionOrder.push("root");
        },
        "/protected": {
          middleware: async (req, event) => {
            executionOrder.push("protected");
            // Return a response to stop the chain
            return new Response("Unauthorized", { status: 401 });
          },
          "/content": async (req, event) => {
            // This should never execute
            executionOrder.push("content");
          },
        },
      },
      {
        after: async (req, event) => {
          // This should not execute either
          executionOrder.push("global-after");
        },
      },
    );

    const request = new NextRequest("http://localhost/protected/content");
    await middleware(request, mockEvent);

    expect(executionOrder).toEqual(["protected"]);
    // 'content' and 'global-after' should not be in the array
  });

  it("should execute middleware in definition order when there are multiple at same level", async () => {
    const executionOrder: string[] = [];

    const middleware = createNEMO({
      "/api": [
        async (req, event) => {
          executionOrder.push("api-1");
        },
        async (req, event) => {
          executionOrder.push("api-2");
        },
        async (req, event) => {
          executionOrder.push("api-3");
        },
      ],
    });

    const request = new NextRequest("http://localhost/api");
    await middleware(request, mockEvent);

    expect(executionOrder).toEqual(["api-1", "api-2", "api-3"]);
  });
});
