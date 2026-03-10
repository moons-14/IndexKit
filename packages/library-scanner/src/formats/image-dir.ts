import fs from "node:fs";
import path from "node:path";
import type { ComicMetadata, ComicReader, FileEntry, ThumbnailOptions } from "../types.js";
import { isImageFile } from "../utils/detect.js";
import { naturalSort } from "../utils/natural-sort.js";

async function getSharp() {
  const { default: sharp } = await import("sharp");
  return sharp;
}

export class ImageDirReader implements ComicReader {
  readonly entry: FileEntry;

  constructor(entry: FileEntry) {
    this.entry = entry;
  }

  async getMetadata(): Promise<ComicMetadata> {
    const pages = await this.getPages();
    return {
      title: path.basename(this.entry.path),
      pageCount: pages.length,
    };
  }

  async getThumbnail(opts?: ThumbnailOptions): Promise<Buffer> {
    const width = opts?.width ?? 300;
    const height = opts?.height ?? 450;
    const fmt = opts?.format ?? "jpeg";
    const quality = opts?.quality ?? 80;

    const pages = await this.getPages();
    if (pages.length === 0) {
      throw new Error(`No images found in ${this.entry.path}`);
    }

    const firstPage = pages[0]!;
    const imgPath = path.join(this.entry.path, firstPage);
    const sharp = await getSharp();
    return sharp(imgPath)
      .resize(width, height, { fit: "inside" })
      [fmt]({ quality })
      .toBuffer();
  }

  async getPages(): Promise<string[]> {
    const entries = await fs.promises.readdir(this.entry.path, {
      withFileTypes: true,
    });
    const images = entries
      .filter((e) => e.isFile() && isImageFile(e.name))
      .map((e) => e.name);
    return naturalSort(images);
  }

  async getPage(name: string): Promise<Buffer> {
    const imgPath = path.join(this.entry.path, name);
    return fs.promises.readFile(imgPath);
  }

  async close(): Promise<void> {
    // Nothing to close
  }
}
