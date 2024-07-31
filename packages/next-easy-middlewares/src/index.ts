import { type NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { pathToRegexp } from 'path-to-regexp';

export type NextMiddleware = (
  request: NextRequest,
  event: NextFetchEvent,
) => Response | NextResponse | Promise<Response | NextResponse>;

export interface MiddlewareFunctionProps {
  request: NextRequest;
  response: NextResponse;
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

    let response: NextResponse = NextResponse.next();

    for (const middleware of allMiddlewareFunctions) {
      response = await executeMiddleware(
        request,
        middleware,
        response,
        event,
        context,
      );

      request = updateRequestWithResponse(request, response);
    }

    return response;
  };
}

async function executeMiddleware(
  request: NextRequest,
  middleware: MiddlewareFunction,
  response: NextResponse,
  event: NextFetchEvent,
  context: Map<string, unknown>,
): Promise<NextResponse> {
  const result = upgradeResponseToNextResponse(
    await middleware({
      request,
      response,
      event,
      context,
    }),
  );

  if (response) {
    response.headers.forEach((value, key) => {
      result.headers.set(key, value);
    });
  }

  result.cookies.getAll().forEach((cookie) => {
    request.cookies.set(cookie);
  });

  if (isRedirect(result)) {
    request.headers.set('x-redirect-url', result.headers.get('location') ?? '');
    return result;
  }

  return result;
}

function matchesPath(pattern: string, path: string): boolean {
  return pathToRegexp(pattern).test(path);
}

function isRedirect(response: NextResponse | Response): boolean {
  return Boolean(
    response && [301, 302, 303, 307, 308].includes(response.status),
  );
}

function updateRequestWithResponse(
  request: NextRequest,
  response: NextResponse,
): NextRequest {
  const updatedHeaders = new Headers(request.headers);

  response.headers.forEach((value, key) => {
    updatedHeaders.set(key, value);
  });

  const updatedUrl = new URL(request.url);

  const updatedRequest = new NextRequest(updatedUrl, {
    headers: updatedHeaders,
    method: request.method,
    body: request.body,
    referrer: request.referrer,
  });

  response.cookies.getAll().forEach((cookie) => {
    updatedRequest.cookies.set(cookie.name, cookie.value);
  });

  return updatedRequest;
}

function upgradeResponseToNextResponse(
  response: Response | NextResponse,
): NextResponse {
  if (response instanceof NextResponse) {
    return response;
  }

  const nextResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  response.headers.forEach((value, key) => {
    nextResponse.headers.set(key, value);
  });

  return nextResponse;
}
