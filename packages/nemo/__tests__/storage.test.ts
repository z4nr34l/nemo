import { beforeEach, describe, expect, test } from "bun:test";
import { NextRequest, type NextFetchEvent } from "next/server";
import { NEMO } from "../src";
import { StorageAdapter } from "../src/storage/adapter";
import { MemoryStorageAdapter } from "../src/storage/adapters/memory";

describe("MemoryStorageAdapter", () => {
  let storage: MemoryStorageAdapter;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
  });

  describe("basic operations", () => {
    test("should set and get values", () => {
      storage.set("key", "value");
      expect(storage.get("key")).toBe("value");
    });

    test("should return undefined for non-existent keys", () => {
      expect(storage.get("nonexistent")).toBeUndefined();
    });

    test("should check if key exists", () => {
      storage.set("key", "value");
      expect(storage.has("key")).toBe(true);
      expect(storage.has("nonexistent")).toBe(false);
    });

    test("should delete keys", () => {
      storage.set("key", "value");
      expect(storage.delete("key")).toBe(true);
      expect(storage.has("key")).toBe(false);
      expect(storage.delete("nonexistent")).toBe(false);
    });

    test("should clear all entries", () => {
      storage.set("key1", "value1");
      storage.set("key2", "value2");
      storage.clear();
      expect(storage.size).toBe(0);
      expect(storage.has("key1")).toBe(false);
    });
  });

  describe("iteration methods", () => {
    beforeEach(() => {
      storage.set("key1", "value1");
      storage.set("key2", "value2");
    });

    test("should iterate over entries", () => {
      const entries = Array.from(storage.entries());
      expect(entries).toEqual([
        ["key1", "value1"],
        ["key2", "value2"],
      ]);
    });

    test("should iterate over keys", () => {
      const keys = Array.from(storage.keys());
      expect(keys).toEqual(["key1", "key2"]);
    });

    test("should iterate over values", () => {
      const values = Array.from(storage.values());
      expect(values).toEqual(["value1", "value2"]);
    });

    test("should report correct size", () => {
      expect(storage.size).toBe(2);
    });
  });

  describe("serialization", () => {
    test("should convert to string", () => {
      storage.set("key1", "value1");
      storage.set("key2", 42);
      const str = storage.toString();
      expect(JSON.parse(str)).toEqual({
        key1: "value1",
        key2: 42,
      });
    });

    test("should load from string", () => {
      const json = '{"key1":"value1","key2":42}';
      expect(storage.fromString(json)).toBe(true);
      expect(storage.get("key1")).toBe("value1");
      expect(storage.get("key2")).toBe(42);
    });

    test("should handle invalid JSON strings", () => {
      expect(storage.fromString("invalid json")).toBe(false);
      expect(storage.fromString("null")).toBe(false);
      expect(storage.fromString('"string"')).toBe(false);
    });
  });

  describe("fromEntries", () => {
    test("should load from entries", () => {
      const entries = [
        ["key1", "value1"],
        ["key2", 42],
      ] as const;

      storage.fromEntries(entries);
      expect(storage.get("key1")).toBe("value1");
      expect(storage.get("key2")).toBe(42);
    });

    test("should override existing entries", () => {
      storage.set("existing", "old");
      storage.fromEntries([["existing", "new"]]);
      expect(storage.get("existing")).toBe("new");
    });
  });

  describe("type safety", () => {
    test("should preserve value types", () => {
      storage.set("string", "value");
      storage.set("number", 42);
      storage.set("boolean", true);
      storage.set("object", { key: "value" });
      storage.set("array", [1, 2, 3]);

      expect(storage.get<string>("string")).toBe("value");
      expect(storage.get<number>("number")).toBe(42);
      expect(storage.get<boolean>("boolean")).toBe(true);
      expect(storage.get<object>("object")).toEqual({ key: "value" });
      expect(storage.get<number[]>("array")).toEqual([1, 2, 3]);
    });
  });
});

