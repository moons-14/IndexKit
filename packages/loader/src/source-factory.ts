import { stat } from "node:fs/promises";
import { extname, resolve } from "node:path";

import { isNodeError, LoaderError } from "./errors";
import { CbrReadingSource } from "./sources/cbr-reading-source";
import { CbzReadingSource } from "./sources/cbz-reading-source";
import { PdfReadingSource } from "./sources/pdf-reading-source";
import { RawImagesReadingSource } from "./sources/raw-images-reading-source";
import type { ReadingSourceOpenOptions } from "./types";

export async function openReadingSource(
  sourcePath: string,
  options: ReadingSourceOpenOptions = {},
): Promise<
  | CbrReadingSource
  | CbzReadingSource
  | PdfReadingSource
  | RawImagesReadingSource
> {
  const resolvedPath = resolve(sourcePath);
  let sourceStats: Awaited<ReturnType<typeof stat>>;

  try {
    sourceStats = await stat(resolvedPath);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new LoaderError(
        "path-not-found",
        `Source path does not exist: ${resolvedPath}`,
        { cause: error },
      );
    }

    throw error;
  }

  if (sourceStats.isDirectory()) {
    return RawImagesReadingSource.create(resolvedPath, options);
  }

  const extension = extname(resolvedPath).toLowerCase();

  if (extension === ".cbz") {
    return CbzReadingSource.create(resolvedPath);
  }

  if (extension === ".cbr") {
    return CbrReadingSource.create(resolvedPath);
  }

  if (extension === ".pdf") {
    return PdfReadingSource.create(resolvedPath, options);
  }

  throw new LoaderError(
    "unsupported-source",
    `Unsupported source path: ${resolvedPath}`,
  );
}
