import { type NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { pathToRegexp } from 'path-to-regexp';

type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> &
  U[keyof U];

export type NextMiddleware = (
  request: NextRequest,
  event: NextFetchEvent,
) => Response | NextResponse | Promise<Response | NextResponse>;

export interface MiddlewareContext extends Map<string, unknown> {
  cookies?: Map<string, ResponseCookie>;
  headers?: Headers;
}

export interface ResponseCookie {
  name: string;
  value: string;
  options?: {
    path?: string;
    domain?: string;
    maxAge?: number;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  };
}

export interface MiddlewareFunctionProps {
  request: NextRequest;
  context: MiddlewareContext;
  event: NextFetchEvent;
}

export type NewMiddleware = (
  props: MiddlewareFunctionProps,
) => NextResponse | Response | Promise<NextResponse | Response>;

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

function applyContextToResponse(
  response: NextResponse | Response,
  context: MiddlewareContext,
): NextResponse {
  let nextResponse =
    response instanceof NextResponse
      ? response
      : NextResponse.next({
          request: {
            headers: new Headers(response.headers),
          },
        });

  context.cookies?.forEach((cookie) => {
    nextResponse.cookies.set(cookie.name, cookie.value, cookie.options);
  });

  if (context.headers) {
    const newHeaders = new Headers(nextResponse.headers);
    context.headers.forEach((value, key) => {
      newHeaders.set(key, value);
    });

    nextResponse = NextResponse.next({
      request: {
        headers: newHeaders,
      },
    });

    context.cookies?.forEach((cookie) => {
      nextResponse.cookies.set(cookie.name, cookie.value, cookie.options);
    });
  }

  return nextResponse;
}

async function executeMiddleware(
  middleware: MiddlewareFunction,
  props: MiddlewareFunctionProps,
): Promise<NextResponse | Response> {
  const response = isLegacyMiddleware(middleware)
    ? await middleware(props.request, props.event)
    : await middleware(props);

  return applyContextToResponse(response, props.context);
}

export function createMiddleware(
  pathMiddlewareMap: MiddlewareConfig,
  globalMiddleware?: AtLeastOne<
    Record<'before' | 'after', MiddlewareFunction | MiddlewareFunction[]>
  >,
): NextMiddleware {
  const context: MiddlewareContext = new Map<string, unknown>();
  context.cookies = new Map<string, ResponseCookie>();
  context.headers = new Headers();

  return async (
    request: NextRequest,
    event: NextFetchEvent,
  ): Promise<NextResponse | Response> => {
    const path = request.nextUrl.pathname || '/';

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
      const middlewareProps = {
        request,
        event,
        context,
      };

      const response = await executeMiddleware(middleware, middlewareProps);

      if (response instanceof NextResponse || response instanceof Response) {
        return applyContextToResponse(response, context);
      }
    }

    return applyContextToResponse(NextResponse.next(), context);
  };
}

function matchesPath(pattern: string, path: string): boolean {
  return pathToRegexp(pattern).regexp.test(path);
}
