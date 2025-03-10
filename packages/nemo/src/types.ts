import type { NextRequest, NextResponse } from "next/server";
import type { NemoEvent } from "./event";
import type { StorageAdapter } from "./storage/adapter";

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

export type ErrorHandler = (
  error: Error,
  metadata: MiddlewareMetadata,
) => NextMiddlewareResult | Promise<NextMiddlewareResult>;

export type MiddlewareChain = NextMiddleware | NextMiddleware[];

export type MiddlewareConfigValue =
  | NextMiddleware
  | NextMiddleware[]
  | { [key: `/${string}`]: MiddlewareConfigValue }
  | {
      middleware: NextMiddleware | NextMiddleware[];
      [key: `/${string}`]: MiddlewareConfigValue;
    };

export type MiddlewareConfig = Record<string, MiddlewareConfigValue>;

export type GlobalMiddlewareConfig = Partial<
  Record<"before" | "after", MiddlewareChain>
>;

export interface Storage {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface NemoConfig {
  debug?: boolean;
  silent?: boolean;
  errorHandler?: ErrorHandler;
  enableTiming?: boolean;
  storage?: StorageAdapter | (() => StorageAdapter); // Updated storage type
}

export interface MiddlewareMetadata {
  chain: "before" | "main" | "after";
  index: number;
  pathname: string;
  routeKey: string;
  nestLevel?: number;
}

export type NextMiddlewareWithMeta = NextMiddleware & {
  __nemo?: MiddlewareMetadata;
};
