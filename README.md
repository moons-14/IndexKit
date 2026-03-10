# IndexKit

A fast, modern, self-hosted reading server and reader built with TypeScript. IndexKit lets you browse and read your local comic, manga, and book collection through a clean web interface — think Kavita, but built from the ground up for speed and a modern stack.

## Features

- **Self-hosted** — runs locally, your files never leave your machine
- **Multiple formats** — CBZ, CBR, PDF, EPUB, and directories of images
- **Fast** — optimized for large libraries (100k+ files) with worker-thread parallel scanning
- **Modern stack** — TypeScript monorepo, pnpm + Turbo

## Supported Formats

| Format    | Description                   |
|-----------|-------------------------------|
| CBZ       | Comic Book ZIP archive        |
| CBR       | Comic Book RAR archive (WASM) |
| PDF       | Portable Document Format      |
| EPUB      | Electronic Publication        |
| Directory | Folder of image files         |

---

## Requirements

| Tool       | Version      |
|------------|--------------|
| Node.js    | ≥ 22.20.0    |
| pnpm       | ≥ 10.24.0    |
| Docker     | ≥ 25 (optional, for container runs) |

---

## Local Development

### 1. Install dependencies

```bash
pnpm install
```

> If you use the Nix devshell, enter it first:
> ```bash
> nix develop ~/dotfiles#next-web
> ```

### 2. Build all packages

```bash
pnpm build
```

### 3. Run tests

```bash
# All packages
pnpm --filter '*' test

# library-scanner only
pnpm --filter @indexkit/library-scanner test
```

### 4. Type-check

```bash
pnpm check-types
```

### 5. Lint / Format

```bash
pnpm lint
pnpm format
```

---

## Library Scanner

`@indexkit/library-scanner` is a memory-efficient scanner that walks a directory tree and yields `FileEntry` objects without opening files, then lets you lazily load metadata and thumbnails per file.

### Quick smoke test

Generate fixture CBZ files, then scan them:

```bash
# Generate 20 CBZ files into /tmp/test-library
pnpm --filter @indexkit/cbz-fixture generate -- --count 20 --seed 42 -o /tmp/test-library

# Run the scan benchmark against them
pnpm --filter @indexkit/library-scanner bench
```

### Benchmark options

The scan benchmark accepts a `--count=N` flag to control how many fixture files are generated:

```bash
pnpm --filter @indexkit/library-scanner bench -- --count=1000
```

Output example:

```
=== Scan Benchmark Results ===

1. Walk only (no file I/O)
  files:      1000
  duration:   42ms
  files/sec:  23809
  memory:     18.3MB

3. Walk + metadata parallel (4 workers)
  files:      1000
  duration:   4120ms
  files/sec:  242
  memory:     61.2MB
```

### Use the scanner API in code

```typescript
import { scan, openReader, scanParallel } from "@indexkit/library-scanner";

// Phase 1: fast walk — no file I/O
for await (const entry of scan({ dir: "/my/library" })) {
  console.log(entry.path, entry.format, entry.size);
}

// Phase 2: open a file lazily
const reader = openReader(entry);
const metadata  = await reader.getMetadata();
const thumbnail = await reader.getThumbnail({ width: 300, height: 450 });
const pages     = await reader.getPages();
await reader.close();

// Combined parallel scan with worker threads
for await (const result of scanParallel({
  dir: "/my/library",
  concurrency: 4,
  extractMetadata: true,
  onProgress: (done, total) => console.log(`${done}/${total}`),
})) {
  console.log(result.entry.path, result.metadata?.title);
}
```

---

## Docker

The root `Dockerfile` builds the **entire monorepo** in a single image. All packages under `packages/` and `apps/` are compiled and available inside the container.

### Build the image

```bash
docker compose build
```

### Run the scan benchmark

```bash
# Point LIBRARY_PATH at a directory of CBZ/PDF/EPUB files on your host
LIBRARY_PATH=/path/to/your/library docker compose --profile bench up scanner-bench
```

If you don't have a library handy, generate fixtures first:

```bash
pnpm --filter @indexkit/cbz-fixture generate -- --count 500 --seed 42 -o /tmp/test-library
LIBRARY_PATH=/tmp/test-library docker compose --profile bench up scanner-bench
```

### Run the metadata + thumbnail extraction benchmark

```bash
LIBRARY_PATH=/path/to/your/library docker compose --profile bench up extract-bench
```

### Open a debug shell inside the container

```bash
LIBRARY_PATH=/path/to/your/library docker compose --profile debug run --rm dev
```

From inside the shell you can run any package script, e.g.:

```sh
node packages/library-scanner/dist/bench/scan-bench.js --count=100
node packages/library-scanner/dist/bench/extract-bench.js --count=20
```

### Available Compose services

| Service        | Profile  | Description                                      |
|----------------|----------|--------------------------------------------------|
| `scanner-bench`| `bench`  | Directory walk + metadata benchmark (default 10k files) |
| `extract-bench`| `bench`  | Metadata + thumbnail extraction benchmark        |
| `dev`          | `debug`  | Interactive shell for manual testing             |

### Environment variables

| Variable       | Default              | Description                          |
|----------------|----------------------|--------------------------------------|
| `LIBRARY_PATH` | `/tmp/test-library`  | Host path mounted as `/library` (read-only) |
| `WORKER_COUNT` | `4`                  | Parallel worker threads for scanning |

---

## Project Structure

```
IndexKit/
├── packages/
│   ├── cbz-fixture/        # CLI to generate test CBZ files
│   └── library-scanner/    # Core scanner library (@indexkit/library-scanner)
├── apps/                   # Application packages (coming soon)
├── Dockerfile              # Monorepo-wide image (builds all packages)
├── compose.yml             # Docker Compose services
└── turbo.json              # Turbo task pipeline
```

## License

MIT
