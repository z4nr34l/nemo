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
        const isRegexKey = key.startsWith('regex:');
        const matchPattern = isRegexKey ? key.replace('regex:', '') : key;

        if (isRegexKey) {
          const regex = new RegExp(matchPattern);
          return regex.test(path);
        } else if (matchPattern.includes(':path*')) {
          return path.startsWith(matchPattern.replace(/:path\*/, ''));
        }
        const dynamicPathRegex = new RegExp(
          `^${matchPattern.replace(/\[.*?\]/g, '(.+?)')}$`,
        );
        return dynamicPathRegex.test(path);
      }) || [];

    if (matchingKey && pathMiddleware) {
      return pathMiddleware(request);
    }

    // If no match is found, return NextResponse.next()
    return NextResponse.next();
  };
}
