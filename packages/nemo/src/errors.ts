import type { MiddlewareMetadata } from "./types";

export class NemoMiddlewareError extends Error {
  constructor(
    message: string,
    public readonly metadata: MiddlewareMetadata,
    public readonly originalError?: unknown,
  ) {
    super(
      `${message} [${metadata.chain} chain at path ${metadata.pathname}${
        metadata.routeKey ? ` (matched by ${metadata.routeKey})` : ""
      }, index ${metadata.index}]`,
    );
  }
}
