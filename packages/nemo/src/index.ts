import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";

export type NextMiddlewareResult =
  | NextResponse
  | Response
  | null
  | undefined
  | void;
export type NextMiddleware = (
  request: NextRequest,
  event: NextFetchEvent,
) => NextMiddlewareResult | Promise<NextMiddlewareResult>;

export type MiddlewareContext = Map<string, unknown>;

export interface NemoEvent extends NextFetchEvent {
  forward: (fn: NextMiddleware) => NextMiddlewareResult;
}

export type MiddlewareChain = NextMiddleware | NextMiddleware[];

export type MiddlewareConfig = Record<string, MiddlewareChain>;

export type GlobalMiddlewareConfig = Partial<
  Record<"before" | "after", MiddlewareChain>
>;

/**
 * NEMO Middleware
 * @param middlewares - Middleware configuration
 * @param globalMiddleware - Global middleware configuration
 * @returns NextMiddleware
 */
export class NEMO {
  constructor(
    middlewares: MiddlewareConfig,
    globalMiddleware?: GlobalMiddlewareConfig,
  ) {
    return async (
      request: NextRequest,
      event: NextFetchEvent,
    ): Promise<NextMiddlewareResult> => {
      console.log("[NEMO]");
    };
  }
}

/**
 * @deprecated Use `new NEMO()` instead. Example: `export const middleware = new NEMO(pathMiddlewareMap, globalMiddleware)`
 * Create middleware
 * @param middlewares - Middleware configuration
 * @param globalMiddleware - Global middleware configuration
 * @returns NextMiddleware
 */
export function createMiddleware(
  middlewares: MiddlewareConfig,
  globalMiddleware?: Partial<
    Record<"before" | "after", NextMiddleware | NextMiddleware[]>
  >,
) {
  console.warn(
    "[NEMO] `createMiddleware` is deprecated. Use `new NEMO()` instead.",
  );

  return new NEMO(middlewares, globalMiddleware);
}
