import { describe, expect, test } from "bun:test";
import { ContextManager } from "../src/context-manager";

describe("ContextManager", () => {
  test("should create new context", () => {
    const manager = new ContextManager();
    const context = manager.get();

    expect(context).toBeDefined();
    expect(context instanceof Map).toBe(true);
  });

  test("should maintain isolated contexts", () => {
    const manager = new ContextManager();
    const context1 = manager.get();
    const context2 = manager.get();

    context1.set("test", "value1");
    context2.set("test", "value2");

    expect(context1.get("test")).toBe("value1");
    expect(context2.get("test")).toBe("value2");
  });

  test("should clear all contexts", () => {
    const manager = new ContextManager();
    const context = manager.get();

    context.set("test", "value");
    expect(context.get("test")).toBe("value");

    manager.clear();
    expect(context.get("test")).toBeUndefined();
  });

  test("should create context with correct type", () => {
    const manager = new ContextManager();
    const context = manager.get();

    context.set("string", "value");
    context.set("number", 123);
    context.set("object", { key: "value" });

    expect(context.get("string")).toBe("value");
    expect(context.get("number")).toBe(123);
    expect(context.get("object")).toEqual({ key: "value" });
  });

  test("should handle multiple context operations", () => {
    const manager = new ContextManager();
    const context = manager.get();

    context.set("key1", "value1");
    context.set("key2", "value2");
    context.delete("key1");
    context.set("key3", "value3");

    expect(context.has("key1")).toBe(false);
    expect(context.get("key2")).toBe("value2");
    expect(context.get("key3")).toBe("value3");
  });

  test("should maintain empty context after clear", () => {
    const manager = new ContextManager();
    const context = manager.get();

    context.set("test", "value");
    manager.clear();

    context.set("newTest", "newValue");
    expect(context.get("test")).toBeUndefined();
    expect(context.get("newTest")).toBe("newValue");
  });

  test("set should store values correctly", () => {
    const manager = new ContextManager();
    manager.set("key1", "value1");
    const context = manager.get();
    expect(context.get("key1")).toBe("value1");
  });

  test("set should override existing values", () => {
    const manager = new ContextManager();
    manager.set("key1", "value1");
    manager.set("key1", "value2");
    const context = manager.get();
    expect(context.get("key1")).toBe("value2");
  });

  test("set should handle different value types", () => {
    const manager = new ContextManager();
    const testObj = { test: "value" };
    const testArr = [1, 2, 3];

    manager.set("null", null);
    manager.set("undefined", undefined);
    manager.set("object", testObj);
    manager.set("array", testArr);

    const context = manager.get();
    expect(context.get("null")).toBeNull();
    expect(context.get("undefined")).toBeUndefined();
    expect(context.get("object")).toEqual(testObj);
    expect(context.get("array")).toEqual(testArr);
  });

  test("get should return a new map instance", () => {
    const manager = new ContextManager();
    manager.set("key1", "value1");

    const context1 = manager.get();
    const context2 = manager.get();

    expect(context1).not.toBe(context2);
    expect(context1.get("key1")).toBe("value1");
    expect(context2.get("key1")).toBe("value1");
  });

  test("modifications to returned map should not affect original store", () => {
    const manager = new ContextManager();
    manager.set("key1", "value1");

    const context = manager.get();
    context.set("key2", "value2");

    const newContext = manager.get();
    expect(newContext.has("key2")).toBe(false);
  });
});
