export abstract class StorageAdapter {
  abstract get<T>(key: string): T | undefined;
  abstract set<T>(key: string, value: T): void;
  abstract has(key: string): boolean;
  abstract delete(key: string): boolean;
  abstract clear(): void;
  abstract entries(): IterableIterator<[string, unknown]>;
  abstract keys(): IterableIterator<string>;
  abstract values(): IterableIterator<unknown>;
  abstract get size(): number;
  abstract fromEntries(entries: Iterable<readonly [string, unknown]>): void;
  abstract toString(): string;
  abstract fromString(json: string): boolean;

  constructor(initialContext?: Record<string, unknown>) {}
}
