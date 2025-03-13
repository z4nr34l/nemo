import {
  NextFetchEvent,
  NextMiddleware as NextMiddlewareFunction,
  NextRequest,
  NextResponse,
} from "next/server";
import { pathToRegexp } from "path-to-regexp";
import { NemoMiddlewareError } from "./errors";
import { NemoEvent } from "./event";
import { Logger } from "./logger";
import { StorageAdapter } from "./storage/adapter";
import { MemoryStorageAdapter } from "./storage/adapters/memory";
import {
  type GlobalMiddlewareConfig,
  type MiddlewareConfig,
  type MiddlewareConfigValue,
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
   * Computes if the given path matches the given pattern using path-to-regexp
   * @param pattern - The pattern to match
   * @param path - The path to check
   * @param exact - Whether to match exactly or as a prefix
   * @returns Whether the path matches the pattern
   */
  private computePathMatch(
    pattern: string,
    path: string,
    exact: boolean = false,
  ): boolean {
    // Special case for root path
    if (pattern === "/") {
      return exact ? path === "/" || path === "" : true;
    }

    // Handle Unicode paths properly
    let decodedPath: string;
    let decodedPattern: string;

    try {
      decodedPath = decodeURIComponent(path);
    } catch (error) {
      this.logger.error(`Error decoding path ${path}:`, error);
      decodedPath = path; // Fall back to raw path
    }

    try {
      decodedPattern = decodeURIComponent(pattern);
    } catch (error) {
      this.logger.error(`Error decoding pattern ${pattern}:`, error);
      decodedPattern = pattern; // Fall back to raw pattern
    }

    // For simple paths (no special characters), we have special handling
    if (
      !pattern.includes(":") &&
      !pattern.includes("*") &&
      !pattern.includes("(")
    ) {
      // For exact matching, paths must be identical
      if (exact) {
        return decodedPath === decodedPattern;
      }

      // For non-exact matching, check if this is part of a nested configuration
      // We determine this based on whether the path is inside a middleware object
      // with nested routes (handled in propagateQueue). For direct routes in the config,
      // we only match exact paths.

      // Check if pattern is a nested route pattern or if the path is an exact match
      // For nested route objects in collectMatchingRoutes, we'll collect all matching routes
      return decodedPath === decodedPattern;
    }

    // For patterns with special characters, use path-to-regexp
    try {
      const regexp = pathToRegexp(decodedPattern, [], {
        end: exact,
        strict: false,
        sensitive: false,
      });
      return regexp.test(decodedPath);
    } catch (error) {
      this.logger.error(
        `Error creating regexp for pattern ${decodedPattern}:`,
        error,
      );
      return false;
    }
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

    // Collection of matched routes with their metadata to be processed in order
    type MatchedRoute = {
      pattern: string;
      value: MiddlewareConfigValue;
      nestLevel: number;
      isExactMatch: boolean;
    };

    const matchedRoutes: MatchedRoute[] = [];

    // Collect all matching routes
    const collectMatchingRoutes = (
      middlewares: Record<string, MiddlewareConfigValue>,
      basePath = "",
      nestLevel = 0,
    ) => {
      Object.entries(middlewares).forEach(([key, value]) => {
        // Combine base path with current key for nested routes
        const fullPattern =
          key === "/" && basePath
            ? basePath
            : basePath
              ? `${basePath}${key}`
              : key;

        // Use computePathMatch directly to check both prefix match and exact match
        const isPrefixMatch =
          nestLevel > 0
            ? // For nested routes, check if the path starts with the pattern
              pathname.startsWith(basePath) &&
              (pathname === basePath ||
                pathname.charAt(basePath.length) === "/")
            : // For top-level routes, use the standard matching
              this.computePathMatch(fullPattern, pathname, false);

        const isExactMatch = this.computePathMatch(fullPattern, pathname, true);

        if (isPrefixMatch) {
          matchedRoutes.push({
            pattern: fullPattern,
            value,
            nestLevel,
            isExactMatch,
          });
          this.logger.log(
            `Added route to matched: ${fullPattern}, nestLevel: ${nestLevel}, exactMatch: ${isExactMatch}`,
          );
        }

        // Always process nested routes for objects
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          const nestedEntries = { ...value };

          // Only remove middleware if we're going to include this route
          if (isPrefixMatch && "middleware" in nestedEntries) {
            delete (nestedEntries as Record<string, any>)["middleware"];
          }

          // Continue processing nested routes if there are any entries left
          if (Object.keys(nestedEntries).length > 0) {
            collectMatchingRoutes(nestedEntries, fullPattern, nestLevel + 1);
          }
        }
      });
    };

    // Collect all matching routes
    collectMatchingRoutes(this.middlewares);

    // Sort routes: first by nest level, then prioritize exact matches, then by pattern specificity
    matchedRoutes.sort((a, b) => {
      // First by nest level
      if (a.nestLevel !== b.nestLevel) {
        return a.nestLevel - b.nestLevel;
      }

      // Then prioritize exact matches
      if (a.isExactMatch !== b.isExactMatch) {
        return a.isExactMatch ? 1 : -1; // Exact matches come later
      }

      // Special case for root path - always first
      if (a.pattern === "/") return -1;
      if (b.pattern === "/") return 1;

      // Then by specific pattern length
      return b.pattern.length - a.pattern.length;
    });

    // Process the sorted matching routes
    matchedRoutes.forEach(({ pattern, value, nestLevel }) => {
      // Process middleware based on its type
      if (typeof value === "function") {
        queue.push(
          this.attachMetadata(value, {
            chain: "main",
            index: queue.length - beforeMiddlewares.length,
            pathname,
            routeKey: pattern,
            nestLevel,
          }),
        );
      }
      // Handle array of middleware functions
      else if (Array.isArray(value)) {
        value.forEach((middleware: NextMiddleware, index) => {
          queue.push(
            this.attachMetadata(middleware, {
              chain: "main",
              index,
              pathname,
              routeKey: pattern,
              nestLevel,
            }),
          );
        });
      }
      // Handle object with middleware property
      else if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        "middleware" in value
      ) {
        const middlewareValue = value.middleware;

        // Support both single function and array of functions in middleware property
        if (Array.isArray(middlewareValue)) {
          middlewareValue.forEach((middleware: NextMiddleware, index) => {
            queue.push(
              this.attachMetadata(middleware, {
                chain: "main",
                index,
                pathname,
                routeKey: pattern,
                nestLevel,
              }),
            );
          });
        } else if (typeof middlewareValue === "function") {
          queue.push(
            this.attachMetadata(middlewareValue, {
              chain: "main",
              index: queue.length - beforeMiddlewares.length,
              pathname,
              routeKey: pattern,
              nestLevel,
            }),
          );
        }
      }
    });

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

        // Only return early if the result exists and is not a "next" response
        if (result) {
          // Check if the result is specifically a "next" response, not just equality
          const isNextResponse =
            result instanceof NextResponse &&
            !result.headers.has("x-middleware-rewrite") &&
            !result.headers.has("Location") &&
            !result.headers.get("content-type")?.includes("application/json");

          if (!isNextResponse) {
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
            // Simplified header handling - just add to request headers
            if (result instanceof NextResponse) {
              // Apply headers to the request for subsequent middleware
              result.headers.forEach((value, key) => {
                if (!key.startsWith("x-middleware-")) {
                  request.headers.set(key, value);
                }
              });
            }

            this.logger.log(
              "Middleware returned next response, continuing chain",
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
  middleware: NextMiddlewareFunction = async (
    request: NextRequest,
    event: NextFetchEvent,
  ): Promise<NextMiddlewareResult> => {
    // Create NemoEvent with empty initial context
    const nemoEvent = NemoEvent.from(event as never);

    const queue: NextMiddlewareWithMeta[] = this.propagateQueue(request);

    return this.processQueue(queue, request, nemoEvent);
  };
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
): NextMiddlewareFunction {
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
): NextMiddlewareFunction {
  return new NEMO(middlewares, globalMiddleware, config).middleware;
}
