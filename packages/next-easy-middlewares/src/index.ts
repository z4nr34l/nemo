import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Define custom middleware types
export type CustomMiddleware<T = any> = (
  request: any,
  ...args: any
) => T | Promise<T>;

export type MiddlewareFunction = (
  request: NextRequest,
) => Promise<NextResponse>;

export type MiddlewareConfig = Record<
  string,
  | MiddlewareFunction
  | CustomMiddleware
  | MiddlewareFunction[]
  | CustomMiddleware[]
>;

export function createMiddleware(
  pathMiddlewareMap: MiddlewareConfig,
  globalMiddleware?: Record<string, MiddlewareFunction>,
): MiddlewareFunction {
  return async function middleware(
    request: NextRequest,
  ): Promise<NextResponse> {
    const path = request.nextUrl.pathname || '/';
    let response: NextResponse | null = null;

    const beforeResult = await executeGlobalMiddleware(
      'before',
      request,
      globalMiddleware,
    );
    if (beforeResult) {
      return handleMiddlewareRedirect(request, beforeResult);
    }

    for (const [key, middlewareFunctions] of Object.entries(
      pathMiddlewareMap,
    )) {
      if (matchesPath(key, path)) {
        response = await executePathMiddleware(request, middlewareFunctions);
      }
    }

    const afterResult = await executeGlobalMiddleware(
      'after',
      request,
      globalMiddleware,
    );
    if (afterResult) {
      return handleMiddlewareRedirect(request, afterResult);
    }

    return response ?? NextResponse.next();
  };
}

async function executePathMiddleware(
  request: NextRequest,
  middlewareFunctions: MiddlewareFunction | MiddlewareFunction[],
): Promise<NextResponse> {
  const middlewares = Array.isArray(middlewareFunctions)
    ? middlewareFunctions
    : [middlewareFunctions];

  let response = NextResponse.next({
    request,
  });

  for (const middlewareFunction of middlewares) {
    const result = await executeMiddleware(request, middlewareFunction);

    // If the middleware returns a response, use it for the next middleware
    if (result instanceof NextResponse) {
      response = result;

      if (isRedirect(result) && result.headers.get('location')) {
        request.headers.set(
          'x-redirect-url',
          String(result.headers.get('location')),
        );
      }
    }
  }

  // Return the final response after all middleware have executed
  return handleMiddlewareRedirect(request, response);
}

async function executeGlobalMiddleware(
  type: 'before' | 'after',
  request: NextRequest,
  globalMiddleware?: Record<string, MiddlewareFunction>,
): Promise<NextResponse | null> {
  const globalMiddlewareFn = globalMiddleware?.[type];
  if (globalMiddlewareFn) {
    const result = await executeMiddleware(request, globalMiddlewareFn);
    if (result && isRedirect(result)) {
      request.headers.set(
        'x-redirect-url',
        result.headers.get('location') || '',
      );
      result.cookies.getAll().forEach((cookie) => {
        request.headers.append('set-cookie', cookie.toString());
      });
      return result;
    }
  }
  return null;
}

async function executeMiddleware(
  request: NextRequest,
  middleware: MiddlewareFunction,
): Promise<NextResponse | null> {
  const result = await middleware(request);
  return result !== NextResponse.next() ? result : null;
}

function matchesPath(pattern: string, path: string): boolean {
  if (pattern.startsWith('regex:')) {
    return new RegExp(pattern.replace('regex:', '')).test(path);
  } else if (pattern.includes(':path*')) {
    return path.startsWith(pattern.replace(/:path\\*/, ''));
  }
  const dynamicPathRegex = new RegExp(
    `^${pattern.replace(/\\[.*?\\]/g, '([^/]+?)')}$`,
  );
  return dynamicPathRegex.test(path);
}

function handleMiddlewareRedirect(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const redirect = request.headers.get('x-redirect-url');

  if (redirect) {
    const redirectResponse = NextResponse.redirect(redirect, {
      headers: request.headers,
    });

    // Copy cookies from the original response to the redirect response
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  return response;
}

function isRedirect(response: NextResponse | null): boolean {
  return Boolean(
    response && [301, 302, 303, 307, 308].includes(response.status),
  );
}
