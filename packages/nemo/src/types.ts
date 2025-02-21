import type { NextRequest, NextResponse } from "next/server";
import type { NemoEvent } from "./event";

export type NextMiddlewareResult =
  | NextResponse
  | Response
  | null
  | undefined
  | void;
export type NextMiddleware = (
  request: NextRequest,
  event: NemoEvent,
) => NextMiddlewareResult | Promise<NextMiddlewareResult>;

export type MiddlewareContext = Map<string, unknown>;

export interface NemoRequest extends NextRequest {
  context: MiddlewareContext;
}

export type ErrorHandler = (
  error: Error,
  metadata: MiddlewareMetadata,
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

export interface MiddlewareMetadata {
  chain: "before" | "main" | "after";
  index: number;
  pathname: string;
  routeKey: string;
}

export type NextMiddlewareWithMeta = NextMiddleware & {
  __nemo?: MiddlewareMetadata;
};
