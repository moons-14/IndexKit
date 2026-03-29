import { basename } from "node:path";

import { createExtractorFromFile } from "node-unrar-js";

import { LoaderError } from "../errors";
import { parseComicInfo } from "../internal/comic-info";
import { buildPageInfoList, getImageMimeType } from "../internal/page-utils";
import { bufferToReadableStream } from "../internal/stream-utils";
import { ReadingSource } from "../reading-source";
import type {
  CbrReadingSourceMetadata,
  ComicInfoMetadata,
  PageDescriptor,
} from "../types";

interface CbrPageSource {
  readonly name: string;
  readonly mimeType: string;
  readonly size: number;
}

export class CbrReadingSource extends ReadingSource {
  override readonly metadata: CbrReadingSourceMetadata;
  readonly #pageEntries: readonly CbrPageSource[];

  private constructor(
    metadata: CbrReadingSourceMetadata,
    pageEntries: readonly CbrPageSource[],
  ) {
    super(metadata);
    this.metadata = metadata;
    this.#pageEntries = pageEntries;
  }

  static async create(sourcePath: string): Promise<CbrReadingSource> {
    const extractor = await createExtractorFromFile({ filepath: sourcePath });
    const archiveList = extractor.getFileList();
    const fileHeaders = [...archiveList.fileHeaders];
    const pageEntries = fileHeaders
      .filter((fileHeader) => !fileHeader.flags.directory)
      .map((fileHeader) => {
        const mimeType = getImageMimeType(fileHeader.name);

        return mimeType
          ? {
              mimeType,
              name: fileHeader.name,
              size: fileHeader.unpSize,
            }
          : null;
      })
      .filter((pageEntry): pageEntry is CbrPageSource => pageEntry !== null);

    const comicInfoName = fileHeaders.find(
      (fileHeader) =>
        !fileHeader.flags.directory &&
        fileHeader.name.toLowerCase().endsWith("comicinfo.xml"),
    )?.name;
    const comicInfo = comicInfoName
      ? await readComicInfoFromCbr(sourcePath, comicInfoName)
      : null;
    const pages = buildPageInfoList(pageEntries);
    const metadata: CbrReadingSourceMetadata = {
      comicInfo,
      displayName: basename(sourcePath),
      kind: "cbr",
      pageCount: pages.length,
      pages,
      sourcePath,
    };

    return new CbrReadingSource(metadata, pageEntries);
  }

  override async getPage(index: number): Promise<PageDescriptor> {
    const pageInfo = this.getPageInfo(index);
    const pageEntry = this.#pageEntries[index];
    const archivePath = this.metadata.sourcePath;

    if (!pageEntry) {
      throw new LoaderError(
        "page-out-of-range",
        `Page index ${index} is out of range for ${this.metadata.sourcePath}`,
      );
    }

    return {
      ...pageInfo,
      height: null,
      openStream: async () => {
        const extractor = await createExtractorFromFile({
          filepath: archivePath,
        });
        const extracted = extractor.extract({ files: [pageEntry.name] });
        const files = [...extracted.files];
        const file = files.find(
          (entry) =>
            entry.fileHeader.name === pageEntry.name &&
            entry.fileHeader.flags.directory === false,
        );

        if (!file?.extraction) {
          throw new LoaderError(
            "archive-entry-missing",
            `Unable to extract ${pageEntry.name} from ${archivePath}`,
          );
        }

        return bufferToReadableStream(file.extraction);
      },
      width: null,
    };
  }
}

async function readComicInfoFromCbr(
  sourcePath: string,
  entryName: string,
): Promise<ComicInfoMetadata | null> {
  const extractor = await createExtractorFromFile({ filepath: sourcePath });
  const extracted = extractor.extract({ files: [entryName] });
  const files = [...extracted.files];
  const file = files.find(
    (candidate) =>
      candidate.fileHeader.name === entryName &&
      candidate.fileHeader.flags.directory === false,
  );

  if (!file?.extraction) {
    return null;
  }

  return parseComicInfo(Buffer.from(file.extraction).toString("utf8"));
}
