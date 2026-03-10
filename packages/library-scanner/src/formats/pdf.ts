import fs from "node:fs";
import type { ComicMetadata, ComicReader, FileEntry, ThumbnailOptions } from "../types.js";

async function getSharp() {
  const { default: sharp } = await import("sharp");
  return sharp;
}

async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjs;
}

export class PdfReader implements ComicReader {
  readonly entry: FileEntry;

  constructor(entry: FileEntry) {
    this.entry = entry;
  }

  async getMetadata(): Promise<ComicMetadata> {
    const pdfjs = await getPdfjs();
    const data = await fs.promises.readFile(this.entry.path);
    const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
    try {
      const meta = await doc.getMetadata();
      const info = meta.info as Record<string, unknown>;
      return {
        title: typeof info["Title"] === "string" ? info["Title"] : undefined,
        pdfAuthor: typeof info["Author"] === "string" ? info["Author"] : undefined,
        pdfSubject: typeof info["Subject"] === "string" ? info["Subject"] : undefined,
        pageCount: doc.numPages,
      };
    } finally {
      await doc.destroy();
    }
  }

  async getThumbnail(opts?: ThumbnailOptions): Promise<Buffer> {
    const width = opts?.width ?? 300;
    const height = opts?.height ?? 450;
    const fmt = opts?.format ?? "jpeg";
    const quality = opts?.quality ?? 80;

    const pdfjs = await getPdfjs();
    const data = await fs.promises.readFile(this.entry.path);
    const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
    try {
      const page = await doc.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });

      // Try to use canvas if available, otherwise return a placeholder
      try {
        const { createCanvas } = await import("canvas");
        const canvas = createCanvas(viewport.width, viewport.height);
        const ctx = canvas.getContext("2d") as unknown;
        await page.render({
          canvasContext: ctx as CanvasRenderingContext2D,
          viewport,
        }).promise;

        const pngBuffer = canvas.toBuffer("image/png");
        const sharp = await getSharp();
        return sharp(pngBuffer)
          .resize(width, height, { fit: "inside" })
          [fmt]({ quality })
          .toBuffer();
      } catch {
        // canvas not available — return a minimal 1x1 placeholder
        const sharp = await getSharp();
        return sharp({
          create: {
            width: 1,
            height: 1,
            channels: 3,
            background: { r: 200, g: 200, b: 200 },
          },
        })
          .resize(width, height, { fit: "contain", background: { r: 200, g: 200, b: 200 } })
          [fmt]({ quality })
          .toBuffer();
      }
    } finally {
      await doc.destroy();
    }
  }

  async getPages(): Promise<string[]> {
    const pdfjs = await getPdfjs();
    const data = await fs.promises.readFile(this.entry.path);
    const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
    try {
      const pages: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        pages.push(`page-${i}`);
      }
      return pages;
    } finally {
      await doc.destroy();
    }
  }

  async getPage(name: string): Promise<Buffer> {
    const match = name.match(/^page-(\d+)$/);
    if (!match) throw new Error(`Invalid page name: ${name}`);
    const pageNum = Number(match[1]);

    const pdfjs = await getPdfjs();
    const data = await fs.promises.readFile(this.entry.path);
    const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });

      const { createCanvas } = await import("canvas");
      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext("2d") as unknown;
      await page.render({
        canvasContext: ctx as CanvasRenderingContext2D,
        viewport,
      }).promise;

      return canvas.toBuffer("image/png");
    } finally {
      await doc.destroy();
    }
  }

  async close(): Promise<void> {
    // No persistent handle
  }
}
