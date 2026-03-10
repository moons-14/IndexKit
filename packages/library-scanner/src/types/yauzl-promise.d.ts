declare module "yauzl-promise" {
  import type { Readable } from "node:stream";

  interface Entry {
    filename: string;
    uncompressedSize: number;
    openReadStream(options?: { decompress?: boolean }): Promise<Readable>;
  }

  interface Zip extends AsyncIterable<Entry> {
    entryCount: number;
    comment: string;
    close(): Promise<void>;
  }

  interface OpenOptions {
    decodeStrings?: boolean;
    validateEntrySizes?: boolean;
    validateFilenames?: boolean;
    strictFilenames?: boolean;
    supportMacArchive?: boolean;
  }

  export function open(path: string, options?: OpenOptions): Promise<Zip>;
  export function fromFd(fd: number, options?: OpenOptions): Promise<Zip>;
  export function fromBuffer(buffer: Buffer, options?: OpenOptions): Promise<Zip>;
}
