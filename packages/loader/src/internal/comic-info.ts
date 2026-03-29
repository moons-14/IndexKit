import { XMLParser } from "fast-xml-parser";

import type { ComicInfoMetadata } from "../types";

export function parseComicInfo(xml: string): ComicInfoMetadata {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: true,
  });
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const root =
    parsed.ComicInfo &&
    typeof parsed.ComicInfo === "object" &&
    !Array.isArray(parsed.ComicInfo)
      ? parsed.ComicInfo
      : parsed;

  return {
    raw: Object.freeze({ ...(root as Record<string, unknown>) }),
  };
}
