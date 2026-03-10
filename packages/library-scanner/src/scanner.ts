import fs from "node:fs";
import path from "node:path";
import type { ComicFormat, FileEntry, ScanOptions } from "./types.js";
import {
  SUPPORTED_EXTENSIONS,
  detectFormat,
  isImageFile,
} from "./utils/detect.js";

async function* walkDir(
  dir: string,
  recursive: boolean,
  followSymlinks: boolean,
  allowedExts: Set<string>,
): AsyncGenerator<FileEntry> {
  const handle = await fs.promises.opendir(dir, {
    recursive,
    bufferSize: 32,
  });

  for await (const entry of handle) {
    if (!entry.isFile() && !(followSymlinks && entry.isSymbolicLink())) {
      continue;
    }

    const fullPath = path.join(entry.parentPath ?? dir, entry.name);
    const ext = path.extname(entry.name).toLowerCase();

    if (!allowedExts.has(ext)) continue;

    const format = detectFormat(fullPath);
    if (!format) continue;

    try {
      const stat = await fs.promises.stat(fullPath);
      yield {
        path: fullPath,
        format,
        size: stat.size,
        mtime: stat.mtime,
      };
    } catch {
      // skip files we cannot stat
    }
  }
}

async function collectImageDirs(
  dir: string,
  recursive: boolean,
  followSymlinks: boolean,
  results: FileEntry[],
): Promise<void> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => isImageFile(n));

  const subdirs = entries.filter(
    (e) => e.isDirectory() || (followSymlinks && e.isSymbolicLink()),
  );

  if (files.length > 0) {
    try {
      const stat = await fs.promises.stat(dir);
      results.push({
        path: dir,
        format: "image-dir" as ComicFormat,
        size: 0,
        mtime: stat.mtime,
      });
    } catch {
      // skip
    }
  }

  if (recursive) {
    for (const sub of subdirs) {
      await collectImageDirs(
        path.join(dir, sub.name),
        recursive,
        followSymlinks,
        results,
      );
    }
  }
}

async function* walkImageDirs(
  dir: string,
  recursive: boolean,
  followSymlinks: boolean,
): AsyncGenerator<FileEntry> {
  const results: FileEntry[] = [];
  await collectImageDirs(dir, recursive, followSymlinks, results);
  yield* results;
}

export async function* scan(opts: ScanOptions): AsyncGenerator<FileEntry> {
  const {
    dir,
    recursive = true,
    extensions,
    followSymlinks = false,
  } = opts;

  const defaultExts = SUPPORTED_EXTENSIONS;
  const requestedExts = extensions ?? defaultExts;
  const includeImageDirs = extensions === undefined;

  const fileExts = new Set(
    requestedExts.filter((e) => e.startsWith(".")),
  );

  if (fileExts.size > 0) {
    yield* walkDir(dir, recursive, followSymlinks, fileExts);
  }

  if (includeImageDirs) {
    yield* walkImageDirs(dir, recursive, followSymlinks);
  }
}
