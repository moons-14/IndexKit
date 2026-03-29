import { basename } from "node:path";

import * as yauzl from "yauzl";

import { LoaderError } from "../errors";
import { parseComicInfo } from "../internal/comic-info";
import { buildPageInfoList, getImageMimeType } from "../internal/page-utils";
import {
  nodeStreamToWebReadable,
  streamToBuffer,
} from "../internal/stream-utils";
import { ReadingSource } from "../reading-source";
import type {
  CbzReadingSourceMetadata,
  ComicInfoMetadata,
  PageDescriptor,
} from "../types";

interface ZipPageSource {
  readonly entry: yauzl.Entry;
  readonly mimeType: string;
}

export class CbzReadingSource extends ReadingSource {
  override readonly metadata: CbzReadingSourceMetadata;
  readonly #pageEntries: readonly ZipPageSource[];
  readonly #zipFile: yauzl.ZipFile;

  private constructor(
    metadata: CbzReadingSourceMetadata,
    zipFile: yauzl.ZipFile,
    pageEntries: readonly ZipPageSource[],
  ) {
    super(metadata);
    this.metadata = metadata;
    this.#pageEntries = pageEntries;
    this.#zipFile = zipFile;
  }

  static async create(sourcePath: string): Promise<CbzReadingSource> {
    const zipFile = await openZipFile(sourcePath);
    const { comicInfo, pageEntries } = await scanCbzArchive(zipFile);
    const pages = buildPageInfoList(
      pageEntries.map((pageEntry) => ({
        mimeType: pageEntry.mimeType,
        name: pageEntry.entry.fileName,
        size: pageEntry.entry.uncompressedSize,
      })),
    );
    const metadata: CbzReadingSourceMetadata = {
      comicInfo,
      displayName: basename(sourcePath),
      kind: "cbz",
      pageCount: pages.length,
      pages,
      sourcePath,
    };

    return new CbzReadingSource(metadata, zipFile, pageEntries);
  }

  override async getPage(index: number): Promise<PageDescriptor> {
    const pageInfo = this.getPageInfo(index);
    const pageEntry = this.#pageEntries[index];

    if (!pageEntry) {
      throw new LoaderError(
        "page-out-of-range",
        `Page index ${index} is out of range for ${this.metadata.sourcePath}`,
      );
    }

    return {
      ...pageInfo,
      height: null,
      openStream: async () =>
        nodeStreamToWebReadable(
          await openZipEntryNodeStream(this.#zipFile, pageEntry.entry),
        ),
      width: null,
    };
  }

  override async close(): Promise<void> {
    this.#zipFile.close();
  }
}

async function scanCbzArchive(zipFile: yauzl.ZipFile): Promise<{
  comicInfo: ComicInfoMetadata | null;
  pageEntries: ZipPageSource[];
}> {
  return new Promise((resolve, reject) => {
    const pageEntries: ZipPageSource[] = [];
    let comicInfo: ComicInfoMetadata | null = null;
    let settled = false;

    const rejectOnce = (error: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error);
    };

    zipFile.once("error", rejectOnce);
    zipFile.once("end", () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve({ comicInfo, pageEntries });
    });
    zipFile.on("entry", (entry) => {
      void (async () => {
        if (entry.fileName.endsWith("/")) {
          zipFile.readEntry();
          return;
        }

        const mimeType = getImageMimeType(entry.fileName);

        if (mimeType) {
          pageEntries.push({ entry, mimeType });
          zipFile.readEntry();
          return;
        }

        if (entry.fileName.toLowerCase().endsWith("comicinfo.xml")) {
          const stream = await openZipEntryNodeStream(zipFile, entry);
          const buffer = await streamToBuffer(stream);
          comicInfo = parseComicInfo(buffer.toString("utf8"));
        }

        zipFile.readEntry();
      })().catch((error) => {
        rejectOnce(
          error instanceof Error
            ? error
            : new Error("Unknown CBZ scan failure"),
        );
      });
    });

    zipFile.readEntry();
  });
}

async function openZipFile(path: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(
      path,
      {
        autoClose: false,
        lazyEntries: true,
      },
      (error, zipFile) => {
        if (error) {
          reject(error);
          return;
        }

        if (!zipFile) {
          reject(
            new LoaderError("zip-open-failed", `Unable to open ZIP: ${path}`),
          );
          return;
        }

        resolve(zipFile);
      },
    );
  });
}

async function openZipEntryNodeStream(
  zipFile: yauzl.ZipFile,
  entry: yauzl.Entry,
): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error) {
        reject(error);
        return;
      }

      if (!stream) {
        reject(
          new LoaderError(
            "archive-entry-open-failed",
            `Unable to open archive entry ${entry.fileName}`,
          ),
        );
        return;
      }

      resolve(stream);
    });
  });
}
