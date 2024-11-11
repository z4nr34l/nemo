import { type NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { pathToRegexp } from 'path-to-regexp';

type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> &
  U[keyof U];

export type NextMiddleware = (
  request: NextRequest,
  event: NextFetchEvent,
) => Response | NextResponse | Promise<Response | NextResponse>;

export interface MiddlewareFunctionProps {
  request: NextRequest;
  context: Map<string, unknown>;
  event: NextFetchEvent;
}

// Separate types for each middleware style
export type NewMiddleware = (
  props: MiddlewareFunctionProps,
) => NextResponse | Response | Promise<NextResponse | Response>;

export type LegacyMiddleware = (
  request: NextRequest,
  event: NextFetchEvent,
) => NextResponse | Response | Promise<NextResponse | Response>;

export type MiddlewareFunction = NewMiddleware | LegacyMiddleware;

export type MiddlewareConfig = Record<
  string,
  MiddlewareFunction | MiddlewareFunction[]
>;

// Type guard to check if it's a legacy middleware
function isLegacyMiddleware(
  middleware: MiddlewareFunction,
): middleware is LegacyMiddleware {
  return middleware.length === 2;
}

async function executeMiddleware(
  middleware: MiddlewareFunction,
  props: MiddlewareFunctionProps,
): Promise<NextResponse | Response> {
  if (isLegacyMiddleware(middleware)) {
    return await middleware(props.request, props.event);
  } else {
    return await middleware(props);
  }
}

export function createMiddleware(
  pathMiddlewareMap: MiddlewareConfig,
  globalMiddleware?: AtLeastOne<
    Record<'before' | 'after', MiddlewareFunction | MiddlewareFunction[]>
  >,
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

    for (const middleware of allMiddlewareFunctions) {
      const middlewareProps = {
        request,
        event,
        context,
      };

      const response = await executeMiddleware(middleware, middlewareProps);

      if (response instanceof NextResponse || response instanceof Response) {
        return response;
      }
    }

    return NextResponse.next();
  };
}

function matchesPath(pattern: string, path: string): boolean {
  return pathToRegexp(pattern).regexp.test(path);
}
