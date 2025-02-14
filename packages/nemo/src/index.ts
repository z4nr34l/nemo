import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";
import { pathToRegexp } from "path-to-regexp";

export type NextMiddlewareResult =
  | NextResponse
  | Response
  | null
  | undefined
  | void;
export type NextMiddleware = (
  request: NextRequest,
  event: NextFetchEvent,
) => NextMiddlewareResult | Promise<NextMiddlewareResult>;

export type MiddlewareContext = Map<string, unknown>;

export interface NemoEvent extends NextFetchEvent {
  forward: (fn: NextMiddleware) => void;
}

export type MiddlewareChain = NextMiddleware | NextMiddleware[];

export type MiddlewareConfig = Record<string, MiddlewareChain>;

export type GlobalMiddlewareConfig = Partial<
  Record<"before" | "after", MiddlewareChain>
>;

export interface NemoConfig {
  debug?: boolean;
  silent?: boolean;
}

export interface MiddlewareErrorContext {
  chain: "before" | "main" | "after";
  index: number;
  pathname: string;
  routeKey: string;
}

export class NemoMiddlewareError extends Error {
  constructor(
    message: string,
    public readonly context: MiddlewareErrorContext,
    public readonly originalError: unknown,
  ) {
    super(
      `${message} [${context.chain} chain at path ${context.pathname}${
        context.routeKey ? ` (matched by ${context.routeKey})` : ""
      }, index ${context.index}]`,
    );
  }
}

export interface MiddlewareMetadata {
  chain: "before" | "main" | "after";
  index: number;
  pathname: string;
  routeKey: string;
}

export type NextMiddlewareWithMeta = NextMiddleware & {
  __nemo?: MiddlewareMetadata;
};

/**
 * NEMO Middleware
 * @param middlewares - Middleware configuration
 * @param globalMiddleware - Global middleware configuration
 * @returns NextMiddleware
 */
export class NEMO {
  private config: NemoConfig;
  private middlewares: MiddlewareConfig;
  private globalMiddleware?: GlobalMiddlewareConfig;

  /**
   * Checks if the given path matches the given pattern.
   * @param pattern - The pattern to match.
   * @param path - The path to check.
   */
  private matchesPath(pattern: string, path: string): boolean {
    return pathToRegexp(pattern).test(path);
  }

  /**
   * Porównuje początkowe i końcowe nagłówki i zwraca różnicę
   * @param initialHeaders - Początkowe nagłówki żądania
   * @param finalHeaders - Końcowe nagłówki żądania
   * @returns Obiekt zawierający nowe i zmodyfikowane nagłówki
   */
  private getHeadersDiff(
    initialHeaders: Headers,
    finalHeaders: Headers,
  ): Record<string, string> {
    const diff: Record<string, string> = {};

    finalHeaders.forEach((value, key) => {
      if (!initialHeaders.has(key) || initialHeaders.get(key) !== value) {
        diff[key] = value;
      }
    });

    return diff;
  }

  /**
   * Attaches metadata to the given middleware function.
   * @param middleware - The middleware function to attach metadata to.
   * @param metadata - The metadata to attach.
   * @returns The middleware function with attached metadata.
   */
  private attachMetadata(
    middleware: NextMiddleware,
    metadata: MiddlewareMetadata,
  ): NextMiddlewareWithMeta {
    const middlewareWithMeta = middleware as NextMiddlewareWithMeta;
    middlewareWithMeta.__nemo = metadata;
    return middlewareWithMeta;
  }

