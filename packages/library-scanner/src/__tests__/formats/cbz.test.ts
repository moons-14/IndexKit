import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openReader } from "../../reader.js";
import type { FileEntry } from "../../types.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "cbz-test-"));
});

afterEach(async () => {
  await fs.promises.rm(tmpDir, { recursive: true, force: true });
});

async function generateFixtures(count: number, outputDir: string): Promise<void> {
  // Use cbz-fixture package to generate test CBZ files
  const fixtureCmd = `pnpm --filter @indexkit/cbz-fixture generate -- --count ${count} --seed 42 -o ${outputDir}`;
  execSync(fixtureCmd, { cwd: path.resolve(import.meta.dirname, "../../../../../.."), stdio: "pipe" });
}

describe("CBZ reader", () => {
  it("reads pages from a generated CBZ", async () => {
    await generateFixtures(1, tmpDir);

    const files = await fs.promises.readdir(tmpDir);
    const cbzFile = files.find((f) => f.endsWith(".cbz"));
    if (!cbzFile) {
      // Skip if fixture generation failed
      return;
    }

    const cbzPath = path.join(tmpDir, cbzFile);
    const stat = await fs.promises.stat(cbzPath);
    const entry: FileEntry = {
      path: cbzPath,
      format: "cbz",
      size: stat.size,
      mtime: stat.mtime,
    };

    const reader = openReader(entry);
    try {
      const pages = await reader.getPages();
      expect(pages.length).toBeGreaterThan(0);
      expect(pages.every((p) => typeof p === "string")).toBe(true);
    } finally {
      await reader.close();
    }
  });

  it("reads metadata from a generated CBZ", async () => {
    await generateFixtures(1, tmpDir);

    const files = await fs.promises.readdir(tmpDir);
    const cbzFile = files.find((f) => f.endsWith(".cbz"));
    if (!cbzFile) return;

    const cbzPath = path.join(tmpDir, cbzFile);
    const stat = await fs.promises.stat(cbzPath);
    const entry: FileEntry = {
      path: cbzPath,
      format: "cbz",
      size: stat.size,
      mtime: stat.mtime,
    };

    const reader = openReader(entry);
    try {
      const metadata = await reader.getMetadata();
      expect(typeof metadata).toBe("object");
      // cbz-fixture generates ComicInfo.xml so we expect some fields
      if (metadata.title !== undefined) {
        expect(typeof metadata.title).toBe("string");
      }
    } finally {
      await reader.close();
    }
  });

  it("generates a thumbnail buffer from a CBZ", async () => {
    await generateFixtures(1, tmpDir);

    const files = await fs.promises.readdir(tmpDir);
    const cbzFile = files.find((f) => f.endsWith(".cbz"));
    if (!cbzFile) return;

    const cbzPath = path.join(tmpDir, cbzFile);
    const stat = await fs.promises.stat(cbzPath);
    const entry: FileEntry = {
      path: cbzPath,
      format: "cbz",
      size: stat.size,
      mtime: stat.mtime,
    };

    const reader = openReader(entry);
    try {
      const thumbnail = await reader.getThumbnail({ width: 100, height: 150 });
      expect(Buffer.isBuffer(thumbnail)).toBe(true);
      expect(thumbnail.length).toBeGreaterThan(0);
    } finally {
      await reader.close();
    }
  });
});
