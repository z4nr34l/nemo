import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { pathToRegexp } from "path-to-regexp";
import { NemoMiddlewareError } from "./errors";
import { NemoEvent } from "./event";
import { Logger } from "./logger";
import {
  type GlobalMiddlewareConfig,
  type MiddlewareConfig,
  type MiddlewareMetadata,
  type NemoConfig,
  type NextMiddleware,
  type NextMiddlewareResult,
  type NextMiddlewareWithMeta,
} from "./types";

export { NemoMiddlewareError } from "./errors";
export { NemoEvent } from "./event";
export * from "./types";

export class NEMO {
  private config: NemoConfig;
  private middlewares: MiddlewareConfig;
  private globalMiddleware?: GlobalMiddlewareConfig;
  private context: Map<string, unknown>;
  private logger: Logger;
  private matchCache: Map<string, Map<string, boolean>> = new Map();

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
   * Gets cached match result or computes and caches new result
   * @param pattern - The pattern to match
   * @param path - The path to check
   */
  private getCachedMatch(pattern: string, path: string): boolean {
    let patternCache = this.matchCache.get(pattern);
    if (!patternCache) {
      patternCache = new Map();
      this.matchCache.set(pattern, patternCache);
    }

    const cached = patternCache.get(path);
    if (cached !== undefined) {
      return cached;
    }

    const result = pathToRegexp(pattern).test(path);
    patternCache.set(path, result);
    return result;
  }

  /**
   * Checks if the given path matches the given pattern.
   * @param pattern - The pattern to match.
   * @param path - The path to check.
   */
  private matchesPath(pattern: string, path: string): boolean {
    // Decode URI components to handle Unicode characters
    const decodedPath = decodeURIComponent(path);
    const decodedPattern = decodeURIComponent(pattern);
    return this.getCachedMatch(decodedPattern, decodedPath);
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
    request: NextRequest,
    event: NemoEvent,
  ): Promise<NextMiddlewareResult> {
    let result: NextMiddlewareResult;
    const initialHeaders = new Headers(request.headers);

    // Add timing tracking only when enabled
    const chainTiming = this.config.enableTiming
      ? {
          before: 0,
          main: 0,
          after: 0,
        }
      : null;

    this.logger.log("Starting middleware queue processing");

    for (const middleware of queue) {
      try {
        const startTime = this.config.enableTiming ? performance.now() : 0;

        this.logger.log("Executing middleware:", {
          chain: middleware.__nemo?.chain,
          index: middleware.__nemo?.index,
          pathname: middleware.__nemo?.pathname,
        });

        result = await middleware(request, event);

        if (
          this.config.enableTiming &&
          chainTiming &&
          middleware.__nemo?.chain
        ) {
          const duration = performance.now() - startTime;
          chainTiming[middleware.__nemo.chain] += duration;
          this.logger.log(
            `Middleware execution time: ${duration.toFixed(2)}ms`,
          );
        }

        if (result) {
          // Log final timing before early return
          if (this.config.enableTiming && chainTiming) {
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
    if (this.config.enableTiming && chainTiming) {
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
    // Get fresh context for this request
    const context = new Map(this.context);

    // Ensure we have a valid NextFetchEvent
    const nemoEvent = NemoEvent.from(event as never, context);

    const queue: NextMiddlewareWithMeta[] = this.propagateQueue(request);

    return this.processQueue(queue, request, nemoEvent);
  };

  /**
   * Clear middleware context and cache
   */
  clearContext() {
    this.context.clear();
    this.matchCache.clear();
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
  globalMiddleware?: GlobalMiddlewareConfig,
) {
  console.warn(
    "[NEMO] `createMiddleware` is deprecated. Use `new NEMO()` instead.",
  );

  return new NEMO(middlewares, globalMiddleware);
}
