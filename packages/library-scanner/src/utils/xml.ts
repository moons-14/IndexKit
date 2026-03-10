/**
 * Minimal XML parser for ComicInfo.xml.
 * Extracts simple tag values without a full XML library.
 */

export interface XmlNode {
  [tag: string]: string | undefined;
}

const TAG_RE = /<([A-Za-z][A-Za-z0-9]*)(?:\s[^>]*)?>([^<]*)<\/\1>/g;

export function parseSimpleXml(xml: string): XmlNode {
  const result: XmlNode = {};
  for (const m of xml.matchAll(TAG_RE)) {
    const tag = m[1];
    const value = m[2]?.trim();
    if (tag && value !== undefined) {
      result[tag] = value;
    }
  }
  return result;
}

export function getText(node: XmlNode, tag: string): string | undefined {
  return node[tag];
}

export function getInt(node: XmlNode, tag: string): number | undefined {
  const v = node[tag];
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

export function getList(
  node: XmlNode,
  tag: string,
  sep = ",",
): string[] | undefined {
  const v = node[tag];
  if (!v) return undefined;
  return v
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}
