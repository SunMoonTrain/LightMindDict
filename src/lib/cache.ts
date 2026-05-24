import { DictEntry, SourceId } from "./types";

const MAX_ENTRIES = 200;
const store = new Map<string, DictEntry>();

function key(sourceId: SourceId, query: string): string {
  return `${sourceId}:${query}`;
}

export function getCached(
  sourceId: SourceId,
  query: string,
): DictEntry | undefined {
  const k = key(sourceId, query);
  const entry = store.get(k);
  if (entry) {
    store.delete(k);
    store.set(k, entry);
  }
  return entry;
}

export function setCached(
  sourceId: SourceId,
  query: string,
  entry: DictEntry,
): void {
  const k = key(sourceId, query);
  store.delete(k);
  store.set(k, entry);
  if (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
}