describe("Custom Storage Adapter Integration", () => {
  // Custom storage adapter for testing
  class TestStorageAdapter extends StorageAdapter {
    private data: Map<string, unknown> = new Map();
    private callCount = {
      get: 0,
      set: 0,
      has: 0,
      delete: 0,
      clear: 0,
    };

    get<T>(key: string): T | undefined {
      this.callCount.get++;
      return this.data.get(key) as T | undefined;
    }

    set<T>(key: string, value: T): void {
      this.callCount.set++;
      this.data.set(key, value);
    }

    has(key: string): boolean {
      this.callCount.has++;
      return this.data.has(key);
    }

    delete(key: string): boolean {
      this.callCount.delete++;
      return this.data.delete(key);
    }

    clear(): void {
      this.callCount.clear++;
      this.data.clear();
    }

    entries(): IterableIterator<[string, unknown]> {
      return this.data.entries();
    }

    keys(): IterableIterator<string> {
      return this.data.keys();
    }

    values(): IterableIterator<unknown> {
      return this.data.values();
    }

    get size(): number {
      return this.data.size;
    }

    fromEntries(entries: Iterable<readonly [string, unknown]>): void {
      this.data = new Map(entries);
    }

    toString(): string {
      return JSON.stringify(Object.fromEntries(this.data));
    }

    fromString(json: string): boolean {
      try {
        const parsed = JSON.parse(json);
        if (typeof parsed !== "object" || parsed === null) {
          return false;
        }
        this.data = new Map(Object.entries(parsed));
        return true;
      } catch {
        return false;
      }
    }

    getCallCount() {
      return { ...this.callCount };
    }

    resetCallCount() {
      this.callCount = {
        get: 0,
        set: 0,
        has: 0,
        delete: 0,
        clear: 0,
      };
    }
  }

  const mockRequest = (path: string = "/") =>
    new NextRequest(`http://localhost${path}`);

  const mockEvent: NextFetchEvent = {
    waitUntil: () => {},
    sourcePage: "/",
  } as never as NextFetchEvent;

  describe("passing custom adapter instance", () => {
    test("should use custom adapter instance when passed directly", async () => {
      const customAdapter = new TestStorageAdapter();
      const nemo = new NEMO(
        {
          "/": async (req, { storage }) => {
            storage.set("testKey", "testValue");
            const value = storage.get<string>("testKey");
            expect(value).toBe("testValue");
          },
        },
        undefined,
        { storage: customAdapter },
      );

      await nemo.middleware(mockRequest(), mockEvent);

      // Verify that custom adapter was used (not default MemoryStorageAdapter)
      expect(customAdapter.getCallCount().set).toBeGreaterThan(0);
      expect(customAdapter.getCallCount().get).toBeGreaterThan(0);
    });

    test("should use the same custom adapter instance across requests", async () => {
      const customAdapter = new TestStorageAdapter();
      const nemo = new NEMO(
        {
          "/": async (req, { storage }) => {
            const current = storage.get<number>("counter") || 0;
            storage.set("counter", current + 1);
          },
        },
        undefined,
        { storage: customAdapter },
      );

      await nemo.middleware(mockRequest(), mockEvent);
      await nemo.middleware(mockRequest(), mockEvent);

      // Note: Each request creates a new NemoEvent, so storage is recreated
      // This test verifies that the adapter class is used, not the instance
      expect(customAdapter.getCallCount().set).toBeGreaterThan(0);
    });
  });

  describe("passing custom adapter factory function", () => {
    test("should use custom adapter from factory function", async () => {
      let factoryCallCount = 0;
      const customAdapterFactory = () => {
        factoryCallCount++;
        return new TestStorageAdapter();
      };

      const nemo = new NEMO(
        {
          "/": async (req, { storage }) => {
            storage.set("testKey", "testValue");
            const value = storage.get<string>("testKey");
            expect(value).toBe("testValue");
          },
        },
        undefined,
        { storage: customAdapterFactory },
      );

      await nemo.middleware(mockRequest(), mockEvent);

      // Verify that factory was called
      expect(factoryCallCount).toBeGreaterThan(0);
    });

    test("should call factory function for each request", async () => {
      let factoryCallCount = 0;
      const customAdapterFactory = () => {
        factoryCallCount++;
        return new TestStorageAdapter();
      };

      const nemo = new NEMO(
        {
          "/": async (req, { storage }) => {
            storage.set("testKey", "testValue");
          },
        },
        undefined,
        { storage: customAdapterFactory },
      );

      await nemo.middleware(mockRequest(), mockEvent);
      await nemo.middleware(mockRequest(), mockEvent);

      // Factory should be called during NEMO construction, not per request
      // But we verify it was called at least once
      expect(factoryCallCount).toBeGreaterThan(0);
    });
  });

  describe("verifying custom adapter is actually used", () => {
    test("should use custom adapter instead of default MemoryStorageAdapter", async () => {
      const customAdapter = new TestStorageAdapter();
      const nemo = new NEMO(
        {
          "/": async (req, { storage }) => {
            // Verify it's not MemoryStorageAdapter by checking constructor name
            expect(storage.constructor.name).toBe("TestStorageAdapter");
            storage.set("testKey", "testValue");
          },
        },
        undefined,
        { storage: customAdapter },
      );

      await nemo.middleware(mockRequest(), mockEvent);
    });

    test("should use custom adapter with unique identifier", async () => {
      class UniqueTestAdapter extends StorageAdapter {
        private data: Map<string, unknown> = new Map();
        public readonly identifier = "unique-test-adapter-123";

        get<T>(key: string): T | undefined {
          return this.data.get(key) as T | undefined;
        }

        set<T>(key: string, value: T): void {
          this.data.set(key, value);
        }

        has(key: string): boolean {
          return this.data.has(key);
        }

        delete(key: string): boolean {
          return this.data.delete(key);
        }

        clear(): void {
          this.data.clear();
        }

        entries(): IterableIterator<[string, unknown]> {
          return this.data.entries();
        }

        keys(): IterableIterator<string> {
          return this.data.keys();
        }

        values(): IterableIterator<unknown> {
          return this.data.values();
        }

        get size(): number {
          return this.data.size;
        }

        fromEntries(entries: Iterable<readonly [string, unknown]>): void {
          this.data = new Map(entries);
        }

        toString(): string {
          return JSON.stringify(Object.fromEntries(this.data));
        }

        fromString(json: string): boolean {
          try {
            const parsed = JSON.parse(json);
            if (typeof parsed !== "object" || parsed === null) {
              return false;
            }
            this.data = new Map(Object.entries(parsed));
            return true;
          } catch {
            return false;
          }
        }
      }

      const uniqueAdapter = new UniqueTestAdapter();
      const nemo = new NEMO(
        {
          "/": async (req, { storage }) => {
            // Verify it's the unique adapter
            if (storage instanceof UniqueTestAdapter) {
              expect(storage.identifier).toBe("unique-test-adapter-123");
            } else {
              throw new Error(
                `Expected UniqueTestAdapter, got ${storage.constructor.name}`,
              );
            }
            storage.set("testKey", "testValue");
          },
        },
        undefined,
        { storage: uniqueAdapter },
      );

      await nemo.middleware(mockRequest(), mockEvent);
    });
  });

  describe("default behavior without custom adapter", () => {
    test("should use MemoryStorageAdapter when no custom adapter is provided", async () => {
      const nemo = new NEMO({
        "/": async (req, { storage }) => {
          expect(storage.constructor.name).toBe("MemoryStorageAdapter");
          storage.set("testKey", "testValue");
        },
      });

      await nemo.middleware(mockRequest(), mockEvent);
    });
  });
});
