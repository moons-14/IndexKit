import type { RawImageOrderingStrategy, RawImagePageSource } from "./types";

export const lexicalPageOrderStrategy: RawImageOrderingStrategy = (entries) => {
  return [...entries].sort((left, right) =>
    left.name.localeCompare(right.name, "en", {
      numeric: false,
      sensitivity: "base",
    }),
  );
};

export function applyRawImageOrdering(
  entries: readonly RawImagePageSource[],
  strategy: RawImageOrderingStrategy,
): RawImagePageSource[] {
  return [...strategy(entries)];
}
