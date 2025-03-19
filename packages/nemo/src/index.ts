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
  type MiddlewareChain,
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
  private readonly config: NemoConfig;
  private readonly middlewares: MiddlewareConfig;
  private readonly globalMiddleware?: GlobalMiddlewareConfig;
  private readonly logger: Logger;
  private readonly storage: StorageAdapter;

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

      // For non-exact matching:
      // 1. Path is exactly the pattern
      // 2. Path starts with pattern followed by a slash
      return (
        decodedPath === decodedPattern ||
        decodedPath.startsWith(decodedPattern + "/")
      );
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
    const entries: [string, string][] = [];
    const seen = new Set<string>();

    // Optimize header comparison using Sets
    finalHeaders.forEach((value, key) => {
      seen.add(key);
      const initialValue = initialHeaders.get(key);
      if (!initialValue || initialValue !== value) {
        entries.push([key, value]);
      }
    });

    // Check for deleted headers
    initialHeaders.forEach((_, key) => {
      if (!seen.has(key)) {
        entries.push([key, ""]); // Mark for deletion
      }
    });

    return Object.fromEntries(entries);
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
   * Creates a full pattern path by combining base path and key
   * @param key - The route key
   * @param basePath - The base path
   * @returns The combined full pattern
   */
  private createFullPattern(key: string, basePath: string): string {
    // Check if basePath exists first
    if (!basePath) {
      return key; // If no basePath, just return the key
    }

    // Now handle different key scenarios
    if (key === "/") {
      return basePath; // For root key with basePath, return just the basePath
    } else {
      return `${basePath}${key}`; // Otherwise concatenate them
    }
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
    const processedPatterns = new Set<string>(); // Track processed patterns

    // Add before middlewares
    // Extract the middleware array from global middleware configuration
    let beforeMiddlewareArray: MiddlewareChain = [];

    if (this.globalMiddleware?.before) {
      beforeMiddlewareArray = Array.isArray(this.globalMiddleware.before)
        ? this.globalMiddleware.before
        : [this.globalMiddleware.before];
    }

    // Map middleware array to attach metadata
    const beforeMiddlewares = beforeMiddlewareArray.map((middleware, index) =>
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
      middleware: NextMiddleware | NextMiddleware[];
      nestLevel: number;
      isExactMatch: boolean;
    };

    const matchedRoutes: MatchedRoute[] = [];

    // Special case for root path - only process the root middleware for exact root path matches
    // This ensures root middleware only runs for "/" and not for other paths
    if (this.middlewares["/"] && (pathname === "/" || pathname === "")) {
      const rootValue = this.middlewares["/"];
      processedPatterns.add("/");

      if (typeof rootValue === "function" || Array.isArray(rootValue)) {
        matchedRoutes.push({
          pattern: "/",
          middleware: rootValue,
          nestLevel: 0,
          isExactMatch: true,
        });
      } else if (
        typeof rootValue === "object" &&
        rootValue !== null &&
        "middleware" in rootValue
      ) {
        matchedRoutes.push({
          pattern: "/",
          middleware: rootValue.middleware,
          nestLevel: 0,
          isExactMatch: true,
        });
      }
    }

    // Collect all matching routes
    const collectMatchingRoutes = (
      middlewares: Record<string, MiddlewareConfigValue>,
      basePath = "",
      nestLevel = 0,
    ) => {
      Object.entries(middlewares).forEach(([key, value]) => {
        // Skip processing if the key is "middleware" - it's a special property
        if (key === "middleware") return;

        // Skip root path completely if not at root level or if already processed
        // This ensures the root middleware doesn't match other paths
        if (key === "/" && (basePath !== "" || processedPatterns.has("/")))
          return;

        // Skip the root path in regular processing for non-root paths
        if (key === "/" && pathname !== "/" && pathname !== "") return;

        // Combine base path with current key for nested routes
        const fullPattern = this.createFullPattern(key, basePath);

        // Skip if already processed
        if (processedPatterns.has(fullPattern)) return;
        processedPatterns.add(fullPattern);

        // Different path matching logic based on nestLevel and value type
        let isPrefixMatch = false;
        const isExactMatch = this.computePathMatch(fullPattern, pathname, true);

        // Check if this is a nested routes container
        const supportsNesting =
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value) &&
          Object.keys(value).some((k) => k !== "middleware");

        if (nestLevel === 0 && !supportsNesting) {
          // Top-level routes that don't support nesting only match exactly
          isPrefixMatch = isExactMatch;
        } else {
          // Nested routes or routes that support nesting can match prefix
          isPrefixMatch = this.computePathMatch(fullPattern, pathname, false);
        }

        // Only process this route if it matches the path
        if (isPrefixMatch) {
          // Handle middleware directly attached to this route
          if (typeof value === "function") {
            matchedRoutes.push({
              pattern: fullPattern,
              middleware: value,
              nestLevel,
              isExactMatch,
            });
          }
          // Handle array of middleware functions
          else if (Array.isArray(value)) {
            matchedRoutes.push({
              pattern: fullPattern,
              middleware: value,
              nestLevel,
              isExactMatch,
            });
          }
          // Handle object with middleware property
          else if (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value) &&
            "middleware" in value
          ) {
            matchedRoutes.push({
              pattern: fullPattern,
              middleware: value.middleware,
              nestLevel,
              isExactMatch,
            });
          }
        }

        /**
         * Process nested routes for objects that can contain child routes
         * Objects that contain keys other than "middleware" are considered
         * route containers that can have nested routes inside them
         */
        if (supportsNesting) {
          // Clone the object and remove middleware property to isolate child routes
          const nestedEntries = { ...value };
          if ("middleware" in nestedEntries) {
            delete (nestedEntries as Record<string, unknown>).middleware;
          }

          // Recursively process nested routes with updated base path and nest level
          if (Object.keys(nestedEntries).length > 0) {
            collectMatchingRoutes(nestedEntries, fullPattern, nestLevel + 1);
          }
        }
      });
    };

    // Start the recursive route collection process from the root middleware config
    collectMatchingRoutes(this.middlewares);

    /**
     * Sort matched routes by priority:
     * 1. Root path ("/") always comes first
     * 2. Routes are ordered by nest level (parent routes before children)
     * 3. Exact path matches take priority over prefix matches
     * 4. Longer patterns take priority over shorter ones (more specific wins)
     */
    matchedRoutes.sort((a, b) => {
      if (a.pattern === "/") return -1;
      if (b.pattern === "/") return 1;

      if (a.nestLevel !== b.nestLevel) {
        return a.nestLevel - b.nestLevel;
      }

      if (a.isExactMatch !== b.isExactMatch) {
        return a.isExactMatch ? 1 : -1; // Exact matches come later
      }

      return b.pattern.length - a.pattern.length;
    });

    /**
     * Add all matched middleware functions to the execution queue
     * Each middleware receives metadata about its position in the chain
     * and the route it belongs to
     */
    matchedRoutes.forEach(({ pattern, middleware, nestLevel }) => {
      if (Array.isArray(middleware)) {
        middleware.forEach((middlewareFn, index) => {
          queue.push(
            this.attachMetadata(middlewareFn, {
              chain: "main",
              index,
              pathname,
              routeKey: pattern,
              nestLevel,
            }),
          );
        });
      }
      // Handle single middleware function
      else if (typeof middleware === "function") {
        queue.push(
          this.attachMetadata(middleware, {
            chain: "main",
            index: queue.length - beforeMiddlewares.length,
            pathname,
            routeKey: pattern,
            nestLevel,
          }),
        );
      }
    });

    // Add after middlewares
    // Extract the middleware array from global middleware configuration
    let afterMiddlewareArray: MiddlewareChain = [];

    if (this.globalMiddleware?.after) {
      afterMiddlewareArray = Array.isArray(this.globalMiddleware.after)
        ? this.globalMiddleware.after
        : [this.globalMiddleware.after];
    }

    // Map middleware array to attach metadata
    const afterMiddlewares = afterMiddlewareArray.map((middleware, index) =>
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
