import { type NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { pathToRegexp } from 'path-to-regexp';

type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> &
  U[keyof U];

type MiddlewareReturn = Response | NextResponse | void;

export type NextMiddleware = (
  request: NextRequest,
  event: NextFetchEvent,
) => MiddlewareReturn | Promise<MiddlewareReturn>;

export interface MiddlewareContext extends Map<string, unknown> {}

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

function isLegacyMiddleware(
  middleware: MiddlewareFunction,
): middleware is NextMiddleware {
  return middleware.length === 2;
}

async function forward(
  middleware: MiddlewareFunction,
  props: MiddlewareFunctionProps,
): Promise<void> {
  let response: MiddlewareReturn | Promise<MiddlewareReturn>;

  if (isLegacyMiddleware(middleware)) {
    response = await middleware(props.request, props.event);
  } else {
    response = await middleware(props);
  }

  props.forward(response);
}

async function executeMiddleware(
  middleware: MiddlewareFunction,
  props: MiddlewareFunctionProps,
): Promise<MiddlewareReturn> {
  let response: MiddlewareReturn | Promise<MiddlewareReturn>;

  if (isLegacyMiddleware(middleware)) {
    response = await middleware(props.request, props.event);
  } else {
    response = await middleware(props);
  }

  if (response && response instanceof Response) {
    return response;
  }

  return undefined;
}

export function createMiddleware(
  pathMiddlewareMap: MiddlewareConfig,
  globalMiddleware?: AtLeastOne<
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
    let afterGlobalMiddleware: MiddlewareFunction[] = [];

    if (globalMiddleware?.before) {
      if (Array.isArray(globalMiddleware.before)) {
        beforeGlobalMiddleware = globalMiddleware.before.filter(Boolean).flat();
      } else {
        beforeGlobalMiddleware = [globalMiddleware.before]
          .filter(Boolean)
          .flat();
      }
    }

    if (globalMiddleware?.after) {
      if (Array.isArray(globalMiddleware.after)) {
        afterGlobalMiddleware = globalMiddleware.after.filter(Boolean).flat();
      } else {
        afterGlobalMiddleware = [globalMiddleware.after].filter(Boolean).flat();
      }
    }

    const allMiddlewareFunctions = [
      ...beforeGlobalMiddleware.flat(),
      ...Object.entries(pathMiddlewareMap)
        .filter(([key]) => matchesPath(key, path))
        .flatMap(([, middlewareFunctions]) => middlewareFunctions),
      ...afterGlobalMiddleware.flat(),
    ];

    for (const middleware of allMiddlewareFunctions) {
      const response = await executeMiddleware(middleware, {
        request,
        event,
        context,
        forward: (response: MiddlewareReturn) => {
          if (response && response instanceof Response) {
            response.headers.forEach((value, key) => {
              request.headers.set(key, value);
            });

            if (response instanceof NextResponse) {
              response.cookies.getAll().forEach((cookie) => {
                request.cookies.set(cookie.name, cookie.value);
              });
            }
          }
        },
      });

      if (response && response instanceof Response) {
        return response;
      }
    }

    return NextResponse.next({
      request,
      headers: request.headers,
    });
  };
}

function matchesPath(pattern: string, path: string): boolean {
  return pathToRegexp(pattern).regexp.test(path);
}
