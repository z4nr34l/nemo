import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";
import { pathToRegexp } from "path-to-regexp";

/**
 * Logger class
 */
class Logger {
  private readonly debug: boolean;
  private readonly prefix: string = "[NEMO]";

  constructor(debug: boolean) {
    this.debug = debug;
  }

  log(...args: any[]) {
    if (this.debug) {
      console.log(this.prefix, ...args);
    }
  }

  error(...args: any[]) {
    if (this.debug) {
      console.error(this.prefix, ...args);
    }
  }

  warn(...args: any[]) {
    console.warn(this.prefix, ...args);
  }
}

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

export interface NemoRequest extends NextRequest {
  context: MiddlewareContext;
}

export type ErrorHandler = (
  error: Error,
  context: MiddlewareErrorContext,
) => NextMiddlewareResult | Promise<NextMiddlewareResult>;

export type MiddlewareChain = NextMiddleware | NextMiddleware[];

export type MiddlewareConfig = Record<string, MiddlewareChain>;

export type GlobalMiddlewareConfig = Partial<
  Record<"before" | "after", MiddlewareChain>
>;

export interface NemoConfig {
  debug?: boolean;
  silent?: boolean;
  errorHandler?: ErrorHandler;
  enableTiming?: boolean;
}

export interface MiddlewareErrorContext {
  chain: "before" | "main" | "after";
  index: number;
  pathname: string;
  routeKey: string;
}

/**
 * NemoMiddlewareError
 * @param message - Error message
 * @param context - Middleware error context
 * @param originalError - Original error
 * @returns Error
 */
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
  private context: MiddlewareContext;
  private logger: Logger;

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
      enableTiming: false,
      ...config,
    };
    this.middlewares = middlewares;
    this.globalMiddleware = globalMiddleware;
    this.context = new Map();
    this.logger = new Logger(this.config.debug || false);

    // Log initialization
    this.logger.log("Initialized with config:", {
      debug: this.config.debug,
      silent: this.config.silent,
      enableTiming: this.config.enableTiming,
      middlewareCount: Object.keys(middlewares).length,
      hasGlobalMiddleware: !!globalMiddleware,
    });
  }

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
    const seen = new Set<string>();

    // Optimize header comparison using Sets
    finalHeaders.forEach((value, key) => {
      seen.add(key);
      const initialValue = initialHeaders.get(key);
      if (!initialValue || initialValue !== value) {
        diff[key] = value;
      }
    });

    // Check for deleted headers
    initialHeaders.forEach((_, key) => {
      if (!seen.has(key)) {
        diff[key] = ""; // Mark for deletion
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
    const pathname = request.nextUrl.pathname;
    this.logger.log("Processing request for path:", pathname);

    let routeKey = "/";

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

    const queue = [
      ...beforeMiddlewares,
      ...mainMiddlewares,
      ...afterMiddlewares,
    ];
    this.logger.log("Generated middleware queue:", {
      total: queue.length,
      before: beforeMiddlewares.length,
      main: mainMiddlewares.length,
      after: afterMiddlewares.length,
    });

    return queue;
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
    request: NemoRequest,
    event: NextFetchEvent,
  ): Promise<NextMiddlewareResult> {
    let result: NextMiddlewareResult;
    const initialHeaders = new Headers(request.headers);

    // Add timing tracking
    const chainTiming = {
      before: 0,
      main: 0,
      after: 0,
    };

    this.logger.log("Starting middleware queue processing");

    for (const middleware of queue) {
      try {
        const startTime = performance.now();

        this.logger.log("Executing middleware:", {
          chain: middleware.__nemo?.chain,
          index: middleware.__nemo?.index,
          pathname: middleware.__nemo?.pathname,
        });

        result = await middleware(request, event);

        if (this.config.enableTiming) {
          const duration = performance.now() - startTime;
          // Add duration to appropriate chain
          if (middleware.__nemo?.chain) {
            chainTiming[middleware.__nemo.chain] += duration;
          }
          this.logger.log(
            `Middleware execution time: ${duration.toFixed(2)}ms`,
          );
        }

        if (result) {
          // Log final timing before early return
          if (this.config.enableTiming) {
            this.logger.log("Chain timing summary:", {
              before: `${chainTiming.before.toFixed(2)}ms`,
              main: `${chainTiming.main.toFixed(2)}ms`,
              after: `${chainTiming.after.toFixed(2)}ms`,
              total: `${(chainTiming.before + chainTiming.main + chainTiming.after).toFixed(2)}ms`,
            });
          }
          this.logger.log("Middleware returned result, ending chain");
          return result;
        }
      } catch (error) {
        this.logger.error("Middleware execution failed:", {
          error,
          metadata: middleware.__nemo,
        });

        if (this.config.errorHandler) {
          const handled = await this.config.errorHandler(
            error as Error,
            middleware.__nemo!,
          );
          if (handled) {
            this.logger.log("Error handled by custom handler");
            return handled;
          }
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

    // Log final timing before default return
    if (this.config.enableTiming) {
      this.logger.log("Chain timing summary:", {
        before: `${chainTiming.before.toFixed(2)}ms`,
        main: `${chainTiming.main.toFixed(2)}ms`,
        after: `${chainTiming.after.toFixed(2)}ms`,
        total: `${(chainTiming.before + chainTiming.main + chainTiming.after).toFixed(2)}ms`,
      });
    }

    const finalHeaders = new Headers(request.headers);
    const headerDiff = this.getHeadersDiff(initialHeaders, finalHeaders);
    this.logger.log("Headers modified:", headerDiff);

    return NextResponse.next({
      headers: new Headers(headerDiff),
      request,
    });
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
    // Enhance request with context
    const nemoRequest = request as NemoRequest;
    nemoRequest.context = this.context;

    const queue: NextMiddlewareWithMeta[] = this.propagateQueue(nemoRequest);

    return this.processQueue(queue, nemoRequest, event);
  };

  /**
   * Clear middleware context
   */
  clearContext() {
    this.context.clear();
  }
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
