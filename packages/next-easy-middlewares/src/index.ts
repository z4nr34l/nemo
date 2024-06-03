import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- We need to accept literally any values in type assertion
export type CustomMiddleware<T = any> = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- We need to accept any request type
  request: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- We need to accept any additional props for external packages
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
        // eslint-disable-next-line no-await-in-loop -- need to wait for middleware to execute
        response = await executePathMiddleware(
          request,
          middlewareFunctions,
          response,
        );
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
  initialResponse: NextResponse | null,
): Promise<NextResponse | null> {
  if (!Array.isArray(middlewareFunctions)) {
    // eslint-disable-next-line no-param-reassign -- need to reassign middlewareFunctions
    middlewareFunctions = [middlewareFunctions];
  }

  let response = initialResponse;

  for (const middleware of middlewareFunctions) {
    // eslint-disable-next-line no-await-in-loop -- need to wait for middleware to execute
    const result = await executeMiddleware(request, middleware, response);
    if (result) {
      response = result;
    }
  }

  return response;
}

async function executeMiddleware(
  request: NextRequest,
  middleware: MiddlewareFunction,
  currentResponse: NextResponse | null,
): Promise<NextResponse | null> {
  const result = await middleware(request);

  // Merge headers from the current response into the result
  if (currentResponse) {
    currentResponse.headers.forEach((value, key) => {
      result.headers.set(key, value);
    });
  }

  // If the result is a redirect or an error status, return it immediately
  if (isRedirect(result) || result.status >= 400) {
    return result;
  }

  // Otherwise, return the result
  return result;
}

async function executeGlobalMiddleware(
  type: 'before' | 'after',
  request: NextRequest,
  globalMiddleware?: Record<string, MiddlewareFunction>,
): Promise<NextResponse | null> {
  const globalMiddlewareFn = globalMiddleware?.[type];
  if (globalMiddlewareFn) {
    const result = await executeMiddleware(request, globalMiddlewareFn, null);
    if (result && isRedirect(result)) {
      request.headers.set(
        'x-redirect-url',
        result.headers.get('location') || '',
      );
      result.cookies.getAll().forEach((cookie) => {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string -- need to append cookies to headers
        request.headers.append('set-cookie', cookie.toString());
      });
      return result;
    }
  }
  return null;
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
