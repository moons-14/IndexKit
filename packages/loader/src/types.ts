import type { ReadableStream } from "node:stream/web";

export type ReadingSourceKind = "cbz" | "cbr" | "pdf" | "raw-images";

export interface ComicInfoMetadata {
  readonly raw: Readonly<Record<string, unknown>>;
}

export interface PdfDocumentMetadata {
  readonly fingerprints: readonly (string | null)[];
  readonly info: Readonly<Record<string, unknown>>;
  readonly metadata: Readonly<Record<string, unknown>> | null;
}

export interface PageInfo {
  readonly index: number;
  readonly name: string;
  readonly mimeType: string;
  readonly size: number | null;
}

export interface PageDescriptor extends PageInfo {
  readonly width: number | null;
  readonly height: number | null;
  openStream(): Promise<ReadableStream<Uint8Array>>;
}

export interface ReadingSourceMetadataBase {
  readonly kind: ReadingSourceKind;
  readonly sourcePath: string;
  readonly displayName: string;
  readonly pageCount: number;
  readonly pages: readonly PageInfo[];
}

export interface CbzReadingSourceMetadata extends ReadingSourceMetadataBase {
  readonly kind: "cbz";
  readonly comicInfo: ComicInfoMetadata | null;
}

export interface CbrReadingSourceMetadata extends ReadingSourceMetadataBase {
  readonly kind: "cbr";
  readonly comicInfo: ComicInfoMetadata | null;
}

export interface PdfReadingSourceMetadata extends ReadingSourceMetadataBase {
  readonly kind: "pdf";
  readonly pdf: PdfDocumentMetadata;
}

export interface RawImagesReadingSourceMetadata
  extends ReadingSourceMetadataBase {
  readonly kind: "raw-images";
}

export type ReadingSourceMetadata =
  | CbzReadingSourceMetadata
  | CbrReadingSourceMetadata
  | PdfReadingSourceMetadata
  | RawImagesReadingSourceMetadata;

export interface PageOpenOptions {
  readonly pdfScale?: number;
}

export interface RawImagePageSource {
  readonly name: string;
  readonly absolutePath: string;
  readonly size: number;
  readonly mimeType: string;
}

export type RawImageOrderingStrategy = (
  entries: readonly RawImagePageSource[],
) => readonly RawImagePageSource[];

export interface ReadingSourceOpenOptions {
  readonly pdfScale?: number;
  readonly rawImageOrdering?: RawImageOrderingStrategy;
}

export interface LoaderOptions extends ReadingSourceOpenOptions {}
