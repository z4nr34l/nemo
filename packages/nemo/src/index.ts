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

export interface MiddlewareFunctionProps {
  request: NextRequest;
  event: NemoEvent;
}

export type NewMiddleware = (
  props: MiddlewareFunctionProps,
) => MiddlewareReturn | Promise<MiddlewareReturn>;

export type MiddlewareFunction = NextMiddleware | NewMiddleware;

export type MiddlewareConfig = Record<
  string,
  MiddlewareFunction | MiddlewareFunction[]
>;

export class NEMO {
  constructor(
    middlewares: MiddlewareConfig,
    globalMiddleware?: Partial<
      Record<"before" | "after", MiddlewareFunction | MiddlewareFunction[]>
    >,
  ) {
    return async (request: NextRequest, event: NextFetchEvent) => {
      console.log("[NEMO]");

      return NextResponse.next();
    };
  }
}

/**
 * @deprecated Use `new NEMO()` instead. Example: `export const middleware = new NEMO(pathMiddlewareMap, globalMiddleware)`
 */
export function createMiddleware(
  middlewares: MiddlewareConfig,
  globalMiddleware?: Partial<
    Record<"before" | "after", MiddlewareFunction | MiddlewareFunction[]>
  >,
) {
  console.warn(
    "[WARN] `createMiddleware` is deprecated. Use `new NEMO()` instead.",
  );
  return new NEMO(middlewares, globalMiddleware);
}
