import fs from "node:fs";
import type { ComicMetadata, ComicReader, FileEntry, ThumbnailOptions } from "../types.js";
import { isImageFile } from "../utils/detect.js";
import { naturalSort } from "../utils/natural-sort.js";
import { getInt, getList, getText, parseSimpleXml } from "../utils/xml.js";

async function getSharp() {
  const { default: sharp } = await import("sharp");
  return sharp;
}

async function getUnrar() {
  const mod = await import("node-unrar-js");
  return mod;
}

async function openRar(filePath: string) {
  const { createExtractorFromData } = await getUnrar();
  const data = await fs.promises.readFile(filePath);
  return createExtractorFromData({ data: data.buffer as ArrayBuffer });
}

export class CbrReader implements ComicReader {
  readonly entry: FileEntry;

  constructor(entry: FileEntry) {
    this.entry = entry;
  }

  async getMetadata(): Promise<ComicMetadata> {
    const extractor = await openRar(this.entry.path);
    const extracted = extractor.extract({ files: ["ComicInfo.xml"] });
    for (const file of extracted.files) {
      if (file.fileHeader.name === "ComicInfo.xml" && file.extraction) {
        const buf = Buffer.from(file.extraction);
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
    const extractor = await openRar(this.entry.path);
    const list = extractor.getFileList();
    const names: string[] = [];
    for (const header of list.fileHeaders) {
      if (isImageFile(header.name)) {
        names.push(header.name);
      }
    }
    return naturalSort(names);
  }

  async getPage(name: string): Promise<Buffer> {
    const extractor = await openRar(this.entry.path);
    const extracted = extractor.extract({ files: [name] });
    for (const file of extracted.files) {
      if (file.fileHeader.name === name && file.extraction) {
        return Buffer.from(file.extraction);
      }
    }
    throw new Error(`Page not found: ${name}`);
  }

  async close(): Promise<void> {
    // node-unrar-js has no persistent handle to close
  }
}
