import fs from "node:fs";
import path from "node:path";
import type { ComicMetadata, ComicReader, FileEntry, ThumbnailOptions } from "../types.js";
import { isImageFile } from "../utils/detect.js";
import { naturalSort } from "../utils/natural-sort.js";
import { getInt, getList, getText, parseSimpleXml } from "../utils/xml.js";

async function getSharp() {
  const { default: sharp } = await import("sharp");
  return sharp;
}

async function openZip(filePath: string) {
  const yauzl = await import("yauzl-promise");
  // Use fromBuffer to avoid "Cannot close while reading in progress" errors
  // when breaking early from the async iterator.
  const data = await fs.promises.readFile(filePath);
  return yauzl.fromBuffer(data);
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
    } else if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(Buffer.from(chunk as Uint8Array));
    }
  }
  return Buffer.concat(chunks);
}

export class CbzReader implements ComicReader {
  readonly entry: FileEntry;

  constructor(entry: FileEntry) {
    this.entry = entry;
  }

  async getMetadata(): Promise<ComicMetadata> {
    const zip = await openZip(this.entry.path);
    try {
      for await (const zipEntry of zip) {
        if (path.basename(zipEntry.filename) === "ComicInfo.xml") {
          const stream = await zipEntry.openReadStream();
          const buf = await streamToBuffer(stream);
          const xml = buf.toString("utf-8");
          const node = parseSimpleXml(xml);
          const manga = getText(node, "Manga");
          return {
            title: getText(node, "Title"),
            series: getText(node, "Series"),
            issueNumber: getInt(node, "Number"),
            volume: getInt(node, "Volume"),
            summary: getText(node, "Summary"),
            year: getInt(node, "Year"),
            month: getInt(node, "Month"),
            writers: getList(node, "Writer"),
            publisher: getText(node, "Publisher"),
            genre: getText(node, "Genre"),
            pageCount: getInt(node, "PageCount"),
            lang: getText(node, "LanguageISO"),
            ageRating: getText(node, "AgeRating"),
            manga: manga ? manga.toLowerCase() !== "no" : undefined,
          };
        }
      }
    } finally {
      await zip.close();
    }
    return {};
  }

  async getThumbnail(opts?: ThumbnailOptions): Promise<Buffer> {
    const width = opts?.width ?? 300;
    const height = opts?.height ?? 450;
    const fmt = opts?.format ?? "jpeg";
    const quality = opts?.quality ?? 80;

    const pages = await this.getPages();
    if (pages.length === 0) {
      throw new Error(`No pages found in ${this.entry.path}`);
    }

    const pageBuffer = await this.getPage(pages[0]!);
    const sharp = await getSharp();
    return sharp(pageBuffer)
      .resize(width, height, { fit: "inside" })
      [fmt]({ quality })
      .toBuffer();
  }

  async getPages(): Promise<string[]> {
    const zip = await openZip(this.entry.path);
    const names: string[] = [];
    try {
      for await (const zipEntry of zip) {
        if (isImageFile(zipEntry.filename)) {
          names.push(zipEntry.filename);
        }
      }
    } finally {
      await zip.close();
    }
    return naturalSort(names);
  }

  async getPage(name: string): Promise<Buffer> {
    const zip = await openZip(this.entry.path);
    try {
      for await (const zipEntry of zip) {
        if (zipEntry.filename === name) {
          const stream = await zipEntry.openReadStream();
          return await streamToBuffer(stream);
        }
      }
    } finally {
      await zip.close();
    }
    throw new Error(`Page not found: ${name}`);
  }

  async close(): Promise<void> {
    // No persistent handle; opened/closed per operation
  }
}
