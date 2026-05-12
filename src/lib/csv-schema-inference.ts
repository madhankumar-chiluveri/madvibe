import { parseCsv } from "./csv-parser";
import type { PropertyType } from "@/types/database";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\//i;
const PHONE_RE = /^[+]?[\d\s\-().]{7,20}$/;
const NUMBER_RE = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;
const BOOL_SET = new Set(["true", "false", "yes", "no", "1", "0", "✓", "✗", "x", "on", "off"]);

export const OPTION_COLORS = ["blue", "green", "yellow", "orange", "red", "purple", "pink", "brown", "gray"];

export interface InferredColumn {
  id: string;
  name: string;
  detectedType: PropertyType;
  currentType: PropertyType;
  sampleValues: string[];
  selectOptions?: Array<{ id: string; label: string; color: string }>;
}

export interface CsvParseResult {
  columns: InferredColumn[];
  rawRows: string[][];
  totalRows: number;
}

function inferType(values: string[]): PropertyType {
  const nonEmpty = values.filter(v => v.trim() !== "");
  if (nonEmpty.length === 0) return "text";

  if (nonEmpty.every(v => BOOL_SET.has(v.toLowerCase()))) return "checkbox";
  if (nonEmpty.every(v => NUMBER_RE.test(v.trim()))) return "number";

  // date: parse succeeds, not a bare number, length >= 6 to avoid "2024" being a date
  if (
    nonEmpty.every(v => {
      const t = v.trim();
      if (NUMBER_RE.test(t)) return false;
      return !isNaN(new Date(t).getTime()) && t.length >= 6;
    })
  ) return "date";

  if (nonEmpty.every(v => EMAIL_RE.test(v.trim()))) return "email";
  if (nonEmpty.every(v => URL_RE.test(v.trim()))) return "url";
  if (nonEmpty.every(v => PHONE_RE.test(v.trim()))) return "phone";

  // multi_select: values contain commas and total unique parts ≤ 20
  if (nonEmpty.some(v => v.includes(","))) {
    const allParts = nonEmpty.flatMap(v =>
      v.split(",").map(p => p.trim()).filter(Boolean)
    );
    const uniqueParts = new Set(allParts);
    if (uniqueParts.size >= 2 && uniqueParts.size <= 20) return "multi_select";
  }

  // select: ≤ 8 unique short values, not all rows unique
  const unique = new Set(nonEmpty.map(v => v.trim()).filter(v => v.length <= 40));
  if (unique.size >= 2 && unique.size <= 8 && nonEmpty.length > unique.size) return "select";

  return "text";
}

export function buildSelectOptions(
  values: string[],
  type: "select" | "multi_select"
): Array<{ id: string; label: string; color: string }> {
  const seen = new Set<string>();
  if (type === "multi_select") {
    values.forEach(v =>
      v.split(",").forEach(p => {
        const t = p.trim();
        if (t) seen.add(t);
      })
    );
  } else {
    values.forEach(v => {
      const t = v.trim();
      if (t) seen.add(t);
    });
  }
  return Array.from(seen).map((label, i) => ({
    id: label.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/^_+|_+$/g, "") || `opt_${i}`,
    label,
    color: OPTION_COLORS[i % OPTION_COLORS.length],
  }));
}

export function coerceValue(raw: string, type: PropertyType): unknown {
  const v = raw.trim();
  if (v === "") return null;

  switch (type) {
    case "title":
    case "text":
    case "email":
    case "url":
    case "phone":
    case "select":
      return v;
    case "number": {
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    }
    case "checkbox":
      return ["true", "yes", "1", "✓", "x", "on"].includes(v.toLowerCase());
    case "date": {
      // Cell renderer expects a millisecond timestamp (number), not a string
      const ts = new Date(v).getTime();
      return isNaN(ts) ? null : ts;
    }
    case "multi_select":
      return v.split(",").map(p => p.trim()).filter(Boolean);
    default:
      return v;
  }
}

export function analyzeCSV(raw: string): CsvParseResult | null {
  const grid = parseCsv(raw);
  if (grid.length < 2) return null;

  const [headerRow, ...dataRows] = grid;
  if (headerRow.length === 0) return null;

  const usedIds = new Set<string>();

  const columns: InferredColumn[] = headerRow.map((header, index) => {
    let baseId =
      header.trim().toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/^_+|_+$/g, "") ||
      `col_${index}`;
    let id = baseId;
    let suffix = 1;
    while (usedIds.has(id)) id = `${baseId}_${suffix++}`;
    usedIds.add(id);

    // Sample up to 200 rows for type inference
    const values = dataRows.slice(0, 200).map(row => row[index] ?? "");
    const detectedType: PropertyType = index === 0 ? "title" : inferType(values);

    let selectOptions: InferredColumn["selectOptions"];
    if (detectedType === "select" || detectedType === "multi_select") {
      selectOptions = buildSelectOptions(values, detectedType);
    }

    const sampleValues = values.filter(v => v.trim() !== "").slice(0, 3);

    return {
      id,
      name: header.trim() || `Column ${index + 1}`,
      detectedType,
      currentType: detectedType,
      sampleValues,
      selectOptions,
    };
  });

  return { columns, rawRows: dataRows, totalRows: dataRows.length };
}

export function buildRowData(
  rawRow: string[],
  columns: InferredColumn[]
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [i, col] of columns.entries()) {
    data[col.id] = coerceValue(rawRow[i] ?? "", col.currentType);
  }
  return data;
}

export function buildProperties(columns: InferredColumn[]) {
  return columns.map(col => {
    const prop: Record<string, unknown> = {
      id: col.id,
      name: col.name,
      type: col.currentType,
    };
    if (
      (col.currentType === "select" || col.currentType === "multi_select") &&
      col.selectOptions
    ) {
      prop.config = { options: col.selectOptions };
    }
    return prop;
  });
}
