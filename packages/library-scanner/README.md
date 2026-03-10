# @indexkit/library-scanner

Fast, memory-efficient library scanner for CBZ, CBR, PDF, EPUB, and image directories. Designed for large libraries (100k+ files) with a two-phase API: first walk the directory tree yielding `FileEntry` objects without opening files, then lazily open individual files for metadata and thumbnails.

## Features

- **Memory-efficient**: `scan()` never buffers all entries — yields as discovered
- **Format support**: CBZ, EPUB (ZIP-based), CBR (RAR/WASM), PDF, image directories
- **Worker thread pool**: `scanParallel()` uses `worker_threads` for concurrent metadata/thumbnail extraction
- **Natural sort**: page ordering respects numeric sequences (`page-9` < `page-10`)
- **No system dependencies**: CBR via WASM (`node-unrar-js`), no native `unrar` needed

## API

```typescript
import { scan, openReader, scanParallel } from "@indexkit/library-scanner";

// Phase 1: fast directory walk (no file I/O)
for await (const entry of scan({ dir: "/path/to/library" })) {
  console.log(entry.path, entry.format, entry.size);
}

// Phase 2: lazy metadata + thumbnail access
const reader = openReader(entry);
const metadata = await reader.getMetadata();
const thumbnail = await reader.getThumbnail({ width: 300, height: 450 });
const pages = await reader.getPages();
await reader.close();

// Combined parallel scan with worker threads
for await (const result of scanParallel({
  dir: "/path/to/library",
  concurrency: 4,
  extractMetadata: true,
  extractThumbnail: false,
  onProgress: (done, total) => console.log(`${done}/${total}`),
})) {
  console.log(result.entry.path, result.metadata?.title);
}
```

## Types

```typescript
type ComicFormat = "cbz" | "cbr" | "pdf" | "epub" | "image-dir";

interface FileEntry {
  path: string;     // absolute path
  format: ComicFormat;
  size: number;     // bytes
  mtime: Date;
}

interface ComicMetadata {
  title?: string;
  series?: string;
  issueNumber?: number;
  volume?: number;
  // ... see types.ts for full interface
}
```

## Development

```bash
pnpm --filter @indexkit/library-scanner check-types
pnpm --filter @indexkit/library-scanner test
pnpm --filter @indexkit/library-scanner bench
```

## Docker

Docker はモノレポルートの `Dockerfile` / `compose.yml` でプロジェクト全体をビルド・実行します。

```bash
# ビルド
docker compose build

# 走査ベンチマーク
LIBRARY_PATH=/path/to/library docker compose --profile bench up scanner-bench

# 抽出ベンチマーク
LIBRARY_PATH=/path/to/library docker compose --profile bench up extract-bench

# デバッグ (対話シェル)
LIBRARY_PATH=/path/to/library docker compose --profile debug run --rm dev
```
