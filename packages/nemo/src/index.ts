import { type NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { pathToRegexp } from 'path-to-regexp';

type MiddlewareReturn = Response | NextResponse | void;

export type NextMiddleware = (
  request: NextRequest,
  event: NextFetchEvent,
) => MiddlewareReturn | Promise<MiddlewareReturn>;

export interface MiddlewareContext extends Map<string, unknown> {}

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
 * Checks if the middleware is a legacy middleware.
 *
 * @param {MiddlewareFunction} middleware - The middleware function to check.
 * @returns {boolean} - True if the middleware is a legacy middleware, false otherwise.
 */
function isLegacyMiddleware(
  middleware: MiddlewareFunction,
): middleware is NextMiddleware {
  return middleware.length === 2;
}

/**
 * Forwards the request to the next middleware in the chain.
 *
 * @param {MiddlewareFunction} middleware - The middleware function to execute.
 * @param {MiddlewareFunctionProps} props - The properties to pass to the middleware function.
 */
async function forward(
  middleware: MiddlewareFunction,
  props: MiddlewareFunctionProps,
): Promise<void> {
  const response = isLegacyMiddleware(middleware)
    ? await middleware(props.request, props.event)
    : await middleware(props);
  props.forward(response);
}

/**
 * Executes the middleware function and returns the response if it is a Response or NextResponse.
 *
 * @param {MiddlewareFunction} middleware - The middleware function to execute.
 * @param {MiddlewareFunctionProps} props - The properties to pass to the middleware function.
 * @returns {Promise<MiddlewareReturn>} - The response from the middleware function.
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
 * Creates a middleware function that executes a series of middleware functions based on the request path.
 *
 * @param {MiddlewareConfig} pathMiddlewareMap - The configuration object mapping paths to middleware functions.
 * @param {AtLeastOne<Record<'before' | 'after', MiddlewareFunction | MiddlewareFunction[]>>} [globalMiddleware] - Optional global middleware to execute before and after the path-specific middleware.
 * @returns {NextMiddleware} - The created middleware function.
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

    const beforeGlobalMiddleware = globalMiddleware?.before
      ? Array.isArray(globalMiddleware.before)
        ? globalMiddleware.before
        : [globalMiddleware.before]
      : [];

    const afterGlobalMiddleware = globalMiddleware?.after
      ? Array.isArray(globalMiddleware.after)
        ? globalMiddleware.after
        : [globalMiddleware.after]
      : [];

    const allMiddlewareFunctions = [
      ...beforeGlobalMiddleware,
      ...Object.entries(pathMiddlewareMap)
        .filter(([key]) => matchesPath(key, path))
        .flatMap(([, middlewareFunctions]) => middlewareFunctions),
      ...afterGlobalMiddleware,
    ];

    for (const middleware of allMiddlewareFunctions) {
      const response = await executeMiddleware(middleware, {
        request,
        event,
        context,
        forward: (response: MiddlewareReturn) => {
          if (response instanceof Response) {
            response.headers.forEach((value, key) =>
              request.headers.set(key, value),
            );
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
      if (response instanceof Response) return response;
    }

    return NextResponse.next({ request, headers: request.headers });
  };
}

/**
 * Checks if the given path matches the specified pattern.
 *
 * @param {string} pattern - The pattern to match against.
 * @param {string} path - The path to check.
 * @returns {boolean} - True if the path matches the pattern, false otherwise.
 */
function matchesPath(pattern: string, path: string): boolean {
  return pathToRegexp(pattern).regexp.test(path);
}
