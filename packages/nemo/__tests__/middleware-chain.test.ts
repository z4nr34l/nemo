import { describe, expect, it, mock } from "bun:test";
import { NextRequest, NextResponse } from "next/server";
import { NEMO, NemoEvent } from "../src/index";

describe("Middleware Chain Execution", () => {
  // Helper function to create a mock NextRequest
  const createMockRequest = () => {
    return new NextRequest("https://example.com/test");
  };

  // Helper function to create a mock NemoEvent
  const createMockEvent = (): never => {
    return NemoEvent.from({} as any) as never;
  };

  it('should continue execution after a "next" response', async () => {
    const firstMiddleware = mock(() => {
      return NextResponse.next();
    });

    const secondMiddleware = mock(() => {
      return undefined;
    });

    const nemo = new NEMO({
      "/test": [firstMiddleware, secondMiddleware],
    });

    await nemo.middleware(createMockRequest(), createMockEvent());

    expect(firstMiddleware).toHaveBeenCalledTimes(1);
    expect(secondMiddleware).toHaveBeenCalledTimes(1);
  });

  it("should stop execution after a redirect response", async () => {
    const firstMiddleware = mock(() => {
      return NextResponse.redirect("https://example.com/redirected");
    });

    const secondMiddleware = mock(() => {
      return undefined;
    });

    const nemo = new NEMO({
      "/test": [firstMiddleware, secondMiddleware],
    });

    await nemo.middleware(createMockRequest(), createMockEvent());

    expect(firstMiddleware).toHaveBeenCalledTimes(1);
    expect(secondMiddleware).not.toHaveBeenCalled();
  });

  it("should stop execution after a rewrite response", async () => {
    const firstMiddleware = mock(() => {
      return NextResponse.rewrite("https://example.com/rewritten");
    });

    const secondMiddleware = mock(() => {
      return undefined;
    });

    const nemo = new NEMO({
      "/test": [firstMiddleware, secondMiddleware],
    });

    await nemo.middleware(createMockRequest(), createMockEvent());

    expect(firstMiddleware).toHaveBeenCalledTimes(1);
    expect(secondMiddleware).not.toHaveBeenCalled();
  });

  it("should stop execution after a JSON response", async () => {
    const firstMiddleware = mock(() => {
      return NextResponse.json({ message: "Hello, World!" });
    });

    const secondMiddleware = mock(() => {
      return undefined;
    });

    const nemo = new NEMO({
      "/test": [firstMiddleware, secondMiddleware],
    });

    await nemo.middleware(createMockRequest(), createMockEvent());

    expect(firstMiddleware).toHaveBeenCalledTimes(1);
    expect(secondMiddleware).not.toHaveBeenCalled();
  });

  it("should carry modified headers between middleware functions", async () => {
    const firstMiddleware = mock((req) => {
      req.headers.set("x-test-header", "test-value");
      return NextResponse.next();
    });

    const secondMiddleware = mock((req) => {
      expect(req.headers.get("x-test-header")).toBe("test-value");
      return NextResponse.next();
    });

    const nemo = new NEMO({
      "/test": [firstMiddleware, secondMiddleware],
    });

    await nemo.middleware(createMockRequest(), createMockEvent());

    expect(firstMiddleware).toHaveBeenCalledTimes(1);
    expect(secondMiddleware).toHaveBeenCalledTimes(1);
  });

  it('should correctly detect "next" responses with added headers', async () => {
    const firstMiddleware = mock(() => {
      const response = NextResponse.next();
      response.headers.set("x-custom-header", "custom-value");
      return response;
    });

    const secondMiddleware = mock(() => {
      return undefined;
    });

    const nemo = new NEMO({
      "/test": [firstMiddleware, secondMiddleware],
    });

    await nemo.middleware(createMockRequest(), createMockEvent());

    expect(firstMiddleware).toHaveBeenCalledTimes(1);
    expect(secondMiddleware).toHaveBeenCalledTimes(1);
  });

  // This test specifically tests the issue that was fixed
  it("should continue chain after a next() response with headers", async () => {
    const steps: string[] = [];

    const middlewares = {
      "/test": [
        () => {
          steps.push("middleware1");
          const response = NextResponse.next();
          response.headers.set("x-test", "value");
          return response;
        },
        () => {
          steps.push("middleware2");
          return undefined;
        },
      ],
    };

    const nemo = new NEMO(middlewares);
    await nemo.middleware(createMockRequest(), createMockEvent());

    expect(steps).toEqual(["middleware1", "middleware2"]);
  });

  // Edge case: NextResponse with special headers that should still continue the chain
  it("should continue chain when next() has non-rewrite/non-location headers", async () => {
    const steps: string[] = [];

    const middlewares = {
      "/test": [
        () => {
          steps.push("middleware1");
          const response = NextResponse.next();
          // Add headers that aren't special NextJS headers
          response.headers.set("x-custom-data", "some-data");
          response.headers.set("authorization", "Bearer token");
          return response;
        },
        () => {
          steps.push("middleware2");
          return NextResponse.next();
        },
      ],
    };

    const nemo = new NEMO(middlewares);
    await nemo.middleware(createMockRequest(), createMockEvent());

    expect(steps).toEqual(["middleware1", "middleware2"]);
  });
});
