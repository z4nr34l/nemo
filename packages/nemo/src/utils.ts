import { NemoEvent } from "./event";

export function mergeContexts(...events: NemoEvent[]): Record<string, unknown> {
  return events.reduce((acc: Record<string, unknown>, event) => {
    for (const [key, value] of Object.entries(event.context)) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

export function createContextSnapshot(
  event: NemoEvent,
): Record<string, unknown> {
  return JSON.parse(JSON.stringify(event.context));
}

export function diffContexts(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): {
  added: string[];
  removed: string[];
  modified: string[];
} {
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  const beforeKeys = new Set(Object.keys(before));
  const afterKeys = new Set(Object.keys(after));

  for (const key of afterKeys) {
    if (!beforeKeys.has(key)) {
      added.push(key);
    } else if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      modified.push(key);
    }
  }

  for (const key of beforeKeys) {
    if (!afterKeys.has(key)) {
      removed.push(key);
    }
  }

  return { added, removed, modified };
}
