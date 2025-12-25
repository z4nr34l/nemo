/**
 * Tests for issue #162: Custom StorageAdapter not being called inside NEMO middleware
 * https://github.com/z4nr34l/nemo/issues/162
 * 
 * This test reproduces the exact scenario from the issue to verify that
 * custom StorageAdapter methods are properly invoked.
 */

import { describe, expect, it } from "bun:test";
import { createNEMO, type MiddlewareConfig } from "../src";
import { NextRequest, NextResponse } from "next/server";
import { NemoEvent } from "../src/event";
import { StorageAdapter } from "../src/storage/adapter";

describe("Issue #162: Custom StorageAdapter not being called", () => {
  const createMockRequest = (pathname: string = "/"): NextRequest => {
    return new NextRequest(new URL(`http://localhost:3000${pathname}`));
  };

  const createMockEvent = (): NemoEvent => {
    return new NemoEvent(new Event("fetch") as any);
  };

  // Custom storage adapter that logs all method calls (reproducing the issue scenario)
  class LoggingStorageAdapter extends StorageAdapter {
    private store = new Map<string, unknown>();
    public logs: string[] = [];

    get<T>(key: string): T | undefined {
      this.logs.push(`MemoryStorageAdapter: get key=${key}`);
      return this.store.get(key) as T | undefined;
    }

    set<T>(key: string, value: T): void {
      this.logs.push(`MemoryStorageAdapter: set key=${key}, value= ${JSON.stringify(value)}`);
      this.store.set(key, value);
    }

    has(key: string): boolean {
      this.logs.push(`MemoryStorageAdapter: has key=${key}`);
      return this.store.has(key);
    }

    delete(key: string): boolean {
      this.logs.push(`MemoryStorageAdapter: delete key=${key}`);
      return this.store.delete(key);
    }

    clear(): void {
      this.logs.push(`MemoryStorageAdapter: clear`);
      this.store.clear();
    }

    entries(): IterableIterator<[string, unknown]> {
      return this.store.entries();
    }

    keys(): IterableIterator<string> {
      return this.store.keys();
    }

    values(): IterableIterator<unknown> {
      return this.store.values();
    }

    get size(): number {
      return this.store.size;
    }

    fromEntries(entries: Iterable<readonly [string, unknown]>): void {
      for (const [k, v] of entries) this.store.set(k, v);
    }

    toString(): string {
      return JSON.stringify([...this.store.entries()]);
    }

    fromString(json: string): boolean {
      try {
        const entries: [string, unknown][] = JSON.parse(json);
        this.fromEntries(entries);
        return true;
      } catch {
        return false;
      }
    }
  }

  it("should call custom StorageAdapter methods when passed as instance", async () => {
    const customAdapter = new LoggingStorageAdapter();
    const logs: string[] = [];

    const middlewares: MiddlewareConfig = {
      "/dashboard/:path*": async (request, { storage }) => {
        storage.set("adasd", "sadasd");
        const value = storage.get("adasd");
        logs.push(`Got from storage: ${value}`);
        return NextResponse.next();
      },
    };

    const middleware = createNEMO(middlewares, undefined, {
      debug: true,
      enableTiming: true,
      storage: customAdapter, // Pass instance directly
    });

    const request = createMockRequest("/dashboard/test");
    const event = createMockEvent();

    const result = await middleware(request, event as any);

    expect(result).toBeDefined();
    expect(result instanceof NextResponse).toBe(true);

    // Verify that adapter methods were called
    expect(customAdapter.logs.length).toBeGreaterThan(0);
    expect(customAdapter.logs.some(log => log.includes("set key=adasd"))).toBe(true);
    expect(customAdapter.logs.some(log => log.includes("get key=adasd"))).toBe(true);
    expect(logs).toContain("Got from storage: sadasd");
  });

  it("should call custom StorageAdapter methods when passed as factory function", async () => {
    const customAdapter = new LoggingStorageAdapter();
    const logs: string[] = [];

    const middlewares: MiddlewareConfig = {
      "/dashboard/:path*": async (request, { storage }) => {
        storage.set("test-key", "test-value");
        const value = storage.get("test-key");
        logs.push(`Got from storage: ${value}`);
        return NextResponse.next();
      },
    };

    const middleware = createNEMO(middlewares, undefined, {
      debug: true,
      enableTiming: true,
      storage: () => customAdapter, // Pass as factory function
    });

    const request = createMockRequest("/dashboard/test");
    const event = createMockEvent();

    const result = await middleware(request, event as any);

    expect(result).toBeDefined();
    expect(result instanceof NextResponse).toBe(true);

    // Verify that adapter methods were called
    expect(customAdapter.logs.length).toBeGreaterThan(0);
    expect(customAdapter.logs.some(log => log.includes("set key=test-key"))).toBe(true);
    expect(customAdapter.logs.some(log => log.includes("get key=test-key"))).toBe(true);
    expect(logs).toContain("Got from storage: test-value");
  });

  it("should use the same storage adapter instance across multiple middleware calls", async () => {
    const customAdapter = new LoggingStorageAdapter();

    const middlewares: MiddlewareConfig = {
      "/": async (request, { storage }) => {
        const counter = (storage.get<number>("counter") || 0) + 1;
        storage.set("counter", counter);
        return NextResponse.next();
      },
    };

    const middleware = createNEMO(middlewares, undefined, {
      storage: customAdapter,
    });

    const request1 = createMockRequest("/");
    const request2 = createMockRequest("/");
    const event1 = createMockEvent();
    const event2 = createMockEvent();

    await middleware(request1, event1 as any);
    await middleware(request2, event2 as any);

    // Verify that adapter was used
    expect(customAdapter.logs.length).toBeGreaterThan(0);
    expect(customAdapter.logs.filter(log => log.includes("set key=counter")).length).toBe(2);
  });

  it("should properly isolate storage between requests when using factory function", async () => {
    let adapterInstance: LoggingStorageAdapter | null = null;

    const middlewares: MiddlewareConfig = {
      "/": async (request, { storage }) => {
        storage.set("request-id", "request-1");
        return NextResponse.next();
      },
    };

    const middleware = createNEMO(middlewares, undefined, {
      storage: () => {
        adapterInstance = new LoggingStorageAdapter();
        return adapterInstance;
      },
    });

    const request = createMockRequest("/");
    const event = createMockEvent();

    await middleware(request, event as any);

    // Verify that factory function was called and adapter was used
    expect(adapterInstance).not.toBeNull();
    expect(adapterInstance!.logs.length).toBeGreaterThan(0);
    expect(adapterInstance!.logs.some(log => log.includes("set key=request-id"))).toBe(true);
  });

  it("should reproduce exact scenario from issue #162", async () => {
    const customAdapter = new LoggingStorageAdapter();
    const consoleLogs: string[] = [];

    // Mock console.log to capture output
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      consoleLogs.push(args.join(" "));
      originalLog(...args);
    };

    try {
      const middlewares: MiddlewareConfig = {
        "/dashboard/:path*": async (request, { storage }) => {
          const token = request.cookies.get("better-auth.session_token")?.value;
          if (!token) {
            return NextResponse.redirect(new URL("/sign-in", request.url));
          }

          storage.set("adasd", "sadasd");
          const value = storage.get("adasd");
          consoleLogs.push(`Got from storage: ${value}`);
          return NextResponse.next();
        },
      };

      const middleware = createNEMO(middlewares, undefined, {
        debug: true,
        enableTiming: true,
        storage: customAdapter,
      });

      const request = createMockRequest("/dashboard/test");
      request.cookies.set("better-auth.session_token", "test-token");
      const event = createMockEvent();

      const result = await middleware(request, event as any);

      expect(result).toBeDefined();
      expect(result instanceof NextResponse).toBe(true);

      // Verify that adapter methods were called (this is what was missing in the issue)
      expect(customAdapter.logs.length).toBeGreaterThan(0);
      expect(customAdapter.logs.some(log => log.includes("MemoryStorageAdapter: set key=adasd"))).toBe(true);
      expect(customAdapter.logs.some(log => log.includes("MemoryStorageAdapter: get key=adasd"))).toBe(true);
      expect(consoleLogs).toContain("Got from storage: sadasd");
    } finally {
      console.log = originalLog;
    }
  });
});

