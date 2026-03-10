import sharp from "sharp";
import { type RNG, randInt } from "./random.js";

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface PageOptions {
  rng: RNG;
  bookHue: number;
  width: number;
  height: number;
  pageNum: number;
  total: number;
  title: string;
  format: "jpeg" | "png";
  quality: number;
  showPageNumber: boolean;
}

export async function generatePage(opts: PageOptions): Promise<Buffer> {
  const { rng, bookHue, width, height, pageNum, total, title, format, quality, showPageNumber } =
    opts;

  // Vary lightness and saturation slightly per page within the book's hue
  const saturation = 35 + Math.floor(rng() * 25);
  const lightness = 25 + Math.floor(rng() * 20);
  const bg = hslToRgb(bookHue, saturation, lightness);

  // Slightly lighter color for accent elements
  const accentL = Math.min(lightness + 20, 75);
  const accent = hslToRgb(bookHue, saturation, accentL);
  const accentHex = `#${accent.r.toString(16).padStart(2, "0")}${accent.g.toString(16).padStart(2, "0")}${accent.b.toString(16).padStart(2, "0")}`;

  let pipeline = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: bg,
    },
  });

  if (showPageNumber) {
    const margin = Math.floor(Math.min(width, height) * 0.04);
    const fontSize = Math.floor(Math.min(width, height) * 0.03);
    const titleFontSize = Math.floor(fontSize * 0.75);
    const shortTitle = escapeXml(title.length > 36 ? `${title.slice(0, 33)}...` : title);

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${margin}" y="${margin}" width="${width - margin * 2}" height="${height - margin * 2}"
              fill="none" stroke="${accentHex}" stroke-width="2" rx="4" opacity="0.4"/>
        <text x="${width / 2}" y="${margin + titleFontSize + 4}"
              font-size="${titleFontSize}" fill="${accentHex}" opacity="0.7"
              text-anchor="middle" font-family="sans-serif">
          ${shortTitle}
        </text>
        <text x="${width / 2}" y="${height - margin - 4}"
              font-size="${fontSize}" fill="${accentHex}" opacity="0.9"
              text-anchor="middle" font-family="serif" font-weight="bold">
          ${pageNum} / ${total}
        </text>
      </svg>`;

    try {
      pipeline = pipeline.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]);
    } catch {
      // SVG compositing not available, skip overlay
    }
  }

  if (format === "jpeg") {
    return pipeline.jpeg({ quality }).toBuffer();
  }
  return pipeline.png({ compressionLevel: 6 }).toBuffer();
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export function randomDimensions(
  rng: RNG,
  minWidth: number,
  maxWidth: number,
  minHeight: number,
  maxHeight: number,
): ImageDimensions {
  return {
    width: randInt(rng, minWidth, maxWidth),
    height: randInt(rng, minHeight, maxHeight),
  };
}
