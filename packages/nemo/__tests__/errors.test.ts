import { describe, expect, test } from "bun:test";
import type { MiddlewareMetadata } from "../dist";
import { NemoMiddlewareError } from "../src/errors";

describe("NemoMiddlewareError", () => {
  test("should create error with context", () => {
    const metadata = {
      chain: "main",
      index: 0,
      pathname: "/test",
      routeKey: "/test",
    } satisfies MiddlewareMetadata;
    const originalError = new Error("Test error");

    const error = new NemoMiddlewareError(
      "Test message",
      metadata,
      originalError,
    );

    expect(error.message).toBe(
      "Test message [main chain at path /test (matched by /test), index 0]",
    );
    expect(error.metadata).toEqual(metadata);
    expect(error.originalError).toBe(originalError);
  });

  test("should create error without original error", () => {
    const metadata = {
      chain: "main",
      index: 0,
      pathname: "/test",
      routeKey: "/test",
    } satisfies MiddlewareMetadata;

    const error = new NemoMiddlewareError("Test message", metadata);

    expect(error.message).toBe(
      "Test message [main chain at path /test (matched by /test), index 0]",
    );
    expect(error.metadata).toEqual(metadata);
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
