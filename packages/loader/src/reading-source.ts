import { LoaderError } from "./errors";
import type {
  PageDescriptor,
  PageInfo,
  PageOpenOptions,
  ReadingSourceMetadata,
  ReadingSourceOpenOptions,
} from "./types";

export abstract class ReadingSource {
  readonly metadata: ReadingSourceMetadata;

  protected constructor(metadata: ReadingSourceMetadata) {
    this.metadata = metadata;
  }

  static async open(
    sourcePath: string,
    options: ReadingSourceOpenOptions = {},
  ): Promise<ReadingSource> {
    const { openReadingSource } = await import("./source-factory");
    return openReadingSource(sourcePath, options);
  }

  abstract getPage(
    index: number,
    options?: PageOpenOptions,
  ): Promise<PageDescriptor>;

  async openPageStream(
    index: number,
    options?: PageOpenOptions,
  ): Promise<ReadableStream<Uint8Array>> {
    const page = await this.getPage(index, options);
    return page.openStream();
  }

  async close(): Promise<void> {}

  protected getPageInfo(index: number): PageInfo {
    const page = this.metadata.pages[index];

    if (!page) {
      throw new LoaderError(
        "page-out-of-range",
        `Page index ${index} is out of range for ${this.metadata.sourcePath}`,
      );
    }

    return page;
  }
}
