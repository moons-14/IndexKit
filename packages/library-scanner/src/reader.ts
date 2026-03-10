import type { ComicReader, FileEntry } from "./types.js";
import { CbrReader } from "./formats/cbr.js";
import { CbzReader } from "./formats/cbz.js";
import { ImageDirReader } from "./formats/image-dir.js";
import { PdfReader } from "./formats/pdf.js";

export function openReader(entry: FileEntry): ComicReader {
  switch (entry.format) {
    case "cbz":
    case "epub":
      return new CbzReader(entry);
    case "cbr":
      return new CbrReader(entry);
    case "pdf":
      return new PdfReader(entry);
    case "image-dir":
      return new ImageDirReader(entry);
    default: {
      const _: never = entry.format;
      throw new Error(`Unsupported format: ${_}`);
    }
  }
}
