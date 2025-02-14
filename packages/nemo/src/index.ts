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
}

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
   * Propagate the queue of middleware functions for the given request.
   * @param request - The request to propagate the queue for.
   * @returns The queue of middleware functions.
   */
  private propagateQueue(request: NextRequest): NextMiddleware[] {
    let beforeGlobalMiddleware: MiddlewareChain = [];
    if (this.globalMiddleware?.before) {
      beforeGlobalMiddleware = Array.isArray(this.globalMiddleware.before)
        ? this.globalMiddleware.before
        : [this.globalMiddleware.before];
    }

    let afterGlobalMiddleware: MiddlewareChain = [];
    if (this.globalMiddleware?.after) {
      afterGlobalMiddleware = Array.isArray(this.globalMiddleware.after)
        ? this.globalMiddleware.after
        : [this.globalMiddleware.after];
    }

    const allMiddlewareFunctions = [
      ...beforeGlobalMiddleware,
      ...Object.entries(this.middlewares)
        .filter(([key]) => this.matchesPath(key, request.nextUrl.pathname))
        .flatMap(([_, middlewareFunctions]) => {
          return Array.isArray(middlewareFunctions)
            ? middlewareFunctions
            : [middlewareFunctions];
        }),
      ...afterGlobalMiddleware,
    ];

    return allMiddlewareFunctions;
  }

  private async processQueue(
    queue: NextMiddleware[],
    request: NextRequest,
    event: NextFetchEvent,
  ): Promise<NextMiddlewareResult> {
    let result: NextMiddlewareResult;

    for (const middleware of queue) {
      if (this.config.debug) {
        console.log("[NEMO] Executing middleware");
      }

      result = await middleware(request, event);

      if (result) {
        return result;
      }
    }

    return result;
  }

  constructor(
    middlewares: MiddlewareConfig,
    globalMiddleware?: GlobalMiddlewareConfig,
    config?: NemoConfig,
  ) {
    this.config = {
      debug: false,
      ...config,
    };
    this.middlewares = middlewares;
    this.globalMiddleware = globalMiddleware;
  }

  middleware = async (
    request: NextRequest,
    event: NextFetchEvent,
  ): Promise<NextMiddlewareResult> => {
    const queue: NextMiddleware[] = this.propagateQueue(request);

    if (this.config.debug) {
      console.log("[NEMO] Processing request:", request.url);
    }

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
