import { type NextRequest, NextResponse } from 'next/server';

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
        return path === key;
      }) || [];

    if (matchingKey && pathMiddleware) {
      return pathMiddleware(request);
    }

    // If no match is found, return NextResponse.next()
    return NextResponse.next();
  };
}
