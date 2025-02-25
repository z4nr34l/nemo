import { StorageAdapter } from "../adapter";

export class MemoryStorageAdapter extends StorageAdapter {
  private storage: Record<string, unknown> = {};

  constructor(initialContext?: Record<string, unknown>) {
    super();
    if (initialContext) {
      this.storage = { ...initialContext };
    }
  }

  get<T>(key: string): T | any {
    return this.storage[key] as T;
  }

  set<T>(key: string, value: T): void {
    this.storage[key] = value;
  }

  has(key: string): boolean {
    return key in this.storage;
  }

  delete(key: string): boolean {
    const exists = key in this.storage;
    delete this.storage[key];
    return exists;
  }

  clear(): void {
    this.storage = {};
  }

  entries(): IterableIterator<[string, unknown]> {
    return Object.entries(this.storage)[Symbol.iterator]();
  }

  keys(): IterableIterator<string> {
    return Object.keys(this.storage)[Symbol.iterator]();
  }

  values(): IterableIterator<unknown> {
    return Object.values(this.storage)[Symbol.iterator]();
  }

  get size(): number {
    return Object.keys(this.storage).length;
  }

  fromEntries(entries: Iterable<readonly [string, unknown]>): void {
    this.storage = Object.fromEntries(entries);
  }

  toString(): string {
    return JSON.stringify(this.storage);
  }

  fromString(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed !== "object" || parsed === null) {
        return false;
      }
      this.storage = parsed;
      return true;
    } catch {
      return false;
    }
  }
}
