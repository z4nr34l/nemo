import type { WaitUntil } from "next/dist/server/after/builtin-request-context";
import type { NextRequest } from "next/server";
import { match } from "path-to-regexp";
import type { StorageAdapter } from "./storage/adapter";
import { MemoryStorageAdapter } from "./storage/adapters/memory";
import type { MiddlewareMetadata } from "./types";

// Change from private symbols to Symbol.for()
const responseSymbol = Symbol.for("response");
const passThroughSymbol = Symbol.for("passThrough");
const waitUntilSymbol = Symbol.for("waitUntil");

export class FetchEvent implements Event {
  // TODO(after): get rid of the 'internal' variant and always use an external waitUntil
  // (this means removing `FetchEventResult.waitUntil` which also requires a builder change)
  readonly [waitUntilSymbol]:
    | { kind: "internal"; promises: Promise<any>[] }
    | { kind: "external"; function: WaitUntil };

  private [responseSymbol]: Promise<Response> | null = null;
  private [passThroughSymbol] = false;
  private hasResponded = false;

  bubbles = false;
  cancelBubble = false;
  cancelable = false;
  composed = false;
  currentTarget = null;
  defaultPrevented = false;
  eventPhase = 0;
  isTrusted = true;
  returnValue = true;
  srcElement = null;
  target = null;
  timeStamp = Date.now();
  type = "fetch";
  readonly NONE: 0 = 0;
  readonly CAPTURING_PHASE: 1 = 1;
  readonly AT_TARGET: 2 = 2;
  readonly BUBBLING_PHASE: 3 = 3;

  constructor(_request: Request, waitUntil?: WaitUntil) {
    this[waitUntilSymbol] = waitUntil
      ? { kind: "external", function: waitUntil }
      : { kind: "internal", promises: [] };
  }

  composedPath(): EventTarget[] {
    throw new Error("Method not implemented.");
  }
  initEvent(type: string, bubbles?: boolean, cancelable?: boolean): void {
    throw new Error("Method not implemented.");
  }
  preventDefault(): void {
    throw new Error("Method not implemented.");
  }
  stopImmediatePropagation(): void {
    throw new Error("Method not implemented.");
  }
  stopPropagation(): void {
    throw new Error("Method not implemented.");
  }

  // TODO: is this dead code? NextFetchEvent never lets this get called
  respondWith(response: Response | Promise<Response>): void {
    if (this.hasResponded) {
      throw new Error("FetchEvent.respondWith() has already been called");
    }
    this.hasResponded = true;
    this[responseSymbol] = Promise.resolve(response);
  }

  // TODO: is this dead code? passThroughSymbol is unused
  passThroughOnException(): void {
    this[passThroughSymbol] = true;
  }

  waitUntil(promise: Promise<any>): void {
    if (this.hasResponded) {
      throw new Error(
        "FetchEvent.waitUntil() cannot be called after response has been sent",
      );
    }
    if (this[waitUntilSymbol].kind === "external") {
      // if we received an external waitUntil, we delegate to it
      // TODO(after): this will make us not go through `getServerError(error, 'edge-server')` in `sandbox`
      const waitUntil = this[waitUntilSymbol].function;
      return waitUntil(promise);
    } else {
      // if we didn't receive an external waitUntil, we make it work on our own
      // (and expect the caller to do something with the promises)
      this[waitUntilSymbol].promises.push(promise);
    }
  }
}

export function getWaitUntilPromiseFromEvent(
  event: FetchEvent,
): Promise<void> | undefined {
  return event[waitUntilSymbol].kind === "internal"
    ? Promise.all(event[waitUntilSymbol].promises).then(() => {})
    : undefined;
}

export class NextFetchEvent extends FetchEvent {
  sourcePage: string;

  constructor(params: {
    request: NextRequest;
    page: string;
    context: { waitUntil: WaitUntil } | undefined;
  }) {
    super(params.request, params.context?.waitUntil);
    this.sourcePage = params.page;
  }
}

/**
 * A wrapper around NextFetchEvent that allows for additional context to be passed
 * through the middleware chain.
 */
export class NemoEvent extends NextFetchEvent {
  storage: StorageAdapter;
  private currentMetadata?: MiddlewareMetadata;

  constructor(params: {
    request: NextRequest;
    sourcePage: string;
    context?: {
      waitUntil: WaitUntil;
    };
    nemo?: Record<string, unknown>;
    storage?: StorageAdapter;
  }) {
    super(params as never);
    this.storage = params.storage || new MemoryStorageAdapter(params.nemo);
  }

  /**
   * Updates the current middleware metadata
   * @param metadata - The metadata from the middleware that's currently being processed
   */
  setCurrentMetadata(metadata: MiddlewareMetadata): void {
    this.currentMetadata = metadata;
  }

  /**
   * Extract URL parameters from a path using a route pattern
   * @private
   * @param routePattern - The route pattern with parameter placeholders
   * @param pathname - The actual pathname to extract parameters from
   * @returns An object containing the extracted parameters
   */
  private extractParamsFromPath(
    routePattern: string,
    pathname: string,
  ): Record<string, string | string[]> {
    if (!routePattern || !pathname) {
      return {};
    }

    try {
      // Use path-to-regexp's match function to extract parameters directly
      const matchRoute = match(routePattern);
      const result = matchRoute(pathname);

      if (!result) {
        return {};
      }

      return (result.params as Record<string, string | string[]>) || {};
    } catch (error) {
      console.error("Error extracting URL parameters:", error);
      return {};
    }
  }

  /**
   * Extract URL parameters from a path using a route pattern
   * @param options - Options for parameter extraction
   * @param options.metadata - The metadata from the middleware (optional if currentMetadata is set)
   * @param options.routePattern - The route pattern with parameter placeholders (optional)
   * @param options.pathname - The actual pathname to extract parameters from (optional)
   * @returns An object containing the extracted parameters
   */
  getParams(
    options?:
      | MiddlewareMetadata
      | {
          metadata?: MiddlewareMetadata;
          routePattern?: string;
          pathname?: string;
        },
  ): Record<string, string | string[]> {
    // Handle backward compatibility with just metadata parameter
    if (options && "chain" in options) {
      // It's the old-style metadata parameter
      const meta = options || this.currentMetadata;

      if (!meta) {
        return {};
      }

      return this.extractParamsFromPath(meta.routeKey, meta.pathname);
    }

    // Handle new options object
    if (options && typeof options === "object") {
      // If direct pattern and path are provided, use those
      if (options.routePattern && options.pathname) {
        return this.extractParamsFromPath(
          options.routePattern,
          options.pathname,
        );
      }

      // Use provided metadata or fall back to current metadata
      const meta = options.metadata || this.currentMetadata;

      if (!meta) {
        return {};
      }

      return this.extractParamsFromPath(meta.routeKey, meta.pathname);
    }

    // No options provided, use current metadata
    if (!this.currentMetadata) {
      return {};
    }

    return this.extractParamsFromPath(
      this.currentMetadata.routeKey,
      this.currentMetadata.pathname,
    );
  }

  static from(
    event: NextFetchEvent,
    nemoContext: Record<string, unknown> = {},
    storage?: StorageAdapter,
  ): NemoEvent {
    // @ts-expect-error - accessing private property
    const original = event._raw || {};

    return new NemoEvent({
      request: original.request,
      sourcePage: event.sourcePage,
      context: original.context,
      nemo: nemoContext,
      storage: storage || new MemoryStorageAdapter(nemoContext),
    });
  }
}
