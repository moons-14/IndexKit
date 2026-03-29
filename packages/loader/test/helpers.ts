import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { ReadableStream } from "node:stream/web";
import { fileURLToPath } from "node:url";

import { ZipFile } from "yazl";

export const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlAb3cAAAAASUVORK5CYII=",
  "base64",
);

export const SIMPLE_PDF = `%PDF-1.4
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

export async function createTestWorkspace(): Promise<string> {
  return mkdtemp(join(tmpdir(), "indexkit-loader-"));
}

export async function removeTestWorkspace(workspace: string): Promise<void> {
  await rm(workspace, { force: true, recursive: true });
}

export async function createRawImagesFixture(
  workspace: string,
): Promise<string> {
  const rawDir = await mkdtemp(join(workspace, "raw-images-"));
  await writeFile(join(rawDir, "b.png"), PNG_BYTES);
  await writeFile(join(rawDir, "a.png"), PNG_BYTES);
  return rawDir;
}

export async function createCbzFixture(workspace: string): Promise<string> {
  const targetPath = join(workspace, "sample.cbz");
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
  return targetPath;
}

export async function createPdfFixture(workspace: string): Promise<string> {
  const targetPath = join(workspace, "sample.pdf");
  await writeFile(targetPath, SIMPLE_PDF, "utf8");
  return targetPath;
}

export async function createCbrFixture(workspace: string): Promise<string> {
  const targetPath = join(workspace, "sample.cbr");
  const currentFilePath = fileURLToPath(import.meta.url);
  const sourcePath = join(
    dirname(currentFilePath),
    "fixtures",
    "with-comment.cbr",
  );
  const fixtureBytes = await readFile(sourcePath);

  await writeFile(targetPath, fixtureBytes);
  return targetPath;
}

export async function streamToBuffer(
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
