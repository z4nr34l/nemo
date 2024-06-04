import { NextRequest, NextResponse } from 'next/server';
import { pathToRegexp } from 'path-to-regexp';

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

export interface NextMiddlewareConfig {
  matcher: string[];
}

export function createMiddleware(
  pathMiddlewareMap: MiddlewareConfig,
  globalMiddleware?: Record<string, MiddlewareFunction>,
): MiddlewareFunction {
  return async (request: NextRequest): Promise<NextResponse> => {
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
    // eslint-disable-next-line no-param-reassign -- need to update function signature
    middlewareFunctions = [middlewareFunctions];
  }

  let response = initialResponse;

  for (const middleware of middlewareFunctions) {
    // eslint-disable-next-line no-await-in-loop -- need to wait for middleware to execute
    const result = await executeMiddleware(request, middleware, response);
    if (result) {
      response = result;

      // eslint-disable-next-line no-param-reassign -- need to update request with response
      request = updateRequestWithResponse(request, response);
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

  if (currentResponse) {
    currentResponse.headers.forEach((value, key) => {
      result.headers.set(key, value);
    });
  }

  if (isRedirect(result) || result.status >= 400) {
    return result;
  }

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
      if (result.cookies) {
        result.cookies.getAll().forEach((cookie) => {
          // eslint-disable-next-line @typescript-eslint/no-base-to-string -- need to append cookies to headers
          request.headers.append('set-cookie', cookie.toString());
        });
      }
      return result;
    }
  }
  return null;
}

function matchesPath(pattern: string, path: string): boolean {
  return pathToRegexp(pattern).test(path);
}

function handleMiddlewareRedirect(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const redirectUrl = request.headers.get('x-redirect-url');

  if (redirectUrl) {
    const redirectResponse = NextResponse.redirect(redirectUrl, {
      headers: request.headers, // Transfer original headers to the redirect response
    });

    // Copy cookies from the original request to the redirect response
    if (request.cookies) {
      request.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
    }

    return redirectResponse;
  }

  return response;
}

function isRedirect(response: NextResponse | null): boolean {
  return Boolean(
    response && [301, 302, 303, 307, 308].includes(response.status),
  );
}

function updateRequestWithResponse(
  request: NextRequest,
  response: NextResponse,
): NextRequest {
  const updatedHeaders = new Headers(request.headers);

  // Merge headers from the response into the request headers
  response.headers.forEach((value, key) => {
    updatedHeaders.set(key, value);
  });

  // Create a new URL object with the same parameters as the original request
  const updatedUrl = new URL(request.url);

  // Create a new NextRequest object with the updated headers
  const updatedRequest = new NextRequest(updatedUrl, {
    headers: updatedHeaders,
    method: request.method,
    body: request.body,
    referrer: request.referrer,
  });

  // Merge cookies from the response into the request cookies
  if (response.cookies) {
    response.cookies.getAll().forEach((cookie) => {
      updatedRequest.cookies.set(cookie.name, cookie.value);
    });
  }

  return updatedRequest;
}
