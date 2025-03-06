import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { pathToRegexp } from "path-to-regexp";
import { NemoMiddlewareError } from "./errors";
import { NemoEvent } from "./event";
import { Logger } from "./logger";
import { StorageAdapter } from "./storage/adapter";
import { MemoryStorageAdapter } from "./storage/adapters/memory";
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
export * from "./utils";

export class NEMO {
  private config: NemoConfig;
  private middlewares: MiddlewareConfig;
  private globalMiddleware?: GlobalMiddlewareConfig;
  private logger: Logger;
  private matchCache: Map<string, Map<string, boolean>> = new Map();
  private storage: StorageAdapter;

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
    this.logger = new Logger(this.config.debug || false);

    // Initialize storage
    if (this.config.storage) {
      this.storage =
        typeof this.config.storage === "function"
          ? this.config.storage()
          : this.config.storage;
    } else {
      this.storage = new MemoryStorageAdapter();
    }

    // Log initialization
    this.logger.log("Initialized with config:", {
      debug: this.config.debug,
      silent: this.config.silent,
      enableTiming: this.config.enableTiming,
      middlewareCount: Object.keys(middlewares).length,
      hasGlobalMiddleware: !!globalMiddleware,
      storageAdapter: this.storage.constructor.name,
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

    const queue: NextMiddlewareWithMeta[] = [];
    const processedRoutes: string[] = [];

    // Add before middlewares
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
        routeKey: "global:before",
      }),
    );
    queue.push(...beforeMiddlewares);

    // Recursively process middleware entries
    const processMiddlewares = (
      middlewares: Record<string, any>,
      basePath = "",
      nestLevel = 0,
    ) => {
      Object.entries(middlewares).forEach(([key, value]) => {
        // Combine base path with current key for nested routes
        const fullPattern = basePath ? `${basePath}${key}` : key;

        if (this.matchesPath(fullPattern, pathname)) {
          processedRoutes.push(fullPattern);

          // Handle different value types
          if (typeof value === "function") {
            // Single middleware function
            queue.push(
              this.attachMetadata(value, {
                chain: "main",
                index: queue.length - beforeMiddlewares.length,
                pathname,
                routeKey: fullPattern,
                nestLevel,
              }),
            );
          } else if (Array.isArray(value)) {
            // Array of middleware functions
            value.forEach((middleware, index) => {
              queue.push(
                this.attachMetadata(middleware, {
                  chain: "main",
                  index,
                  pathname,
                  routeKey: fullPattern,
                  nestLevel,
                }),
              );
            });
          } else if (typeof value === "object" && value !== null) {
            // Nested middleware configuration
            processMiddlewares(value, fullPattern, nestLevel + 1);
          }
        }
      });
    };

    // Process all middlewares
    processMiddlewares(this.middlewares);

    // Add after middlewares
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
        routeKey: "global:after",
      }),
    );
    queue.push(...afterMiddlewares);

    this.logger.log("Generated middleware queue:", {
      total: queue.length,
      before: beforeMiddlewares.length,
      main: queue.length - beforeMiddlewares.length - afterMiddlewares.length,
      after: afterMiddlewares.length,
      processedRoutes,
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
    const defaultResponse = NextResponse.next();

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
          routeKey: middleware.__nemo?.routeKey,
          nestLevel: middleware.__nemo?.nestLevel,
        });

        // Set current middleware metadata before execution
        if (middleware.__nemo) {
          event.setCurrentMetadata(middleware.__nemo);
        }

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

        // Only return early if the result exists and is not equivalent to NextResponse.next()
        if (result) {
          // Import and use areResponsesEqual from utils
          const { areResponsesEqual } = require("./utils");
          const isDefaultResponse = areResponsesEqual(result, defaultResponse);

          if (!isDefaultResponse) {
            // Log final timing before early return
            if (this.config.enableTiming && chainTiming) {
              this.logger.log("Chain timing summary:", {
                before: `${chainTiming.before.toFixed(2)}ms`,
                main: `${chainTiming.main.toFixed(2)}ms`,
                after: `${chainTiming.after.toFixed(2)}ms`,
                total: `${(
                  chainTiming.before +
                  chainTiming.main +
                  chainTiming.after
                ).toFixed(2)}ms`,
              });
            }
            this.logger.log("Middleware returned custom result, ending chain");
            return result;
          } else {
            this.logger.log(
              "Middleware returned default response, continuing chain",
            );
          }
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
    // Create NemoEvent with empty initial context
    const nemoEvent = NemoEvent.from(event as never);

    const queue: NextMiddlewareWithMeta[] = this.propagateQueue(request);

    return this.processQueue(queue, request, nemoEvent);
  };

  /**
   * Clear middleware cache
   */
  async clearCache() {
    this.matchCache.clear();
  }
}

/**
 * @deprecated This function is going to be deprecated as it's named just like many other packages and can cause conflicts. Use `new NEMO()` instead. Example: `export const middleware = createNEMO(middlewares, globalMiddleware, config)`.
 *
 * @param middlewares - Middleware configuration
 * @param globalMiddleware - Global middleware configuration
 * @returns NextMiddleware
 *
 * @example
 * ```ts
 * import { createNEMO } from "@rescale/nemo";
 *
 * const middleware = createNEMO({
 *  "/api/:path*": (req, event) => {
 *    console.log("API request:", req.nextUrl.pathname);
 *  },
 * });
 * ```
 */
export function createMiddleware(
  middlewares: MiddlewareConfig,
  globalMiddleware?: GlobalMiddlewareConfig,
  config?: NemoConfig,
) {
  console.warn(
    "[NEMO] `createMiddleware` is deprecated. Use `createNEMO` instead.",
  );

  return new NEMO(middlewares, globalMiddleware, config).middleware;
}

/**
 * Creates a new NEMO instance with the given middlewares and optional configurations.
 *
 * @param middlewares - Middleware configuration
 * @param globalMiddleware - Global middleware configuration
 * @param config - Optional Nemo configuration
 * @returns NextMiddleware
 *
 * @example
 * ```ts
 * import { createNEMO } from "@rescale/nemo";
 *
 * const middleware = createNEMO({
 *  "/api/:path*": (req, event) => {
 *    console.log("API request:", req.nextUrl.pathname);
 *  },
 * });
 * ```
 */
export function createNEMO(
  middlewares: MiddlewareConfig,
  globalMiddleware?: GlobalMiddlewareConfig,
  config?: NemoConfig,
) {
  return new NEMO(middlewares, globalMiddleware, config).middleware;
}
