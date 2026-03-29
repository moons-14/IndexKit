# IndexKit

IndexKit is a local-first library server and reader focused on manga and document workflows such as `cbz`, `cbr`, `pdf`, and raw image directories. The project is being built in TypeScript with a modern UI, performance tuning, and a declarative architecture as core principles.

## Workspace

This repository uses a `pnpm` workspace with Turborepo.

- `apps/`: application entry points such as the web UI or background services.
- `packages/`: reusable packages shared across apps.
- `packages/loader`: file loading package for `cbz`, `cbr`, `pdf`, and raw image directories.

## Loader Package

The `loader` package now exposes two public classes:

- Package name: `@indexkit/loader`
- Source directory: `packages/loader/src`
- Build output: `packages/loader/dist`
- Available scripts: `build`, `check-types`, `lint`, `format`, `test`
- `ReadingSource`: open a single file or raw-images directory and read page streams lazily
- `Loader`: manage multiple `ReadingSource` instances and add new sources incrementally

Run the package directly with workspace filters when needed:

```bash
pnpm --filter @indexkit/loader build
pnpm --filter @indexkit/loader check-types
pnpm --filter @indexkit/loader test
```

Minimal usage:

```ts
import { Loader, ReadingSource } from "@indexkit/loader";

const source = await ReadingSource.open("/library/chapter.cbz");
const firstPage = await source.getPage(0);
const stream = await firstPage.openStream();

const loader = await Loader.create([
  "/library/chapter.cbz",
  "/library/raw-images",
]);
```

## Docker

The repository includes a `Dockerfile` and `docker-compose.yml` for a consistent Node 22 environment with native build tooling available for loader dependencies.

```bash
docker compose build
docker compose run --rm workspace pnpm build
docker compose run --rm workspace pnpm test
```
