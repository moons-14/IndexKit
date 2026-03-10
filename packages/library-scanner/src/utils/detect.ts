import path from "node:path";
import type { ComicFormat } from "../types.js";

const EXT_MAP: Record<string, ComicFormat> = {
  ".cbz": "cbz",
  ".epub": "epub",
  ".cbr": "cbr",
  ".pdf": "pdf",
};

export const SUPPORTED_EXTENSIONS = Object.keys(EXT_MAP);

export const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
]);

export function detectFormat(filePath: string): ComicFormat | null {
  const ext = path.extname(filePath).toLowerCase();
  return EXT_MAP[ext] ?? null;
}

export function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

export function isImageDirectory(files: string[]): boolean {
  if (files.length === 0) return false;
  const imageCount = files.filter((f) => isImageFile(f)).length;
  return imageCount / files.length >= 0.5;
}
