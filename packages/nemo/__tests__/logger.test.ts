import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { Logger } from "../src/logger";

describe("Logger", () => {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  let consoleLogSpy: typeof console.log;
  let consoleErrorSpy: typeof console.error;
  let consoleWarnSpy: typeof console.warn;

  beforeEach(() => {
    consoleLogSpy = mock((...args: any[]) => {});
    consoleErrorSpy = mock((...args: any[]) => {});
    consoleWarnSpy = mock((...args: any[]) => {});
    console.log = consoleLogSpy;
    console.error = consoleErrorSpy;
    console.warn = consoleWarnSpy;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
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

  test("should always log warnings regardless of debug mode", () => {
    const debugLogger = new Logger(true);
    const nonDebugLogger = new Logger(false);

    debugLogger.warn("warning message", { details: "test" });
    nonDebugLogger.warn("warning message", { details: "test" });

    expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    expect(consoleWarnSpy).toHaveBeenCalledWith("[NEMO]", "warning message", {
      details: "test",
    });
  });

  test("should handle empty arguments", () => {
    const logger = new Logger(true);

    logger.log();
    logger.error();
    logger.warn();

    expect(consoleLogSpy).toHaveBeenCalledWith("[NEMO]");
    expect(consoleErrorSpy).toHaveBeenCalledWith("[NEMO]");
    expect(consoleWarnSpy).toHaveBeenCalledWith("[NEMO]");
  });

  test("should handle undefined and null arguments", () => {
    const logger = new Logger(true);

    logger.log(undefined, null);
    logger.error(undefined, null);
    logger.warn(undefined, null);

    expect(consoleLogSpy).toHaveBeenCalledWith("[NEMO]", undefined, null);
    expect(consoleErrorSpy).toHaveBeenCalledWith("[NEMO]", undefined, null);
    expect(consoleWarnSpy).toHaveBeenCalledWith("[NEMO]", undefined, null);
  });
});
