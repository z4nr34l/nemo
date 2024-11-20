import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from 'next/server';
import { pathToRegexp } from 'path-to-regexp';

type MiddlewareReturn = Response | NextResponse | undefined | void;

export type NextMiddleware = (
  request: NextRequest,
  event: NextFetchEvent,
) => MiddlewareReturn | Promise<MiddlewareReturn>;

export type MiddlewareContext = Map<string, unknown>;

/**
 * Properties passed to middleware functions.
 */
export interface MiddlewareFunctionProps {
  request: NextRequest;
  context: MiddlewareContext;
  event: NextFetchEvent;
  forward: (response: MiddlewareReturn) => void;
}

export type NewMiddleware = (
  props: MiddlewareFunctionProps,
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
  middleware: MiddlewareFunction,
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
  props: MiddlewareFunctionProps,
): Promise<void> {
  const response = isLegacyMiddleware(middleware)
    ? await middleware(props.request, props.event)
    : await middleware(props);
  props.forward(response);
}

/**
 * Executes the given middleware function.
 * @param middleware - The middleware function to execute.
 * @param props - The properties to pass to the middleware function.
 */
async function executeMiddleware(
  middleware: MiddlewareFunction,
  props: MiddlewareFunctionProps,
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
    Record<'before' | 'after', MiddlewareFunction | MiddlewareFunction[]>
  >,
): NextMiddleware {
  return async (
    request: NextRequest,
    event: NextFetchEvent,
  ): Promise<NextResponse | Response> => {
    const path = request.nextUrl.pathname || '/';
    const context: MiddlewareContext = new Map<string, unknown>();

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
        .flatMap(([, middlewareFunctions]) => middlewareFunctions),
      ...afterGlobalMiddleware,
    ];

    const originalHeaders = new Headers(request.headers);

    for (const middleware of allMiddlewareFunctions) {
      const middlewareResponse = await executeMiddleware(middleware, {
        request,
        event,
        context,
        forward: (response: MiddlewareReturn) => {
          if (response instanceof Response) {
            response.headers.forEach((value, key) => {
              if (originalHeaders.get(key) !== value) {
                request.headers.set(key, value);
              }
            });
            if (response instanceof NextResponse) {
              response.cookies
                .getAll()
                .forEach((cookie) =>
                  request.cookies.set(cookie.name, cookie.value),
                );
            }
          }
        },
      });
      if (middlewareResponse instanceof Response) return middlewareResponse;
    }

    return NextResponse.next({
      request: {
        headers: new Headers(request.headers),
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
  return pathToRegexp(pattern).regexp.test(path);
}