  /**
   * Propagate the queue of middleware functions for the given request.
   * @param request - The request to propagate the queue for.
   * @returns The queue of middleware functions.
   */
  private propagateQueue(request: NextRequest): NextMiddlewareWithMeta[] {
    let routeKey = "";
    const pathname = request.nextUrl.pathname;

    const _middlewares = Object.entries(this.middlewares).filter(([key]) => {
      const matches = this.matchesPath(key, pathname);

      if (matches) {
        routeKey = key;
      }

      return matches;
    });

    const beforeMiddlewares = (
      this.globalMiddleware?.before
        ? Array.isArray(this.globalMiddleware.before)
          ? this.globalMiddleware.before
          : [this.globalMiddleware.before]
        : []
    ).map((middleware, index) =>
      this.attachMetadata(middleware, {
        chain: "before",
        index,
        pathname,
        routeKey,
      }),
    );

    const mainMiddlewares = _middlewares.flatMap(([_, middlewares]) => {
      const middlewareArray = Array.isArray(middlewares)
        ? middlewares
        : [middlewares];
      return middlewareArray.map((middleware, index) =>
        this.attachMetadata(middleware, {
          chain: "main",
          index,
          pathname,
          routeKey,
        }),
      );
    });

    const afterMiddlewares = (
      this.globalMiddleware?.after
        ? Array.isArray(this.globalMiddleware.after)
          ? this.globalMiddleware.after
          : [this.globalMiddleware.after]
        : []
    ).map((middleware, index) =>
      this.attachMetadata(middleware, {
        chain: "after",
        index,
        pathname,
        routeKey,
      }),
    );

    return [...beforeMiddlewares, ...mainMiddlewares, ...afterMiddlewares];
  }

  /**
   * Process the queue of middleware functions.
   * @param queue - The queue of middleware functions to process.
   * @param request - The request to process the queue for.
   * @param event - The fetch event to process the queue for.
   * @returns The result of the middleware processing.
   */
  private async processQueue(
    queue: NextMiddlewareWithMeta[],
    request: NextRequest,
    event: NextFetchEvent,
  ): Promise<NextMiddlewareResult> {
    let result: NextMiddlewareResult;
    const initialHeaders = new Headers(request.headers);

    for (const middleware of queue) {
      try {
        if (this.config.debug) {
          console.log(`[NEMO] Executing middleware:`, middleware.__nemo);
        }

        result = await middleware(request, event);

        if (result) {
          return result;
        }
      } catch (error) {
        if (this.config.debug) {
          console.error("[NEMO] Middleware error:", error);
        }

        if (!this.config.silent) {
          throw new NemoMiddlewareError(
            "Middleware execution failed",
            middleware.__nemo!,
            error,
          );
        }
      }
    }

    const finalHeaders = new Headers(request.headers);
    if (this.config.debug) {
      console.log(
        "[NEMO] Final request headers",
        this.getHeadersDiff(initialHeaders, finalHeaders),
      );
    }

    return NextResponse.next({
      headers: new Headers(this.getHeadersDiff(initialHeaders, finalHeaders)),
      request,
    });
  }

  /**
   * NEMO Middleware
   * @param middlewares - Middleware configuration
   * @param globalMiddleware - Global middleware configuration
   * @param config - NEMO configuration
   */
  constructor(
    middlewares: MiddlewareConfig,
    globalMiddleware?: GlobalMiddlewareConfig,
    config?: NemoConfig,
  ) {
    this.config = {
      debug: false,
      silent: false,
      ...config,
    };
    this.middlewares = middlewares;
    this.globalMiddleware = globalMiddleware;
  }

  /**
   * Middleware
   * @param request - The request to process the middleware for.
   * @param event - The fetch event to process the middleware for.
   * @returns The result of the middleware processing.
   */
  middleware = async (
    request: NextRequest,
    event: NextFetchEvent,
  ): Promise<NextMiddlewareResult> => {
    const queue: NextMiddlewareWithMeta[] = this.propagateQueue(request);

    return this.processQueue(queue, request, event);
  };
}

/**
 * @deprecated Use `new NEMO()` instead. Example: `export const { middleware } = new NEMO(middlewares, globalMiddleware)`
 * Create middleware
 * @param middlewares - Middleware configuration
 * @param globalMiddleware - Global middleware configuration
 * @returns NextMiddleware
 */
export function createMiddleware(
  middlewares: MiddlewareConfig,
  globalMiddleware?: Partial<
    Record<"before" | "after", NextMiddleware | NextMiddleware[]>
  >,
) {
  console.warn(
    "[NEMO] `createMiddleware` is deprecated. Use `new NEMO()` instead.",
  );

  return new NEMO(middlewares, globalMiddleware);
}
