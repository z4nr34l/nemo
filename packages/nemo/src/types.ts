import type { NextRequest } from "next/server";
import type { NextMiddlewareResult } from "next/dist/server/web/types";
import type { NemoEvent } from "./event";
import type { StorageAdapter } from "./storage/adapter";

// Re-export NextMiddlewareResult from Next.js for compatibility
export type { NextMiddlewareResult } from "next/dist/server/web/types";

// NextMiddleware uses NemoEvent instead of NextFetchEvent for enhanced functionality
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

export type ChainType = "before" | "main" | "after";

export interface MiddlewareMetadata {
  chain: ChainType;
  index: number;
  pathname: string;
  routeKey: string;
  nestLevel?: number;
}

export type NextMiddlewareWithMeta = NextMiddleware & {
  __nemo?: MiddlewareMetadata;
};
