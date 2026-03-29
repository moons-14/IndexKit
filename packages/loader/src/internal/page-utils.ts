import { extname } from "node:path";

import type { PageInfo } from "../types";

const IMAGE_MIME_BY_EXTENSION = new Map<string, string>([
  [".avif", "image/avif"],
  [".bmp", "image/bmp"],
  [".gif", "image/gif"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".tif", "image/tiff"],
  [".tiff", "image/tiff"],
  [".webp", "image/webp"],
]);

export function getImageMimeType(pathLike: string): string | null {
  return IMAGE_MIME_BY_EXTENSION.get(extname(pathLike).toLowerCase()) ?? null;
}

export function buildPageInfoList(
  entries: ReadonlyArray<{
    readonly mimeType: string;
    readonly name: string;
    readonly size: number | null;
  }>,
): PageInfo[] {
  return entries.map((entry, index) => ({
    index,
    mimeType: entry.mimeType,
    name: entry.name,
    size: entry.size,
  }));
}
