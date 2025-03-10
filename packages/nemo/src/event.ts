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
   * Extract URL parameters from the current request path using the middleware's route pattern
   * @param metadata - The metadata from the middleware that processed this request (optional if already set via setCurrentMetadata)
   * @returns An object containing the extracted parameters
   */
  getParams(metadata?: MiddlewareMetadata): Record<string, string | string[]> {
    const meta = metadata || this.currentMetadata;

    if (!meta) {
      return {};
    }

    try {
      // Ensure we're working with the full pattern including any parent paths
      const routePattern = meta.routeKey;
      const pathname = meta.pathname;

      if (!routePattern || !pathname) {
        return {};
      }

      // Create regex with named capture groups from the pattern
      // Use path-to-regexp's match function to extract parameters directly
      const matchRoute = match(routePattern);

      // Execute against the pathname to get params
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
