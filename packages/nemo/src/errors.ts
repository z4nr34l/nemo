import type { MiddlewareErrorContext } from "./types";

export class NemoMiddlewareError extends Error {
  constructor(
    message: string,
    public readonly context: MiddlewareErrorContext,
    public readonly originalError: unknown,
  ) {
    super(
      `${message} [${context.chain} chain at path ${context.pathname}${
        context.routeKey ? ` (matched by ${context.routeKey})` : ""
      }, index ${context.index}]`,
    );
  }
}
