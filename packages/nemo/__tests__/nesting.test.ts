import { describe, expect, mock, test } from "bun:test";
import type { NextFetchEvent } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { NEMO, type NextMiddleware } from "../src";

describe("NEMO Nesting", () => {
  const mockRequest = (path: string = "/") => {
    return new NextRequest(`http://localhost${path}`, {
      headers: new Headers({ "x-initial": "value" }),
    });
  };

  const mockEvent: NextFetchEvent = {
    waitUntil: mock(() => {}),
  } as never as NextFetchEvent;

  describe("Nested Routes", () => {
    test("should handle basic nested routes", async () => {
      const rootMiddleware = mock((req) => {
        req.headers.set("x-level", "root");
        return NextResponse.next();
      });

      const adminMiddleware = mock((req) => {
        req.headers.set("x-section", "admin");
        return NextResponse.next();
      });

      const userMiddleware = mock((req) => {
        req.headers.set("x-section", "user");
        return NextResponse.next();
      });

      const nemo = new NEMO({
        "/": rootMiddleware,
        "/admin": {
          "/": adminMiddleware,
          "/users": () =>
            NextResponse.next({ headers: { "x-admin-users": "true" } }),
        },
        "/user": {
          middleware: userMiddleware,
          "/profile": () =>
            NextResponse.next({ headers: { "x-user-profile": "true" } }),
        },
      });

      const adminResponse = await nemo.middleware(
        mockRequest("/admin"),
        mockEvent,
      );
      expect(rootMiddleware).toHaveBeenCalled();
      expect(userMiddleware).not.toHaveBeenCalled();
      expect(adminMiddleware).toHaveBeenCalled();
      expect(adminResponse?.headers.get("x-section")).toBe("admin");
    });
  });

  describe("Middleware Chain Breaking in Nested Routes", () => {
    test("should break chain when parent returns response", async () => {
      const parentMiddleware = mock((req, event) => {
        return NextResponse.redirect("http://localhost/login");
      });

      const childMiddleware = mock((req, event) => {
        // Child middleware should never be called
        return NextResponse.next();
      });

      const nemo = new NEMO({
        "/protected": {
          middleware: parentMiddleware,
          "/dashboard": childMiddleware,
        },
      });

      const response = await nemo.middleware(
        mockRequest("/protected/dashboard"),
        mockEvent,
      );

      expect(parentMiddleware).toHaveBeenCalled();
      expect(childMiddleware).not.toHaveBeenCalled();
      expect(response?.status).toBe(307);
      expect(response?.headers.get("Location")).toBe("http://localhost/login");
    });
  });

  describe("Error Handling in Nested Routes", () => {
    test("should provide correct metadata for errors in nested routes", async () => {
      const errorMiddleware: NextMiddleware = () => {
        throw new Error("Nested error");
      };

      const errorHandler = mock((error: Error, context: any) => {
        expect(context.pathname).toBe("/api/users/123");
        expect(context.routeKey).toBe("/api/users/:id");
        return NextResponse.json({ error: "Handled error" }, { status: 500 });
      });

      const nemo = new NEMO(
        {
          "/api": {
            "/users": {
              "/:id": errorMiddleware,
            },
          },
        },
        undefined,
        {
          errorHandler,
        },
      );

      const response = await nemo.middleware(
        mockRequest("/api/users/123"),
        mockEvent,
      );
      expect(response?.status).toBe(500);

      const body = await response?.json();
      expect(body).toEqual({ error: "Handled error" });
    });
  });

  describe("Complex Nested Patterns", () => {
    test("should handle deeply nested routes with parameters", async () => {
      const nemo = new NEMO({
        "/shop": {
          middleware: (req) => {
            req.headers.set("x-shop", "true");
            return NextResponse.next();
          },
          "/categories": {
            middleware: (req) => {
              req.headers.set("x-categories", "true");
              return NextResponse.next();
            },
            "/:categoryId": {
              middleware: (req, event) => {
                // Now using typed params instead of casting to any
                const params = event.getParams();

                if (params.categoryId) {
                  req.headers.set("x-category-id", String(params.categoryId));
                }
                return NextResponse.next();
              },
              "/products": {
                middleware: (req) => {
                  req.headers.set("x-products", "true");
                  return NextResponse.next();
                },
                "/:productId": (req, event) => {
                  // Now using typed params instead of casting to any
                  const params = event.getParams();

                  return NextResponse.next({
                    headers: {
                      "x-product-id": String(params.productId),
                      "x-full-path": `category-${params.categoryId}/product-${params.productId}`,
                    },
                  });
                },
              },
            },
          },
        },
      });

      const response = await nemo.middleware(
        mockRequest("/shop/categories/electronics/products/laptop"),
        mockEvent,
      );

      expect(response?.headers.get("x-shop")).toBe("true");
      expect(response?.headers.get("x-categories")).toBe("true");
      expect(response?.headers.get("x-category-id")).toBe("electronics");
      expect(response?.headers.get("x-products")).toBe("true");
      expect(response?.headers.get("x-product-id")).toBe("laptop");
      expect(response?.headers.get("x-full-path")).toBe(
        "category-electronics/product-laptop",
      );
    });
  });

  describe("Middleware Execution in Nested Routes", () => {
    test("should execute parent middleware when nested middleware is matched", async () => {
      const parentMiddleware = mock((req, event) => {
        req.headers.set("x-parent-executed", "true");
        return NextResponse.next();
      });

      const childMiddleware = mock((req, event) => {
        req.headers.set("x-child-executed", "true");
        return NextResponse.next();
      });

      const nemo = new NEMO({
        "/parent": {
          middleware: parentMiddleware,
          "/child": childMiddleware,
        },
      });

      const response = await nemo.middleware(
        mockRequest("/parent/child"),
        mockEvent,
      );

      expect(parentMiddleware).toHaveBeenCalled();
      expect(childMiddleware).toHaveBeenCalled();
      expect(response?.headers.get("x-parent-executed")).toBe("true");
      expect(response?.headers.get("x-child-executed")).toBe("true");
    });
  });
});
