import { type NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { pathToRegexp } from 'path-to-regexp';

export type NextMiddleware = (
  request: NextRequest,
  event: NextFetchEvent,
) => Response | NextResponse | Promise<Response | NextResponse>;

export interface MiddlewareFunctionProps {
  request: NextRequest;
  response: NextResponse | Response;
  context: Map<string, unknown>;
  event: NextFetchEvent;
}

export type MiddlewareFunction = (
  props: MiddlewareFunctionProps,
) => NextResponse | Response | Promise<NextResponse | Response>;

export type MiddlewareConfig = Record<
  string,
  MiddlewareFunction | MiddlewareFunction[]
>;

export function createMiddleware(
  pathMiddlewareMap: MiddlewareConfig,
  globalMiddleware?: Record<string, MiddlewareFunction | MiddlewareFunction[]>,
): NextMiddleware {
  const context = new Map<string, unknown>();

  return async (
    request: NextRequest,
    event: NextFetchEvent,
  ): Promise<NextResponse | Response> => {
    const path = request.nextUrl.pathname || '/';
    let response: NextResponse | Response = NextResponse.next();

    const beforeResult = await executeGlobalMiddleware(
      'before',
      request,
      event,
      context,
      globalMiddleware,
    );
    if (beforeResult) {
      return handleMiddlewareRedirect(request, beforeResult);
    }

    for (const [key, middlewareFunctions] of Object.entries(
      pathMiddlewareMap,
    )) {
      if (matchesPath(key, path)) {
        response = await executePathMiddleware(
          request,
          middlewareFunctions,
          response,
          event,
          context,
        );
      }
    }

    const afterResult = await executeGlobalMiddleware(
      'after',
      request,
      event,
      context,
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
  initialResponse: NextResponse | Response,
  event: NextFetchEvent,
  context: Map<string, unknown>,
): Promise<NextResponse | Response> {
  if (!Array.isArray(middlewareFunctions)) {
    // eslint-disable-next-line no-param-reassign -- Allow reassignment for type compatibility
    middlewareFunctions = [middlewareFunctions];
  }

  let response = initialResponse;

  for (const middleware of middlewareFunctions) {
    const result = await executeMiddleware(
      request,
      middleware,
      response,
      event,
      context,
    );
    if (result) {
      response = result;
      // eslint-disable-next-line no-param-reassign -- Allow reassignment for type compatibility
      request = updateRequestWithResponse(request, result);
    }
  }

  return response;
}

async function executeGlobalMiddleware(
  type: 'before' | 'after',
  request: NextRequest,
  event: NextFetchEvent,
  context: Map<string, unknown>,
  globalMiddleware?: Record<string, MiddlewareFunction | MiddlewareFunction[]>,
): Promise<NextResponse | Response> {
  const globalMiddlewareFns = globalMiddleware?.[type];
  if (globalMiddlewareFns) {
    const middlewareFunctions = Array.isArray(globalMiddlewareFns)
      ? globalMiddlewareFns
      : [globalMiddlewareFns];

    let currentResponse: NextResponse | Response = NextResponse.next();

    for (const middleware of middlewareFunctions) {
      const result = await executeMiddleware(
        request,
        middleware,
        currentResponse,
        event,
        context,
      );

      if (result) {
        if (result instanceof NextResponse) {
          result.cookies.getAll().forEach((cookie) => {
            request.cookies.set(cookie);
          });
        }

        if (isRedirect(result)) {
          request.headers.set(
            'x-redirect-url',
            result.headers.get('location') ?? '',
          );
          return result;
        }

        currentResponse = result;
      }
    }
  }
  return NextResponse.next();
}

async function executeMiddleware(
  request: NextRequest,
  middleware: MiddlewareFunction,
  currentResponse: NextResponse | Response,
  event: NextFetchEvent,
  context: Map<string, unknown>,
): Promise<NextResponse | Response | null> {
  const result = await middleware({
    request,
    response: currentResponse,
    event,
    context,
  });

  if (currentResponse) {
    currentResponse.headers.forEach((value, key) => {
      result.headers.set(key, value);
    });
  }

  if (result instanceof NextResponse) {
    result.cookies.getAll().forEach((cookie) => {
      request.cookies.set(cookie);
    });
  }

  if (isRedirect(result)) {
    request.headers.set('x-redirect-url', result.headers.get('location') ?? '');
    return result;
  }

  return result;
}

function matchesPath(pattern: string, path: string): boolean {
  return pathToRegexp(pattern).test(path);
}

function handleMiddlewareRedirect(
  request: NextRequest,
  response: NextResponse | Response,
): NextResponse | Response {
  const redirectUrl = request.headers.get('x-redirect-url');

  if (redirectUrl) {
    const redirectResponse = NextResponse.redirect(redirectUrl, {
      headers: request.headers,
    });

    request.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  return response;
}

function isRedirect(response: NextResponse | Response | null): boolean {
  return Boolean(
    response && [301, 302, 303, 307, 308].includes(response.status),
  );
}

function updateRequestWithResponse(
  request: NextRequest,
  response: NextResponse | Response,
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
  if (response instanceof NextResponse) {
    response.cookies.getAll().forEach((cookie) => {
      updatedRequest.cookies.set(cookie.name, cookie.value);
    });
  }

  return updatedRequest;
}
