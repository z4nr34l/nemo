export class ContextManager {
  private store: Map<string, unknown>;

  constructor() {
    this.store = new Map();
  }

  get(): Map<string, unknown> {
    return new Map(this.store);
  }

  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  clear(): void {
    this.store = new Map();
  }
}
