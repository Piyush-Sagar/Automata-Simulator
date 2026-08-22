let counter = 0;

export function createId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export function canonicalSetKey(ids: Iterable<string>): string {
  const unique = new Set(ids);
  return [...unique].sort().join(",");
}

export function setKeyToIds(key: string): string[] {
  if (key === "") return [];
  return key.split(",");
}

export function formatIdSet(labels: Map<string, string>, ids: Iterable<string>): string {
  const parts = [...new Set(ids)].map((id) => labels.get(id) ?? id).sort();
  return `{${parts.join(",")}}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

export function uniqueBy<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}
