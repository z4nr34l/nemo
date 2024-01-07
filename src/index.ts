import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

type MiddlewareFunction = (request: NextRequest) => Promise<NextResponse>;

type Middleware = MiddlewareFunction | MiddlewareFunction[];

type MiddlewareMap = Record<string, Middleware>;

export function createMiddleware(pathMiddlewareMap: MiddlewareMap) {
  return async function middleware(
    request: NextRequest,
  ): Promise<NextResponse> {
    const path = request.nextUrl.pathname || '/';
    let response: NextResponse | null = null;

    for (const [key, pathMiddleware] of Object.entries(pathMiddlewareMap)) {
      const isRegexKey = key.startsWith('regex:');
      const matchPattern = isRegexKey ? key.replace('regex:', '') : key;

      if (
        (isRegexKey && new RegExp(matchPattern).test(path)) ||
        (!isRegexKey && pathMiddlewareMatchesPath(path, matchPattern))
      ) {
        if (Array.isArray(pathMiddleware)) {
          // Support multiple middleware functions in an array
          for (const singleMiddleware of pathMiddleware) {
            const result = await executeMiddleware(request, singleMiddleware);
            if (result) {
              response = result;
            }
          }
        } else {
          const result = await executeMiddleware(request, pathMiddleware);
          if (result) {
            response = result;
          }
        }
      }
    }

    // If no match is found, return null or a default response
    return response || NextResponse.next();
  };
}

// Helper function to execute a single middleware function
async function executeMiddleware(
  request: NextRequest,
  middleware: MiddlewareFunction,
): Promise<NextResponse | null> {
  const result = await middleware(request);
  if (result instanceof NextResponse && result !== NextResponse.next()) {
    // Intercept before returning if a NextResponse is encountered
    return result;
  }
  return result;
}

// Helper function to check if a pathMiddleware should match the given path
function pathMiddlewareMatchesPath(
  path: string,
  matchPattern: string,
): boolean {
  if (matchPattern.includes(':path*')) {
    // Match static paths with startsWith
    return path.startsWith(matchPattern.replace(/:path\*/, ''));
  }
  // Match dynamic path inside [] without additional segments
  const dynamicPathRegex = new RegExp(
    `^${matchPattern.replace(/\[.*?\]/g, '([^/]+?)')}$`,
  );
  return dynamicPathRegex.test(path);
}
