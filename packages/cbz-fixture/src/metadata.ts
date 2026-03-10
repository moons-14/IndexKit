function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function tag(name: string, value: string | number | undefined): string {
  if (value === undefined || value === "") return "";
  return `  <${name}>${escapeXml(String(value))}</${name}>\n`;
}

export interface ComicInfoOptions {
  title: string;
  series?: string;
  issueNumber?: number;
  volume?: number;
  summary?: string;
  year?: number;
  month?: number;
  writers: string[];
  publisher?: string;
  genre?: string;
  pageCount: number;
  lang: string;
  ageRating?: string;
  manga?: boolean;
}

export function generateComicInfo(opts: ComicInfoOptions): string {
  const {
    title,
    series,
    issueNumber,
    volume,
    summary,
    year,
    month,
    writers,
    publisher,
    genre,
    pageCount,
    lang,
    ageRating,
    manga,
  } = opts;

  let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
  xml += `<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`;
  xml += `           xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n`;
  xml += tag("Title", title);
  if (series) xml += tag("Series", series);
  if (issueNumber !== undefined) xml += tag("Number", issueNumber);
  if (volume !== undefined) xml += tag("Volume", volume);
  if (summary) xml += tag("Summary", summary);
  if (year) xml += tag("Year", year);
  if (month) xml += tag("Month", month);
  if (writers.length > 0) xml += tag("Writer", writers.join(", "));
  if (publisher) xml += tag("Publisher", publisher);
  if (genre) xml += tag("Genre", genre);
  xml += tag("PageCount", pageCount);
  xml += tag("LanguageISO", lang);
  if (ageRating) xml += tag("AgeRating", ageRating);
  if (manga !== undefined) xml += tag("Manga", manga ? "YesAndRightToLeft" : "No");
  xml += `</ComicInfo>\n`;
  return xml;
}
