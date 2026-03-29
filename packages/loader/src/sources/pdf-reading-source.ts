import { basename } from "node:path";

import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";

import { ReadingSource } from "../reading-source";
import type {
  PageDescriptor,
  PageOpenOptions,
  PdfDocumentMetadata,
  PdfReadingSourceMetadata,
  ReadingSourceOpenOptions,
} from "../types";

const DEFAULT_PDF_SCALE = 2;

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
type PdfDocumentProxy =
  import("pdfjs-dist/legacy/build/pdf.mjs").PDFDocumentProxy;
type PdfDocumentLoadingTask =
  import("pdfjs-dist/legacy/build/pdf.mjs").PDFDocumentLoadingTask;

let pdfJsModulePromise: Promise<PdfJsModule> | undefined;

export class PdfReadingSource extends ReadingSource {
  override readonly metadata: PdfReadingSourceMetadata;
  readonly #document: PdfDocumentProxy;
  readonly #loadingTask: PdfDocumentLoadingTask;
  readonly #defaultScale: number;

  private constructor(
    metadata: PdfReadingSourceMetadata,
    document: PdfDocumentProxy,
    loadingTask: PdfDocumentLoadingTask,
    defaultScale: number,
  ) {
    super(metadata);
    this.metadata = metadata;
    this.#document = document;
    this.#loadingTask = loadingTask;
    this.#defaultScale = defaultScale;
  }

  static async create(
    sourcePath: string,
    options: ReadingSourceOpenOptions,
  ): Promise<PdfReadingSource> {
    const pdfJs = await loadPdfJsModule();
    const loadingTask = pdfJs.getDocument({
      isEvalSupported: false,
      url: sourcePath,
      verbosity: pdfJs.VerbosityLevel.ERRORS,
    });
    const document = await loadingTask.promise;
    const metadataResult = await document.getMetadata().catch(() => null);
    const pdfMetadata: PdfDocumentMetadata = {
      fingerprints: document.fingerprints,
      info: objectifyPdfMetadata(metadataResult?.info),
      metadata: readPdfMetadataObject(
        metadataResult?.metadata as
          | { getAll?(): Record<string, unknown> }
          | null
          | undefined,
      ),
    };
    const pages = Array.from({ length: document.numPages }, (_, index) => ({
      index,
      mimeType: "image/png",
      name: `page-${String(index + 1).padStart(4, "0")}.png`,
      size: null,
    }));
    const metadata: PdfReadingSourceMetadata = {
      displayName: basename(sourcePath),
      kind: "pdf",
      pageCount: pages.length,
      pages,
      pdf: pdfMetadata,
      sourcePath,
    };

    return new PdfReadingSource(
      metadata,
      document,
      loadingTask,
      options.pdfScale ?? DEFAULT_PDF_SCALE,
    );
  }

  override async getPage(
    index: number,
    options: PageOpenOptions = {},
  ): Promise<PageDescriptor> {
    const pageInfo = this.getPageInfo(index);
    const scale = options.pdfScale ?? this.#defaultScale;
    const page = await this.#document.getPage(index + 1);
    const viewport = page.getViewport({ scale });

    return {
      ...pageInfo,
      height: Math.ceil(viewport.height),
      openStream: async () => {
        const canvas = createCanvas(
          Math.ceil(viewport.width),
          Math.ceil(viewport.height),
        );
        const context = canvas.getContext("2d");

        await page.render({
          canvas: null,
          canvasContext: context as never,
          viewport,
        }).promise;
        page.cleanup();

        return canvas.encodeStream(
          "png",
        ) as unknown as ReadableStream<Uint8Array>;
      },
      width: Math.ceil(viewport.width),
    };
  }

  override async close(): Promise<void> {
    await this.#document.destroy();
    await this.#loadingTask.destroy();
  }
}

async function loadPdfJsModule(): Promise<PdfJsModule> {
  if (!pdfJsModulePromise) {
    installPdfCanvasGlobals();
    pdfJsModulePromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }

  return pdfJsModulePromise;
}

function installPdfCanvasGlobals(): void {
  if (!("DOMMatrix" in globalThis)) {
    Object.assign(globalThis, { DOMMatrix });
  }

  if (!("ImageData" in globalThis)) {
    Object.assign(globalThis, { ImageData });
  }

  if (!("Path2D" in globalThis)) {
    Object.assign(globalThis, { Path2D });
  }
}

function objectifyPdfMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function readPdfMetadataObject(
  metadata: { getAll?(): Record<string, unknown> } | null | undefined,
): Record<string, unknown> | null {
  if (!metadata?.getAll) {
    return null;
  }

  return metadata.getAll();
}
