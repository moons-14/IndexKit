import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";

import { LoaderError } from "../errors";
import { buildPageInfoList, getImageMimeType } from "../internal/page-utils";
import { nodeStreamToWebReadable } from "../internal/stream-utils";
import { applyRawImageOrdering, lexicalPageOrderStrategy } from "../page-order";
import { ReadingSource } from "../reading-source";
import type {
  PageDescriptor,
  RawImagePageSource,
  RawImagesReadingSourceMetadata,
  ReadingSourceOpenOptions,
} from "../types";

export class RawImagesReadingSource extends ReadingSource {
  override readonly metadata: RawImagesReadingSourceMetadata;
  readonly #entries: readonly RawImagePageSource[];

  private constructor(
    metadata: RawImagesReadingSourceMetadata,
    entries: readonly RawImagePageSource[],
  ) {
    super(metadata);
    this.metadata = metadata;
    this.#entries = entries;
  }

  static async create(
    sourcePath: string,
    options: ReadingSourceOpenOptions,
  ): Promise<RawImagesReadingSource> {
    const ordering = options.rawImageOrdering ?? lexicalPageOrderStrategy;
    const directoryEntries = await readdir(sourcePath, { withFileTypes: true });
    const rawImageEntries: RawImagePageSource[] = [];

    for (const directoryEntry of directoryEntries) {
      if (!directoryEntry.isFile()) {
        continue;
      }

      const mimeType = getImageMimeType(directoryEntry.name);

      if (!mimeType) {
        continue;
      }

      const absolutePath = resolve(sourcePath, directoryEntry.name);
      const entryStats = await stat(absolutePath);

      rawImageEntries.push({
        absolutePath,
        mimeType,
        name: directoryEntry.name,
        size: entryStats.size,
      });
    }

    const orderedEntries = applyRawImageOrdering(rawImageEntries, ordering);
    const pages = buildPageInfoList(orderedEntries);
    const metadata: RawImagesReadingSourceMetadata = {
      displayName: basename(sourcePath),
      kind: "raw-images",
      pageCount: pages.length,
      pages,
      sourcePath,
    };

    return new RawImagesReadingSource(metadata, orderedEntries);
  }

  override async getPage(index: number): Promise<PageDescriptor> {
    const pageInfo = this.getPageInfo(index);
    const entry = this.#entries[index];

    if (!entry) {
      throw new LoaderError(
        "page-out-of-range",
        `Page index ${index} is out of range for ${this.metadata.sourcePath}`,
      );
    }

    return {
      ...pageInfo,
      height: null,
      openStream: async () =>
        nodeStreamToWebReadable(createReadStream(entry.absolutePath)),
      width: null,
    };
  }
}
