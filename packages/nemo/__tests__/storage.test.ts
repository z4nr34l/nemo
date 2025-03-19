import { beforeEach, describe, expect, test } from "bun:test";
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
