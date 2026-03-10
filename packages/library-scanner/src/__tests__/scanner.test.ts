import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scan } from "../scanner.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "scanner-test-"));
});

afterEach(async () => {
  await fs.promises.rm(tmpDir, { recursive: true, force: true });
});

describe("scan()", () => {
  it("yields CBZ files in a flat directory", async () => {
    await fs.promises.writeFile(path.join(tmpDir, "comic1.cbz"), "fake");
    await fs.promises.writeFile(path.join(tmpDir, "comic2.cbz"), "fake");
    await fs.promises.writeFile(path.join(tmpDir, "ignore.txt"), "ignore");

    const entries = [];
    for await (const entry of scan({ dir: tmpDir, recursive: false })) {
      entries.push(entry);
    }

    const cbzEntries = entries.filter((e) => e.format === "cbz");
    expect(cbzEntries).toHaveLength(2);
    expect(cbzEntries.every((e) => e.path.endsWith(".cbz"))).toBe(true);
  });

  it("yields PDF files", async () => {
    await fs.promises.writeFile(path.join(tmpDir, "book.pdf"), "fake");

    const entries = [];
    for await (const entry of scan({ dir: tmpDir, recursive: false })) {
      entries.push(entry);
    }

    const pdfEntries = entries.filter((e) => e.format === "pdf");
    expect(pdfEntries).toHaveLength(1);
    expect(pdfEntries[0]?.path).toContain("book.pdf");
  });

  it("recurses into subdirectories by default", async () => {
    const subDir = path.join(tmpDir, "sub");
    await fs.promises.mkdir(subDir);
    await fs.promises.writeFile(path.join(subDir, "deep.cbz"), "fake");

    const entries = [];
    for await (const entry of scan({ dir: tmpDir })) {
      entries.push(entry);
    }

    const cbzEntries = entries.filter((e) => e.format === "cbz");
    expect(cbzEntries.length).toBeGreaterThanOrEqual(1);
  });

  it("respects recursive: false", async () => {
    const subDir = path.join(tmpDir, "sub");
    await fs.promises.mkdir(subDir);
    await fs.promises.writeFile(path.join(tmpDir, "top.cbz"), "fake");
    await fs.promises.writeFile(path.join(subDir, "deep.cbz"), "fake");

    const entries = [];
    for await (const entry of scan({ dir: tmpDir, recursive: false })) {
      entries.push(entry);
    }

    const cbzEntries = entries.filter((e) => e.format === "cbz");
    expect(cbzEntries).toHaveLength(1);
    expect(cbzEntries[0]?.path).toContain("top.cbz");
  });

  it("FileEntry has correct shape", async () => {
    await fs.promises.writeFile(path.join(tmpDir, "comic.cbz"), "data");

    const entries = [];
    for await (const entry of scan({ dir: tmpDir, recursive: false })) {
      entries.push(entry);
    }

    const entry = entries.find((e) => e.format === "cbz");
    expect(entry).toBeDefined();
    expect(typeof entry!.path).toBe("string");
    expect(entry!.format).toBe("cbz");
    expect(typeof entry!.size).toBe("number");
    expect(entry!.mtime).toBeInstanceOf(Date);
  });

  it("detects image directories", async () => {
    const imgDir = path.join(tmpDir, "my-manga");
    await fs.promises.mkdir(imgDir);
    await fs.promises.writeFile(path.join(imgDir, "page001.jpg"), "fake");
    await fs.promises.writeFile(path.join(imgDir, "page002.jpg"), "fake");

    const entries = [];
    for await (const entry of scan({ dir: tmpDir })) {
      entries.push(entry);
    }

    const imgDirEntries = entries.filter((e) => e.format === "image-dir");
    expect(imgDirEntries.length).toBeGreaterThanOrEqual(1);
  });
});
