import { describe, expect, test } from "bun:test";
import { NemoMiddlewareError } from "../src/errors";

describe("NemoMiddlewareError", () => {
  test("should create error with context", () => {
    const context = {
      chain: "main",
      index: 0,
      pathname: "/test",
      routeKey: "/test",
    };
    const originalError = new Error("Test error");

    const error = new NemoMiddlewareError(
      "Test message",
      context,
      originalError,
    );

    expect(error.message).toBe(
      "Test message [main chain at path /test (matched by /test), index 0]",
    );
    expect(error.context).toEqual(context);
    expect(error.originalError).toBe(originalError);
  });

  test("should create error without original error", () => {
    const context = {
      chain: "main",
      index: 0,
      pathname: "/test",
      routeKey: "/test",
    };

    const error = new NemoMiddlewareError("Test message", context);

    expect(error.message).toBe(
      "Test message [main chain at path /test (matched by /test), index 0]",
    );
    expect(error.context).toEqual(context);
    expect(error.originalError).toBeUndefined();
  });

  test("should be instance of Error", () => {
    const error = new NemoMiddlewareError("Test message", {
      chain: "main",
      index: 0,
      pathname: "/test",
      routeKey: "/test",
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(NemoMiddlewareError);
  });
});
