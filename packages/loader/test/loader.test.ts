import { ReadableStream } from "node:stream/web";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Loader, lexicalPageOrderStrategy, ReadingSource } from "../src/index";
import {
  createCbrFixture,
  createCbzFixture,
  createPdfFixture,
  createRawImagesFixture,
  createTestWorkspace,
  removeTestWorkspace,
  streamToBuffer,
} from "./helpers";

let workspace: string;

beforeAll(async () => {
  workspace = await createTestWorkspace();
});

afterAll(async () => {
  await removeTestWorkspace(workspace);
});

describe("ReadingSource.open", () => {
  it("loads raw image directories with the configured page ordering", async () => {
    const source = await ReadingSource.open(
      await createRawImagesFixture(workspace),
      {
        rawImageOrdering: lexicalPageOrderStrategy,
      },
    );

    expect(source.metadata.kind).toBe("raw-images");
    expect(source.metadata.pageCount).toBe(2);
    expect(source.metadata.pages.map((page) => page.name)).toEqual([
      "a.png",
      "b.png",
    ]);

    const stream = await source.openPageStream(0);

    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it("loads cbz files and reads ComicInfo eagerly", async () => {
    const source = await ReadingSource.open(await createCbzFixture(workspace));

    expect(source.metadata.kind).toBe("cbz");
    expect(source.metadata.pageCount).toBe(1);
    expect(source.metadata.comicInfo?.raw.Title).toBe("Fixture");

    const page = await source.getPage(0);
    const bytes = await streamToBuffer(await page.openStream());

    expect(bytes.length).toBeGreaterThan(0);

    await source.close();
  });

  it("loads cbr files and ignores non-page entries", async () => {
    const source = await ReadingSource.open(await createCbrFixture(workspace));

    expect(source.metadata.kind).toBe("cbr");
    expect(source.metadata.pageCount).toBe(0);
    expect(source.metadata.pages).toEqual([]);
    expect(source.metadata.comicInfo).toBeNull();

    await source.close();
  });

  it("loads pdf files and renders pages lazily", async () => {
    const source = await ReadingSource.open(await createPdfFixture(workspace));

    expect(source.metadata.kind).toBe("pdf");
    expect(source.metadata.pageCount).toBe(1);

    const page = await source.getPage(0);
    const bytes = await streamToBuffer(await page.openStream());

    expect(bytes.length).toBeGreaterThan(0);
    expect(page.mimeType).toBe("image/png");

    await source.close();
  });
});

describe("Loader", () => {
  it("reuses an existing source for the same normalized path", async () => {
    const rawImagesPath = await createRawImagesFixture(workspace);
    const loader = await Loader.create([rawImagesPath]);

    const firstSource = loader.getByPath(rawImagesPath);
    const secondSource = await loader.add(rawImagesPath);

    expect(firstSource).toBeDefined();
    expect(firstSource).toBe(secondSource);
    expect(loader.list()).toHaveLength(1);

    await loader.close();
  });
});
