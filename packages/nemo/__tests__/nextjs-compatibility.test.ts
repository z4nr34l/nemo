/**
 * Integration tests for Next.js version compatibility
 * Tests backward compatibility with Next.js <16 (middleware.ts) and Next.js 16+ (proxy.ts)
 */

import { describe, expect, it } from "bun:test";
import { createNEMO, type MiddlewareConfig } from "../src";
import { NextRequest, NextResponse } from "next/server";
import { NemoEvent } from "../src/event";

describe("Next.js Version Compatibility", () => {
  const createMockRequest = (pathname: string = "/"): NextRequest => {
    return new NextRequest(new URL(`http://localhost:3000${pathname}`));
  };

  const createMockEvent = (): NemoEvent => {
    return new NemoEvent(new Event("fetch") as any);
  };

  describe("MiddlewareConfig (Next.js <16) compatibility", () => {
    it("should work with MiddlewareConfig type for middleware.ts", async () => {
      const middlewareConfig: MiddlewareConfig = {
        "/api": async (request) => {
          return NextResponse.next();
        },
      };

      const middleware = createNEMO(middlewareConfig);
      const request = createMockRequest("/api/test");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
    });

    it("should work with nested MiddlewareConfig", async () => {
      const middlewareConfig: MiddlewareConfig = {
        "/api": {
          middleware: async (request) => {
            return NextResponse.next();
          },
          "/users": async (request) => {
            return NextResponse.next();
          },
        },
      };

      const middleware = createNEMO(middlewareConfig);
      const request = createMockRequest("/api/users");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
    });

    it("should work with array of middleware functions", async () => {
      const middlewareConfig: MiddlewareConfig = {
        "/api": [
          async (request) => {
            return NextResponse.next();
          },
          async (request) => {
            return NextResponse.next();
          },
        ],
      };

      const middleware = createNEMO(middlewareConfig);
      const request = createMockRequest("/api/test");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
    });
  });

  describe("MiddlewareConfig (Next.js 16+) compatibility", () => {
    it("should work with MiddlewareConfig type for proxy.ts", async () => {
      const proxyConfig: MiddlewareConfig = {
        "/api": async (request) => {
          return NextResponse.next();
        },
      };

      const proxy = createNEMO(proxyConfig);
      const request = createMockRequest("/api/test");
      const event = createMockEvent();

      const result = await proxy(request, event as any);

      expect(result).toBeDefined();
    });

    it("should work with nested MiddlewareConfig", async () => {
      const proxyConfig: MiddlewareConfig = {
        "/api": {
          middleware: async (request) => {
            return NextResponse.next();
          },
          "/users": async (request) => {
            return NextResponse.next();
          },
        },
      };

      const proxy = createNEMO(proxyConfig);
      const request = createMockRequest("/api/users");
      const event = createMockEvent();

      const result = await proxy(request, event as any);

      expect(result).toBeDefined();
    });

    it("should work with array of middleware functions in MiddlewareConfig", async () => {
      const proxyConfig: MiddlewareConfig = {
        "/api": [
          async (request) => {
            return NextResponse.next();
          },
          async (request) => {
            return NextResponse.next();
          },
        ],
      };

      const proxy = createNEMO(proxyConfig);
      const request = createMockRequest("/api/test");
      const event = createMockEvent();

      const result = await proxy(request, event as any);

      expect(result).toBeDefined();
    });
  });

  describe("Cross-compatibility", () => {
    it("should accept MiddlewareConfig type for both middleware.ts and proxy.ts", async () => {
      const middlewareConfig: MiddlewareConfig = {
        "/api": async (request) => {
          return NextResponse.next();
        },
      };

      const proxyConfig: MiddlewareConfig = {
        "/api": async (request) => {
          return NextResponse.next();
        },
      };

      // Both should work with createNEMO
      const middleware = createNEMO(middlewareConfig);
      const proxy = createNEMO(proxyConfig);

      const request = createMockRequest("/api/test");
      const event = createMockEvent();

      const middlewareResult = await middleware(request, event as any);
      const proxyResult = await proxy(request, event as any);

      expect(middlewareResult).toBeDefined();
      expect(proxyResult).toBeDefined();
    });

    it("should work with global middleware for both config types", async () => {
      const config: MiddlewareConfig = {
        "/api": async (request) => {
          return NextResponse.next();
        },
      };

      const globalMiddleware = {
        before: async (request: NextRequest) => {
          // Global before middleware
        },
        after: async (request: NextRequest) => {
          // Global after middleware
        },
      };

      const middleware = createNEMO(config, globalMiddleware);
      const request = createMockRequest("/api/test");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
    });

    it("should handle root path middleware for both middleware.ts and proxy.ts", async () => {
      const middlewareConfig: MiddlewareConfig = {
        "/": async (request) => {
          return NextResponse.next();
        },
      };

      const proxyConfig: MiddlewareConfig = {
        "/": async (request) => {
          return NextResponse.next();
        },
      };

      const middleware = createNEMO(middlewareConfig);
      const proxy = createNEMO(proxyConfig);

      const request = createMockRequest("/");
      const event = createMockEvent();

      const middlewareResult = await middleware(request, event as any);
      const proxyResult = await proxy(request, event as any);

      expect(middlewareResult).toBeDefined();
      expect(proxyResult).toBeDefined();
    });
  });

  describe("Function signature compatibility", () => {
    it("should return compatible function signature for Next.js <16", async () => {
      const config: MiddlewareConfig = {
        "/api": async (request) => {
          return NextResponse.next();
        },
      };

      const middleware = createNEMO(config);

      // Should be compatible with Next.js <16 middleware signature
      expect(typeof middleware).toBe("function");

      const request = createMockRequest("/api/test");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      // Should return NextResponse, Response, null, undefined, or void
      expect(
        result === null ||
          result === undefined ||
          result instanceof NextResponse ||
          result instanceof Response,
      ).toBe(true);
    });

    it("should return compatible function signature for Next.js 16+", async () => {
      const config: MiddlewareConfig = {
        "/api": async (request) => {
          return NextResponse.next();
        },
      };

      const proxy = createNEMO(config);

      // Should be compatible with Next.js 16+ proxy signature
      expect(typeof proxy).toBe("function");

      const request = createMockRequest("/api/test");
      const event = createMockEvent();

      const result = await proxy(request, event as any);

      // Should return NextResponse, Response, null, undefined, or void
      expect(
        result === null ||
          result === undefined ||
          result instanceof NextResponse ||
          result instanceof Response,
      ).toBe(true);
    });
  });
});

