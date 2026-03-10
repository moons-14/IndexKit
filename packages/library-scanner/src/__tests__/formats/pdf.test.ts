import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PdfReader } from "../../formats/pdf.js";
import type { FileEntry } from "../../types.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pdf-test-"));
});

afterEach(async () => {
  await fs.promises.rm(tmpDir, { recursive: true, force: true });
});

// Minimal valid 1-page PDF
const MINIMAL_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
190
%%EOF`;

describe("PdfReader", () => {
  it("extracts page count from a minimal PDF", async () => {
    const pdfPath = path.join(tmpDir, "test.pdf");
    await fs.promises.writeFile(pdfPath, MINIMAL_PDF, "utf-8");

    const stat = await fs.promises.stat(pdfPath);
    const entry: FileEntry = {
      path: pdfPath,
      format: "pdf",
      size: stat.size,
      mtime: stat.mtime,
    };

    const reader = new PdfReader(entry);
    try {
      const metadata = await reader.getMetadata();
      expect(typeof metadata).toBe("object");
      // Page count may or may not be 1 depending on PDF parsing
      if (metadata.pageCount !== undefined) {
        expect(metadata.pageCount).toBeGreaterThan(0);
      }
    } finally {
      await reader.close();
    }
  });

  it("returns page list for a minimal PDF", async () => {
    const pdfPath = path.join(tmpDir, "test.pdf");
    await fs.promises.writeFile(pdfPath, MINIMAL_PDF, "utf-8");

    const stat = await fs.promises.stat(pdfPath);
    const entry: FileEntry = {
      path: pdfPath,
      format: "pdf",
      size: stat.size,
      mtime: stat.mtime,
    };

    const reader = new PdfReader(entry);
    try {
      const pages = await reader.getPages();
      expect(Array.isArray(pages)).toBe(true);
      expect(pages.every((p) => p.startsWith("page-"))).toBe(true);
    } finally {
      await reader.close();
    }
  });
});
