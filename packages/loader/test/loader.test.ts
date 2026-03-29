import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ReadableStream } from "node:stream/web";
import { after, before, describe, it } from "node:test";

import { ZipFile } from "yazl";

import { Loader, lexicalPageOrderStrategy, ReadingSource } from "../src/index";

const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlAb3cAAAAASUVORK5CYII=",
  "base64",
);

const SIMPLE_PDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
0.9 0 0 rg
0 0 200 200 re
f
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000202 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
296
%%EOF
`;

let workspace: string;

before(async () => {
  workspace = await mkdtemp(join(tmpdir(), "indexkit-loader-"));
});

after(async () => {
  await rm(workspace, { force: true, recursive: true });
});

describe("ReadingSource", () => {
  it("loads raw image directories with configurable ordering", async () => {
    const rawDir = join(workspace, "raw");
    await mkdir(rawDir);
    await writeFile(join(rawDir, "b.png"), PNG_BYTES);
    await writeFile(join(rawDir, "a.png"), PNG_BYTES);

    const source = await ReadingSource.open(rawDir, {
      rawImageOrdering: lexicalPageOrderStrategy,
    });

    assert.equal(source.metadata.kind, "raw-images");
    assert.equal(source.metadata.pageCount, 2);
    assert.deepEqual(
      source.metadata.pages.map((page) => page.name),
      ["a.png", "b.png"],
    );

    const stream = await source.openPageStream(0);
    assert.ok(stream instanceof ReadableStream);
  });

  it("loads cbz files and reads ComicInfo eagerly", async () => {
    const cbzPath = join(workspace, "sample.cbz");
    await writeCbzFixture(cbzPath);

    const source = await ReadingSource.open(cbzPath);

    assert.equal(source.metadata.kind, "cbz");
    assert.equal(source.metadata.pageCount, 1);
    assert.equal(source.metadata.comicInfo?.raw.Title, "Fixture");

    const page = await source.getPage(0);
    const bytes = await streamToBuffer(await page.openStream());
    assert.ok(bytes.length > 0);
    await source.close();
  });

  it("loads pdf files and renders pages lazily", async () => {
    const pdfPath = join(workspace, "sample.pdf");
    await writeFile(pdfPath, SIMPLE_PDF, "utf8");

    const source = await ReadingSource.open(pdfPath);

    assert.equal(source.metadata.kind, "pdf");
    assert.equal(source.metadata.pageCount, 1);

    const page = await source.getPage(0);
    const bytes = await streamToBuffer(await page.openStream());
    assert.ok(bytes.length > 0);
    assert.equal(page.mimeType, "image/png");
    await source.close();
  });
});

describe("Loader", () => {
  it("stores and reuses leaf instances by normalized path", async () => {
    const rawDir = join(workspace, "library");
    await mkdir(rawDir);
    await writeFile(join(rawDir, "001.png"), PNG_BYTES);

    const loader = await Loader.create([rawDir]);
    const firstSource = loader.getByPath(rawDir);
    const secondSource = await loader.add(rawDir);

    assert.ok(firstSource);
    assert.equal(firstSource, secondSource);
    assert.equal(loader.list().length, 1);

    await loader.close();
  });
});

async function writeCbzFixture(targetPath: string): Promise<void> {
  const zipFile = new ZipFile();

  zipFile.addBuffer(PNG_BYTES, "001.png");
  zipFile.addBuffer(
    Buffer.from(
      `<?xml version="1.0" encoding="utf-8"?>
<ComicInfo>
  <Title>Fixture</Title>
</ComicInfo>`,
      "utf8",
    ),
    "ComicInfo.xml",
  );
  zipFile.end();

  const chunks: Buffer[] = [];
  const source = zipFile.outputStream;

  await new Promise<void>((resolve, reject) => {
    source.on("data", (chunk) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    source.once("error", reject);
    source.once("end", resolve);
  });

  await writeFile(targetPath, Buffer.concat(chunks));
}

async function streamToBuffer(
  stream: ReadableStream<Uint8Array>,
): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const result = await reader.read();

    if (result.done) {
      break;
    }

    chunks.push(result.value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}
