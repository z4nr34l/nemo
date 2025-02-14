import { describe, expect, test } from "bun:test";

describe("Context Map", () => {
  test("should create new context", () => {
    const context = new Map<string, unknown>();
    expect(context).toBeDefined();
    expect(context instanceof Map).toBe(true);
  });

  test("should maintain isolated contexts", () => {
    const context1 = new Map<string, unknown>();
    const context2 = new Map<string, unknown>();

    context1.set("test", "value1");
    context2.set("test", "value2");

    expect(context1.get("test")).toBe("value1");
    expect(context2.get("test")).toBe("value2");
  });

  test("should clear all entries", () => {
    const context = new Map<string, unknown>();
    context.set("test", "value");
    expect(context.get("test")).toBe("value");

    context.clear();
    expect(context.get("test")).toBeUndefined();
  });

  test("should handle different value types", () => {
    const context = new Map<string, unknown>();
    const testObj = { test: "value" };
    const testArr = [1, 2, 3];

    context.set("null", null);
    context.set("undefined", undefined);
    context.set("object", testObj);
    context.set("array", testArr);

    expect(context.get("null")).toBeNull();
    expect(context.get("undefined")).toBeUndefined();
    expect(context.get("object")).toEqual(testObj);
    expect(context.get("array")).toEqual(testArr);
  });

  test("should create new context from existing one", () => {
    const original = new Map<string, unknown>();
    original.set("key1", "value1");

    const copy = new Map(original);
    expect(copy.get("key1")).toBe("value1");

    // Modifications to copy should not affect original
    copy.set("key2", "value2");
    expect(original.has("key2")).toBe(false);
    expect(copy.get("key2")).toBe("value2");
  });
});
