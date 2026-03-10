export type {
  ComicFormat,
  ComicMetadata,
  ComicReader,
  FileEntry,
  ParallelScanOptions,
  ProcessedEntry,
  ScanOptions,
  ThumbnailOptions,
} from "./types.js";

export { scan } from "./scanner.js";
export { openReader } from "./reader.js";
export { scanParallel } from "./parallel-scanner.js";
