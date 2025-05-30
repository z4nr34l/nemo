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
          middleware: adminMiddleware,
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
      expect(rootMiddleware).not.toHaveBeenCalled();
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
      // Add mock functions to track execution
      const shopMiddleware = mock((req) => {
        req.headers.set("x-shop", "true");
        return NextResponse.next();
      });

      const categoriesMiddleware = mock((req) => {
        req.headers.set("x-categories", "true");
        return NextResponse.next();
      });

      const categoryIdMiddleware = mock((req, event) => {
        const params = event.params;
        req.headers.set("x-category-id", String(params.categoryId));
        return NextResponse.next();
      });

      const productsMiddleware = mock((req) => {
        req.headers.set("x-products", "true");
        return NextResponse.next();
      });

      const productIdMiddleware = mock((req, event) => {
        const params = event.params;
        return NextResponse.next({
          headers: {
            "x-product-id": String(params.productId),
            "x-full-path": `category-${params.categoryId}/product-${params.productId}`,
          },
        });
      });

      const nemo = new NEMO({
        "/shop": {
          middleware: shopMiddleware,
          "/categories": {
            middleware: categoriesMiddleware,
            "/:categoryId": {
              middleware: categoryIdMiddleware,
              "/products": {
                middleware: productsMiddleware,
                "/:productId": productIdMiddleware,
              },
            },
          },
        },
      });

      const response = await nemo.middleware(
        mockRequest("/shop/categories/electronics/products/laptop"),
        mockEvent,
      );

      // Verify that all middleware was executed
      expect(shopMiddleware).toHaveBeenCalled();
      expect(categoriesMiddleware).toHaveBeenCalled();
      expect(categoryIdMiddleware).toHaveBeenCalled();
      expect(productsMiddleware).toHaveBeenCalled();
      expect(productIdMiddleware).toHaveBeenCalled();

      // Check that all expected headers are present
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

  describe("Path Matching", () => {
    test("should not match subpaths when not configured for nesting", async () => {
      const fooMiddleware = mock((req) => {
        req.headers.set("x-foo-executed", "true");
        return NextResponse.next();
      });

      const nemo = new NEMO({
        "/foo": fooMiddleware,
      });

      // Request to /foo/bar should not match /foo middleware
      const response = await nemo.middleware(
        mockRequest("/foo/bar"),
        mockEvent,
      );

      expect(fooMiddleware).not.toHaveBeenCalled();
      expect(response?.headers.get("x-foo-executed")).toBeNull();
    });
  });
});
