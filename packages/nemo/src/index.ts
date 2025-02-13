import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";

type MiddlewareReturn = Response | NextResponse | undefined | null | void;

export type NextMiddleware = (
  request: NextRequest,
  event: NextFetchEvent,
) => MiddlewareReturn | Promise<MiddlewareReturn>;

export type MiddlewareContext = Map<string, unknown>;

export interface NemoEvent extends NextFetchEvent {
  forward: (response: MiddlewareReturn, event: NemoEvent) => void;
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
    return async (request: NextRequest, event: NextFetchEvent) => {
      console.log("[NEMO]");

      return NextResponse.next();
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
