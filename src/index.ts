import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export type MiddlewareFunction = (request: NextRequest) => Promise<NextResponse>;

export type MiddlewareConfig = Record<
  string,
  MiddlewareFunction | MiddlewareFunction[]
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

    const executeGlobalMiddleware = async (type: 'before' | 'after') => {
      const globalMiddlewareFn = globalMiddleware?.[type];
      if (globalMiddlewareFn) {
        const result = await executeMiddleware(request, globalMiddlewareFn);
        if (result) response = result;
      }
    };

    await executeGlobalMiddleware('before');

    for (const [key, middlewareFunctions] of Object.entries(
      pathMiddlewareMap,
    )) {
      const isRegexKey = key.startsWith('regex:');
      const matchPattern = isRegexKey ? key.replace('regex:', '') : key;

      if (
        (isRegexKey && new RegExp(matchPattern).test(path)) ||
        (!isRegexKey && pathMiddlewareMatchesPath(path, matchPattern))
      ) {
        const middlewares = Array.isArray(middlewareFunctions)
          ? middlewareFunctions
          : [middlewareFunctions];

        for (const middlewareFunction of middlewares) {
          // eslint-disable-next-line no-await-in-loop -- ensuring that function fully executed
          const result = await executeMiddleware(request, middlewareFunction);
          if (result) response = result;
        }
      }
    }

    await executeGlobalMiddleware('after');

    return response ?? NextResponse.next();
  };
}

async function executeMiddleware(
  request: NextRequest,
  middleware: MiddlewareFunction,
): Promise<NextResponse | null> {
  const result = await middleware(request);
  return result instanceof NextResponse && result !== NextResponse.next()
    ? result
    : null;
}

function pathMiddlewareMatchesPath(
  path: string,
  matchPattern: string,
): boolean {
  if (matchPattern.includes(':path*')) {
    return path.startsWith(matchPattern.replace(/:path\*/, ''));
  }
  const dynamicPathRegex = new RegExp(
    `^${matchPattern.replace(/\[.*?\]/g, '([^/]+?)')}$`,
  );
  return dynamicPathRegex.test(path);
}
