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

    await executeGlobalMiddleware('before', request, globalMiddleware);

    for (const [key, middlewareFunctions] of Object.entries(
      pathMiddlewareMap,
    )) {
      if (matchesPath(key, path)) {
        // eslint-disable-next-line no-await-in-loop -- need to await middleware to ensure it has been run
        response = await executePathMiddleware(request, middlewareFunctions);
        if (isRedirect(response)) break;
      }
    }

    await executeGlobalMiddleware('after', request, globalMiddleware);

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

  let response = NextResponse.next();

  for (const middlewareFunction of middlewares) {
    // Execute the middleware with the current request and response
    // eslint-disable-next-line no-await-in-loop -- need to await middleware to ensure it has been run
    const result = await executeMiddleware(request, middlewareFunction);

    // If the middleware returns a response, use it for the next middleware
    if (result instanceof NextResponse) {
      response = result;
    }
  }

  // Return the final response after all middleware have executed
  return response;
}

async function executeGlobalMiddleware(
  type: 'before' | 'after',
  request: NextRequest,
  globalMiddleware?: Record<string, MiddlewareFunction>,
): Promise<void> {
  const globalMiddlewareFn = globalMiddleware?.[type];
  if (globalMiddlewareFn) {
    const result = await executeMiddleware(request, globalMiddlewareFn);
    if (result && isRedirect(result)) return;
  }
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
    return path.startsWith(pattern.replace(/:path\*/, ''));
  }
  const dynamicPathRegex = new RegExp(
    `^${pattern.replace(/\[.*?\]/g, '([^/]+?)')}$`,
  );
  return dynamicPathRegex.test(path);
}

function isRedirect(response: NextResponse | null): boolean {
  return Boolean(
    response && [301, 302, 303, 307, 308].includes(response.status),
  );
}
