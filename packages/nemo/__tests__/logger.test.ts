import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { Logger } from "../src/logger";

describe("Logger", () => {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  let consoleLogSpy: typeof console.log;
  let consoleErrorSpy: typeof console.error;

  beforeEach(() => {
    consoleLogSpy = mock((...args: any[]) => {});
    consoleErrorSpy = mock((...args: any[]) => {});
    console.log = consoleLogSpy;
    console.error = consoleErrorSpy;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  test("should not log when debug is disabled", () => {
    const logger = new Logger(false);
    logger.log("test message");
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  test("should log when debug is enabled", () => {
    const logger = new Logger(true);
    logger.log("test message");
    expect(consoleLogSpy).toHaveBeenCalledWith("[NEMO]", "test message");
  });

  test("should log multiple arguments", () => {
    const logger = new Logger(true);
    logger.log("test message", { data: 123 }, "extra");
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[NEMO]",
      "test message",
      { data: 123 },
      "extra",
    );
  });

  test("should always log errors regardless of debug mode", () => {
    const debugLogger = new Logger(true);
    const nonDebugLogger = new Logger(false);
    const error = new Error("test error");

    debugLogger.error("error message", error);
    nonDebugLogger.error("error message", error);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[NEMO]",
      "error message",
      error,
    );
  });
});
