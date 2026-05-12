export const PIN_MANAGER_CSV_FIELDS = [
  "Title",
  "Media URL",
  "Pinterest board",
  "Thumbnail",
  "Description",
  "Link",
  "Publish date",
  "Keywords",
] as const;

export const PIN_MANAGER_DB_KEYS = [
  "title",
  "mediaUrl",
  "pinterestBoard",
  "thumbnail",
  "description",
  "link",
  "publishDate",
  "keywords",
] as const;

export const PIN_MANAGER_HEADER_TO_DB_KEY = new Map<string, (typeof PIN_MANAGER_DB_KEYS)[number]>([
  ["title", "title"],
  ["media url", "mediaUrl"],
  ["mediaurl", "mediaUrl"],
  ["pinterest board", "pinterestBoard"],
  ["pinterestboard", "pinterestBoard"],
  ["board", "pinterestBoard"],
  ["thumbnail", "thumbnail"],
  ["description", "description"],
  ["link", "link"],
  ["url", "link"],
  ["publish date", "publishDate"],
  ["publishdate", "publishDate"],
  ["date", "publishDate"],
  ["keywords", "keywords"],
  ["tags", "keywords"],
]);

export function csvEscape(value: string): string {
  if (/[,"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv(headers: readonly string[], rows: readonly string[][]): string {
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ];
  return lines.join("\n");
}

/** RFC 4180 parser — handles quoted fields, escaped quotes, embedded newlines. */
export function parseCsvText(raw: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < raw.length) {
    const ch = raw[i];

    if (inQuotes) {
      if (ch === '"') {
        if (raw[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      row.push(field);
      field = "";
      // Drop trailing all-empty rows produced by stray newlines
      if (!(row.length === 1 && row[0] === "")) out.push(row);
      row = [];
      if (ch === "\r" && raw[i + 1] === "\n") i += 2;
      else i++;
      continue;
    }
    field += ch;
    i++;
  }
  // Flush trailing field if file did not end with newline
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (!(row.length === 1 && row[0] === "")) out.push(row);
  }
  return out;
}

export type PinManagerInputRow = {
  title?: string;
  mediaUrl?: string;
  pinterestBoard?: string;
  thumbnail?: string;
  description?: string;
  link?: string;
  publishDate?: string;
  keywords?: string;
};

/**
 * Mirrors the Streamlit `parse_csv_input` behavior:
 *   - first row is treated as a header IF at least one cell matches a known field
 *     (case-insensitive, whitespace-stripped) — otherwise the first row is data
 *     and columns are assigned to PIN_MANAGER_DB_KEYS positionally.
 *   - empty trailing rows and lines that are entirely empty are dropped.
 */
export function parsePinManagerCsv(raw: string): PinManagerInputRow[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const grid = parseCsvText(trimmed);
  if (grid.length === 0) return [];

  const firstRow = grid[0].map((cell) => cell.trim().toLowerCase());
  const looksLikeHeader = firstRow.some((cell) => PIN_MANAGER_HEADER_TO_DB_KEY.has(cell));

  let headers: Array<(typeof PIN_MANAGER_DB_KEYS)[number] | null>;
  let dataRows: string[][];

  if (looksLikeHeader) {
    headers = firstRow.map((cell) => PIN_MANAGER_HEADER_TO_DB_KEY.get(cell) ?? null);
    dataRows = grid.slice(1);
  } else {
    headers = PIN_MANAGER_DB_KEYS.map((key) => key);
    dataRows = grid;
  }

  return dataRows
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => {
      const result: PinManagerInputRow = {};
      for (let i = 0; i < row.length; i++) {
        const key = headers[i];
        if (!key) continue;
        result[key] = row[i];
      }
      return result;
    });
}
