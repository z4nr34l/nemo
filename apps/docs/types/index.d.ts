import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

type NextMiddleware = (
  request: NextRequest,
  event: NextFetchEvent
) => Response | NextResponse | Promise<Response | NextResponse>;
interface MiddlewareFunctionProps {
  request: NextRequest;
  response: NextResponse;
  context: Map<string, unknown>;
  event: NextFetchEvent;
}
type MiddlewareFunction = (
  props: MiddlewareFunctionProps
) => NextResponse | Response | Promise<NextResponse | Response>;
type MiddlewareConfig = Record<
  string,
  MiddlewareFunction | MiddlewareFunction[]
>;
declare function createMiddleware(
  pathMiddlewareMap: MiddlewareConfig,
  globalMiddleware?: Record<
    "before" | "after",
    MiddlewareFunction | MiddlewareFunction[]
  >
): NextMiddleware;

export {
  type MiddlewareConfig,
  type MiddlewareFunction,
  type MiddlewareFunctionProps,
  type NextMiddleware,
  createMiddleware,
};
