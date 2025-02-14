import type { WaitUntil } from "next/dist/server/after/builtin-request-context";
import type { NextRequest } from "next/server";

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
  public context: Map<string, unknown>;

  constructor(params: {
    request: NextRequest;
    page: string;
    context?: {
      waitUntil: (promise: Promise<any>) => void;
    };
    nemo?: Map<string, unknown>;
  }) {
    super(params as never);
    if (params.nemo !== undefined && !(params.nemo instanceof Map)) {
      throw new Error(
        "NemoEvent context must be an instance of Map or undefined",
      );
    }
    this.context = params.nemo || new Map();
  }

  static from(
    event: NextFetchEvent,
    context: Map<string, unknown> = new Map(),
  ): NemoEvent {
    // @ts-expect-error - accessing private property
    const original = event._raw || {};

    return new NemoEvent({
      request: original.request,
      page: original.page || "/",
      context: original.context,
      nemo: context,
    });
  }
}
