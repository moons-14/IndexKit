const CHUNK_RE = /(\d+)|(\D+)/g;

function toChunks(s: string): Array<string | number> {
  const chunks: Array<string | number> = [];
  for (const m of s.matchAll(CHUNK_RE)) {
    chunks.push(m[1] !== undefined ? Number(m[1]) : m[2] ?? "");
  }
  return chunks;
}

export function naturalCompare(a: string, b: string): number {
  const ca = toChunks(a.toLowerCase());
  const cb = toChunks(b.toLowerCase());
  const len = Math.max(ca.length, cb.length);
  for (let i = 0; i < len; i++) {
    const ai = ca[i];
    const bi = cb[i];
    if (ai === undefined) return -1;
    if (bi === undefined) return 1;
    if (typeof ai === "number" && typeof bi === "number") {
      if (ai !== bi) return ai - bi;
    } else {
      const as = String(ai);
      const bs = String(bi);
      if (as < bs) return -1;
      if (as > bs) return 1;
    }
  }
  return 0;
}

export function naturalSort<T>(arr: T[], key?: (item: T) => string): T[] {
  const getKey = key ?? ((item: T) => String(item));
  return [...arr].sort((a, b) => naturalCompare(getKey(a), getKey(b)));
}
