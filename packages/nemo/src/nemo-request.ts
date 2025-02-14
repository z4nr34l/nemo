import { NextRequest } from "next/server";

/**
 * A wrapper around NextRequest that allows for additional context to be passed
 * through the middleware chain.
 * @param input - The input for the request
 * @param init - The init for the request
 * @param context - The context to pass through the middleware chain
 * @returns A new NemoRequest instance
 */
export class NemoRequest extends NextRequest {
  public context: Map<string, unknown>;

  constructor(
    input: RequestInfo | URL,
    init: RequestInit,
    context: Map<string, unknown> = new Map(),
  ) {
    super(input, init as never);
    this.context = context;
  }

  static from(
    request: NextRequest,
    context: Map<string, unknown> = new Map(),
  ): NemoRequest {
    const nemoRequest = new NemoRequest(
      request.url,
      {
        body: request.body,
        method: request.method,
        headers: request.headers,
      },
      context,
    );

    // Copy over any additional properties
    Object.assign(nemoRequest, request);

    return nemoRequest;
  }
}
