import { resolve } from "node:path";

import { ReadingSource } from "./reading-source";
import type { LoaderOptions, ReadingSourceOpenOptions } from "./types";

export class Loader {
  readonly #readingSourceOptions: ReadingSourceOpenOptions;
  readonly #sources = new Map<string, ReadingSource>();

  private constructor(options: LoaderOptions = {}) {
    this.#readingSourceOptions = options;
  }

  static async create(
    paths: Iterable<string> = [],
    options: LoaderOptions = {},
  ): Promise<Loader> {
    const loader = new Loader(options);
    await loader.addMany(paths);
    return loader;
  }

  async add(path: string): Promise<ReadingSource> {
    const normalizedPath = resolve(path);
    const existingSource = this.#sources.get(normalizedPath);

    if (existingSource) {
      return existingSource;
    }

    const source = await ReadingSource.open(
      normalizedPath,
      this.#readingSourceOptions,
    );
    this.#sources.set(normalizedPath, source);
    return source;
  }

  async addMany(paths: Iterable<string>): Promise<ReadingSource[]> {
    const sources: ReadingSource[] = [];

    for (const path of paths) {
      sources.push(await this.add(path));
    }

    return sources;
  }

  list(): readonly ReadingSource[] {
    return [...this.#sources.values()];
  }

  getByPath(path: string): ReadingSource | undefined {
    return this.#sources.get(resolve(path));
  }

  async close(): Promise<void> {
    const sources = [...this.#sources.values()];
    this.#sources.clear();
    await Promise.all(sources.map((source) => source.close()));
  }
}
