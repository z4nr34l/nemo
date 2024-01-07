import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

type MiddlewareMap = Record<
  string,
  (request: NextRequest) => Promise<NextResponse>
>;

export function createMiddleware(pathMiddlewareMap: MiddlewareMap) {
  return async function middleware(
    request: NextRequest,
  ): Promise<NextResponse> {
    const path = request.nextUrl.pathname || '/';

    const [matchingKey, pathMiddleware] =
      Object.entries(pathMiddlewareMap).find(([key]) => {
        if (key.includes(':path*')) {
          return path.startsWith(key.replace(/:path\*/, ''));
        }
        const dynamicPathRegex = new RegExp(
          `^${key.replace(/\[.*?\]/g, '([^/]+?)')}$`,
        );
        return dynamicPathRegex.test(path);
      }) || [];

    if (matchingKey && pathMiddleware) {
      return pathMiddleware(request);
    }

    return NextResponse.next();
  };
}
