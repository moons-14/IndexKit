export type ComicFormat = "cbz" | "cbr" | "pdf" | "epub" | "image-dir";

export interface FileEntry {
  path: string;
  format: ComicFormat;
  size: number;
  mtime: Date;
}

export interface ComicMetadata {
  title?: string;
  series?: string;
  issueNumber?: number;
  volume?: number;
  summary?: string;
  year?: number;
  month?: number;
  writers?: string[];
  publisher?: string;
  genre?: string;
  pageCount?: number;
  lang?: string;
  ageRating?: string;
  manga?: boolean;
  // fallback for PDF
  pdfAuthor?: string;
  pdfSubject?: string;
}

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  format?: "jpeg" | "webp" | "png";
  quality?: number;
}

export interface ComicReader {
  readonly entry: FileEntry;
  getMetadata(): Promise<ComicMetadata>;
  getThumbnail(opts?: ThumbnailOptions): Promise<Buffer>;
  getPages(): Promise<string[]>;
  getPage(name: string): Promise<Buffer>;
  close(): Promise<void>;
}

export interface ScanOptions {
  dir: string;
  recursive?: boolean;
  extensions?: string[];
  concurrency?: number;
  followSymlinks?: boolean;
}

export interface ParallelScanOptions extends ScanOptions {
  extractMetadata?: boolean;
  extractThumbnail?: boolean;
  thumbnailOptions?: ThumbnailOptions;
  onProgress?: (done: number, total: number) => void;
}

export interface ProcessedEntry {
  entry: FileEntry;
  metadata?: ComicMetadata;
  thumbnail?: Buffer;
  error?: Error;
}

export interface WorkerTask {
  path: string;
  format: ComicFormat;
  size: number;
  mtime: string;
  extractMetadata: boolean;
  extractThumbnail: boolean;
  thumbnailOptions?: ThumbnailOptions;
}

export interface WorkerResult {
  path: string;
  metadata?: ComicMetadata;
  thumbnail?: ArrayBuffer;
  error?: string;
}
