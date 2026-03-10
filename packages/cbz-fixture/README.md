# @indexkit/cbz-fixture

Generates test CBZ files with randomized images and `ComicInfo.xml` metadata. Designed for populating test libraries with realistic-looking data including varied page counts, image dimensions, author names, and series groupings.

## Usage

```bash
# Run directly without building
pnpm generate [options]

# Or build first, then use the binary
pnpm build
cbz-fixture [options]
```

## Options

### Generation

| Option | Default | Description |
|--------|---------|-------------|
| `-o, --output <dir>` | `./fixtures` | Output directory |
| `-n, --count <number>` | `10` | Number of CBZ files to generate |
| `--seed <number>` | _(random)_ | Random seed for reproducible output |

### Pages

| Option | Default | Description |
|--------|---------|-------------|
| `--min-pages <number>` | `8` | Minimum pages per file |
| `--max-pages <number>` | `48` | Maximum pages per file |

### Images

| Option | Default | Description |
|--------|---------|-------------|
| `--format <jpeg\|png>` | `jpeg` | Image format |
| `--quality <number>` | `80` | JPEG quality (1–100) |
| `--min-width <number>` | `720` | Minimum image width (px) |
| `--max-width <number>` | `1200` | Maximum image width (px) |
| `--min-height <number>` | `1024` | Minimum image height (px) |
| `--max-height <number>` | `1800` | Maximum image height (px) |
| `--page-numbers` | `false` | Draw page number and title on each image |

### Metadata (ComicInfo.xml)

| Option | Default | Description |
|--------|---------|-------------|
| `--author-pool <number>` | `5` | Unique authors to draw from (enables repetition across files) |
| `--lang <code>` | `en` | Language ISO code |
| `--genre <genre>` | _(random)_ | Fix genre for all files |
| `--age-rating <rating>` | _(random)_ | Fix age rating: `Everyone`, `Teen`, or `Mature` |
| `--no-metadata` | — | Skip `ComicInfo.xml` entirely |

### Series mode

When `--series` is enabled, files are grouped into named series with sequential issue numbers and volume metadata.

| Option | Default | Description |
|--------|---------|-------------|
| `--series` | `false` | Group files into named series |
| `--series-count <number>` | `3` | Number of series to generate |
| `--max-issues <number>` | `6` | Maximum issues per series |

### Output

| Option | Default | Description |
|--------|---------|-------------|
| `--prefix <string>` | — | Filename prefix for all generated files |
| `--verbose` | `false` | Print per-file details |
| `--dry-run` | `false` | Preview filenames and metadata without writing files |

## Examples

```bash
# 20 files with a small author pool (many files share authors)
pnpm generate -- -n 20 --author-pool 4 -o ./fixtures

# Reproducible output using a seed
pnpm generate -- -n 50 --seed 42 -o ./fixtures

# Large manga-style library: series, many issues, right-to-left sizing
pnpm generate -- --series --series-count 10 --max-issues 12 -n 80 \
  --min-width 784 --max-width 784 --min-height 1145 --max-height 1145 \
  --genre Manga --lang ja -o ./fixtures/manga

# High-resolution US comics with page numbers visible
pnpm generate -- -n 30 --min-width 1024 --max-width 1024 \
  --min-height 1566 --max-height 1566 --page-numbers \
  --genre Action -o ./fixtures/comics

# PNG format, fixed genre, verbose output
pnpm generate -- -n 5 --format png --genre Horror --verbose --dry-run

# Prefixed filenames
pnpm generate -- -n 10 --prefix "TEST" -o ./fixtures
```

## Implementation Notes

- **Images** are solid-color JPEG/PNG pages. Color varies per page within a consistent hue per book. If `--page-numbers` is set, the page number and title are composited via SVG (requires `sharp` to be built with librsvg support).
- **Author pool** — a fixed-size pool of names is generated first. Each file draws 1–2 authors from this pool, producing natural repetition across the library.
- **CBZ format** — a standard ZIP archive with images named `page-0001.jpg` (or `.png`) and an optional `ComicInfo.xml` at the root. Images are stored without re-compression (`level: 0`) for speed.
- **Reproducibility** — pass `--seed` to get identical output across runs.
