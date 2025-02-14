import { describe, expect, mock, test } from "bun:test";
import type { NextFetchEvent } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { NEMO, type NextMiddleware } from "../src";

describe("NEMO Edge Cases", () => {
  const mockRequest = (path: string = "/") =>
    new NextRequest(`http://localhost${path}`);

  const mockEvent: NextFetchEvent = {
    waitUntil: mock(() => {}),
  } as never as NextFetchEvent;

  test("should handle deeply nested paths", async () => {
    const middleware = mock(() => NextResponse.next());
    const nemo = new NEMO({
      "/very/deep/nested/:param/path": middleware,
    });

    await nemo.middleware(mockRequest("/very/deep/nested/123/path"), mockEvent);
    expect(middleware).toHaveBeenCalled();
  });

  test("should handle concurrent requests", async () => {
    const order: number[] = [];
    const slowMiddleware: NextMiddleware = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      order.push(1);
    };
    const fastMiddleware: NextMiddleware = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push(2);
    };

    const nemo = new NEMO({
      "/slow": slowMiddleware,
      "/fast": fastMiddleware,
    });

    await Promise.all([
      nemo.middleware(mockRequest("/slow"), mockEvent),
      nemo.middleware(mockRequest("/fast"), mockEvent),
    ]);

    expect(order).toEqual([2, 1]);
  });

  test("should handle empty middleware arrays", async () => {
    const nemo = new NEMO({ "/": [] });
    const response = await nemo.middleware(mockRequest(), mockEvent);
    expect(response instanceof NextResponse).toBe(true);
  });

  test("should handle unicode paths", async () => {
    const middleware = mock(() => NextResponse.next());
    const nemo = new NEMO({
      "/测试/:param/路径": middleware,
    });

    await nemo.middleware(mockRequest("/测试/123/路径"), mockEvent);
    expect(middleware).toHaveBeenCalled();
  });

  test("should handle very large headers", async () => {
    const largeValue = "x".repeat(10000);
    const middleware: NextMiddleware = (req) => {
      req.headers.set("x-large", largeValue);
    };

    const nemo = new NEMO({ "/": middleware });
    const response = await nemo.middleware(mockRequest(), mockEvent);

    expect(response?.headers.get("x-large")).toBe(largeValue);
  });

  test("should handle middleware returning undefined", async () => {
    const middleware: NextMiddleware = () => undefined;
    const nemo = new NEMO({ "/": middleware });

    const response = await nemo.middleware(mockRequest(), mockEvent);
    expect(response instanceof NextResponse).toBe(true);
  });
});
