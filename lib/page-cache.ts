// Remembers the last data each page loaded, so going back to a page shows it right away while fresh data loads
// quietly in the background (no skeleton flash). Lives in memory only, so it resets on a full reload.
const store = new Map<string, unknown>();

export function cacheGet<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function cacheSet(key: string, value: unknown): void {
  store.set(key, value);
}
