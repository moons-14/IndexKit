import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ImageDirReader } from "../../formats/image-dir.js";
import type { FileEntry } from "../../types.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "imgdir-test-"));
});

afterEach(async () => {
  await fs.promises.rm(tmpDir, { recursive: true, force: true });
});

async function makeEntry(dir: string): Promise<FileEntry> {
  const stat = await fs.promises.stat(dir);
  return {
    path: dir,
    format: "image-dir",
    size: 0,
    mtime: stat.mtime,
  };
}

describe("ImageDirReader", () => {
  it("lists pages in natural sort order", async () => {
    const imgDir = path.join(tmpDir, "manga");
    await fs.promises.mkdir(imgDir);

    const names = ["page-10.jpg", "page-2.jpg", "page-1.jpg", "page-9.jpg"];
    for (const name of names) {
      // Write minimal 1x1 JPEG
      await fs.promises.writeFile(path.join(imgDir, name), Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00,
        0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
      ]));
    }

    const entry = await makeEntry(imgDir);
    const reader = new ImageDirReader(entry);
    const pages = await reader.getPages();

    expect(pages).toEqual(["page-1.jpg", "page-2.jpg", "page-9.jpg", "page-10.jpg"]);
  });

  it("returns metadata with title = dirname and correct pageCount", async () => {
    const imgDir = path.join(tmpDir, "My Manga Vol 1");
    await fs.promises.mkdir(imgDir);

    for (let i = 1; i <= 5; i++) {
      await fs.promises.writeFile(path.join(imgDir, `page${i}.jpg`), "fake");
    }

    const entry = await makeEntry(imgDir);
    const reader = new ImageDirReader(entry);
    const meta = await reader.getMetadata();

    expect(meta.title).toBe("My Manga Vol 1");
    expect(meta.pageCount).toBe(5);
  });

  it("ignores non-image files", async () => {
    const imgDir = path.join(tmpDir, "mixed");
    await fs.promises.mkdir(imgDir);
    await fs.promises.writeFile(path.join(imgDir, "page1.jpg"), "fake");
    await fs.promises.writeFile(path.join(imgDir, "thumbs.db"), "fake");
    await fs.promises.writeFile(path.join(imgDir, "readme.txt"), "fake");

    const entry = await makeEntry(imgDir);
    const reader = new ImageDirReader(entry);
    const pages = await reader.getPages();

    expect(pages).toEqual(["page1.jpg"]);
  });
});
