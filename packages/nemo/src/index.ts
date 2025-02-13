import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";
import { match, pathToRegexp } from "path-to-regexp";

type MiddlewareReturn = Response | NextResponse | undefined | void;

export type NextMiddleware = (
  request: NextRequest,
  event: NextFetchEvent
) => MiddlewareReturn | Promise<MiddlewareReturn>;

export type MiddlewareContext = Map<string, unknown>;

/**
 * Properties passed to middleware functions.
 */
export interface MiddlewareFunctionProps {
  request: NextRequest;
  response?: Response;
  context: MiddlewareContext;
  event: NextFetchEvent;
  params: () => Partial<Record<string, string | string[]>>;
  forward: (response: MiddlewareReturn) => void;
}

export type NewMiddleware = (
  props: MiddlewareFunctionProps
) => MiddlewareReturn | Promise<MiddlewareReturn>;

export type MiddlewareFunction = NextMiddleware | NewMiddleware;

export type MiddlewareConfig = Record<
  string,
  MiddlewareFunction | MiddlewareFunction[]
>;

/**
 * Checks if the given middleware function is a legacy middleware.
 * @param middleware - The middleware function to check.
 * @returns True if the middleware is a legacy middleware, false otherwise.
 */
function isLegacyMiddleware(
  middleware: MiddlewareFunction
): middleware is NextMiddleware {
  return middleware.length === 2;
}

/**
 * Forwards the response to the next middleware function.
 * @param middleware - The middleware function to forward to.
 * @param props - The properties to pass to the middleware function.
 */
export async function forward(
  middleware: MiddlewareFunction,
  props: MiddlewareFunctionProps
): Promise<void> {
  const response = isLegacyMiddleware(middleware)
    ? await middleware(props.request, props.event)
    : await middleware(props);
  props.response = response instanceof Response ? response : undefined;
  props.forward(response);
}

/**
 * Executes the given middleware function.
 * @param middleware - The middleware function to execute.
 * @param props - The properties to pass to the middleware function.
 */
async function executeMiddleware(
  middleware: MiddlewareFunction,
  props: MiddlewareFunctionProps
): Promise<MiddlewareReturn> {
  const response = isLegacyMiddleware(middleware)
    ? await middleware(props.request, props.event)
    : await middleware(props);
  return response instanceof Response ? response : undefined;
}

/**
 * Creates a middleware function that executes the given middleware functions.
 * @param pathMiddlewareMap - The map of paths to middleware functions.
 * @param globalMiddleware - The global middleware functions to execute
 */
export function createMiddleware(
  pathMiddlewareMap: MiddlewareConfig,
  globalMiddleware?: Partial<
    Record<"before" | "after", MiddlewareFunction | MiddlewareFunction[]>
  >
): NextMiddleware {
  return async (
    request: NextRequest,
    event: NextFetchEvent
  ): Promise<NextResponse | Response> => {
    const path = request.nextUrl.pathname || "/";
    const context: MiddlewareContext = new Map<string, unknown>();
    const finalHeaders = new Headers(request.headers);
    let _response;

    let beforeGlobalMiddleware: MiddlewareFunction[] = [];
    if (globalMiddleware?.before) {
      beforeGlobalMiddleware = Array.isArray(globalMiddleware.before)
        ? globalMiddleware.before
        : [globalMiddleware.before];
    }

    let afterGlobalMiddleware: MiddlewareFunction[] = [];
    if (globalMiddleware?.after) {
      afterGlobalMiddleware = Array.isArray(globalMiddleware.after)
        ? globalMiddleware.after
        : [globalMiddleware.after];
    }

    const allMiddlewareFunctions = [
      ...beforeGlobalMiddleware,
      ...Object.entries(pathMiddlewareMap)
        .filter(([key]) => matchesPath(key, path))
        .flatMap(([key, middlewareFunctions]) => {
          return Array.isArray(middlewareFunctions)
            ? middlewareFunctions.map((middleware) => ({
                middleware,
                pattern: key,
              }))
            : [{ middleware: middlewareFunctions, pattern: key }];
        }),
      ...afterGlobalMiddleware,
    ];

    for (const middlewareItem of allMiddlewareFunctions) {
      const middleware =
        "pattern" in middlewareItem
          ? middlewareItem.middleware
          : middlewareItem;

      const pattern =
        "pattern" in middlewareItem ? middlewareItem.pattern : path;

      const middlewareResponse = await executeMiddleware(middleware, {
        request,
        response: _response,
        event,
        context,
        params: () => {
          const matchFn = match(pattern);
          const matchResult = matchFn(path);
          return matchResult ? matchResult.params : {};
        },
        forward: (response: MiddlewareReturn) => {
          if (response instanceof Response) {
            response.headers.forEach((value, key) => {
              finalHeaders.set(key, value);
            });
            if (response instanceof NextResponse) {
              response.cookies
                .getAll()
                .forEach((cookie) =>
                  request.cookies.set(cookie.name, cookie.value)
                );
            }
          }
          _response = response instanceof Response ? response : undefined;
        },
      });
      if (middlewareResponse instanceof Response) return middlewareResponse;
    }

    return NextResponse.next({
      request: {
        headers: finalHeaders,
      },
    });
  };
}

/**
 * Checks if the given path matches the given pattern.
 * @param pattern - The pattern to match.
 * @param path - The path to check.
 */
function matchesPath(pattern: string, path: string): boolean {
  return pathToRegexp(pattern).test(path);
}
