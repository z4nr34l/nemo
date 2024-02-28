import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export type CustomMiddleware = (...args: any) => any;

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
    // Extract the path from the request URL
    const path = request.nextUrl.pathname || '/';
    // Initialize response as null
    let response: NextResponse | null = null;

    // Function to execute global middleware before or after path-specific middleware
    const executeGlobalMiddleware = async (
      type: 'before' | 'after',
    ): Promise<void> => {
      const globalMiddlewareFn = globalMiddleware?.[type];
      if (globalMiddlewareFn) {
        // Execute global middleware and update response if applicable
        const result = await executeMiddleware(request, globalMiddlewareFn);
        if (result) response = result;
      }
    };

    // Execute global middleware before processing path-specific middleware
    await executeGlobalMiddleware('before');

    // Iterate through pathMiddlewareMap to find matching middleware for the current path
    for (const [key, middlewareFunctions] of Object.entries(
      pathMiddlewareMap,
    )) {
      // Check if the key is a regex pattern or a direct match
      const isRegexKey = key.startsWith('regex:');
      const matchPattern = isRegexKey ? key.replace('regex:', '') : key;

      // Check if the current path matches the pattern
      if (
        (isRegexKey && new RegExp(matchPattern).test(path)) ||
        (!isRegexKey && pathMiddlewareMatchesPath(path, matchPattern))
      ) {
        // Extract middleware functions and handle if it's an array or single function
        const middlewares = Array.isArray(middlewareFunctions)
          ? middlewareFunctions
          : [middlewareFunctions];

        // Iterate through middlewares and execute them sequentially
        for (const middlewareFunction of middlewares) {
          // Execute middleware and update response if applicable
          const result = await executeMiddleware(request, middlewareFunction);
          if (result) {
            response = result;
            // Break the loop if the response is a redirect
            if (isRedirectReturned(response)) {
              break;
            }
          }
        }
        // Break the outer loop if the response is a redirect
        if (isRedirectReturned(response)) {
          break;
        }
      }
    }

    // Execute global middleware after processing path-specific middleware
    await executeGlobalMiddleware('after');

    // Return the response if available, otherwise return a default response
    return response ?? NextResponse.next();
  };
}

async function executeMiddleware(
  request: NextRequest,
  middleware: MiddlewareFunction,
): Promise<NextResponse | null> {
  const result = await middleware(request);
  // Return the result if it's not a default response, otherwise return null
  return result !== NextResponse.next() ? result : null;
}

function pathMiddlewareMatchesPath(
  path: string,
  matchPattern: string,
): boolean {
  // Handle wildcard path match if pattern includes ':path*'
  if (matchPattern.includes(':path*')) {
    return path.startsWith(matchPattern.replace(/:path\*/, ''));
  }
  // Generate regex pattern for dynamic path matching
  const dynamicPathRegex = new RegExp(
    `^${matchPattern.replace(/\[.*?\]/g, '([^/]+?)')}$`,
  );
  // Test if the path matches the dynamic pattern
  return dynamicPathRegex.test(path);
}

function isRedirectReturned(response: NextResponse | null) {
  return response && [301, 302, 303, 307, 308].includes(response.status);
}
