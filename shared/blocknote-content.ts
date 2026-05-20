type JsonRecord = Record<string, unknown>;

export type SanitizedBlockNoteBlock = {
  id?: string;
  type: string;
  props?: JsonRecord;
  content?: unknown;
  children: SanitizedBlockNoteBlock[];
};

type SanitizedStyledText = {
  type: "text";
  text: string;
  styles: JsonRecord;
};

const INLINE_BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "quote",
  "codeBlock",
  "toggleListItem",
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
]);

const MEDIA_BLOCK_TYPES = new Set(["file", "image", "video", "audio"]);
const SUPPORTED_BLOCK_TYPES = new Set([
  ...INLINE_BLOCK_TYPES,
  ...MEDIA_BLOCK_TYPES,
  "table",
]);

const BOOLEAN_STYLES = new Set(["bold", "italic", "underline", "strike", "code"]);
const STRING_STYLES = new Set(["textColor", "backgroundColor"]);
const TEXT_ALIGNMENTS = new Set(["left", "center", "right", "justify"]);

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function asFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function textFromPrimitive(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function compactTextNode(text: string, styles: unknown = {}): SanitizedStyledText[] {
  return text.length > 0
    ? [{ type: "text", text, styles: sanitizeStyles(styles) }]
    : [];
}

function sanitizeStyles(styles: unknown) {
  if (!isRecord(styles)) return {};

  const result: JsonRecord = {};
  for (const [key, value] of Object.entries(styles)) {
    if (BOOLEAN_STYLES.has(key)) {
      if (value === true) result[key] = true;
      continue;
    }

    if (STRING_STYLES.has(key) && typeof value === "string" && value.length > 0) {
      result[key] = value;
    }
  }
  return result;
}

function extractPlainText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map(extractPlainText).filter(Boolean).join(" ");
  }
  if (!isRecord(value)) return "";

  const directText = textFromPrimitive(value.text);
  if (directText) return directText;

  return [value.content, value.children, value.props]
    .map(extractPlainText)
    .filter(Boolean)
    .join(" ");
}

function sanitizeStyledTextContent(content: unknown) {
  if (typeof content === "string") {
    return compactTextNode(content);
  }

  if (!Array.isArray(content)) {
    return compactTextNode(extractPlainText(content));
  }

  const result: SanitizedStyledText[] = [];
  for (const item of content) {
    if (typeof item === "string") {
      result.push(...compactTextNode(item));
      continue;
    }

    if (!isRecord(item)) continue;

    if (item.type === "text") {
      result.push(...compactTextNode(textFromPrimitive(item.text), item.styles));
      continue;
    }

    if (item.type === "link") {
      result.push(...sanitizeStyledTextContent(item.content));
      continue;
    }

    result.push(...compactTextNode(extractPlainText(item)));
  }
  return result;
}

function sanitizeInlineContent(content: unknown) {
  if (typeof content === "string") {
    return compactTextNode(content);
  }

  if (!Array.isArray(content)) {
    return compactTextNode(extractPlainText(content));
  }

  const result: unknown[] = [];
  for (const item of content) {
    if (typeof item === "string") {
      result.push(...compactTextNode(item));
      continue;
    }

    if (!isRecord(item)) continue;

    if (item.type === "text") {
      result.push(...compactTextNode(textFromPrimitive(item.text), item.styles));
      continue;
    }

    if (item.type === "link") {
      const href = asString(item.href);
      const linkContent = sanitizeStyledTextContent(item.content);
      if (href && linkContent.length > 0) {
        result.push({ type: "link", href, content: linkContent });
      } else {
        result.push(...linkContent);
      }
      continue;
    }

    result.push(...compactTextNode(extractPlainText(item)));
  }
  return result;
}

function normalizeBlockType(block: JsonRecord) {
  const rawType = asString(block.type) || "paragraph";
  const props = isRecord(block.props) ? { ...block.props } : {};

  if (rawType === "heading_1" || rawType === "heading_2" || rawType === "heading_3") {
    props.level = Number(rawType.slice(-1));
    return { type: "heading", props };
  }

  if (rawType === "bullet_list") return { type: "bulletListItem", props };
  if (rawType === "numbered_list") return { type: "numberedListItem", props };
  if (rawType === "todo") return { type: "checkListItem", props };
  if (rawType === "toggle") return { type: "toggleListItem", props };
  if (rawType === "code") return { type: "codeBlock", props };

  if (SUPPORTED_BLOCK_TYPES.has(rawType)) {
    return { type: rawType, props };
  }

  return { type: "paragraph", props: {} };
}

function addDefaultTextProps(result: JsonRecord, props: JsonRecord) {
  const textColor = asString(props.textColor);
  const backgroundColor = asString(props.backgroundColor);
  const textAlignment = asString(props.textAlignment);

  if (textColor) result.textColor = textColor;
  if (backgroundColor) result.backgroundColor = backgroundColor;
  if (textAlignment && TEXT_ALIGNMENTS.has(textAlignment)) {
    result.textAlignment = textAlignment;
  }
}

function sanitizeProps(type: string, props: JsonRecord) {
  const result: JsonRecord = {};

  if (INLINE_BLOCK_TYPES.has(type)) {
    addDefaultTextProps(result, props);
  }

  if (type === "heading") {
    const rawLevel = asFiniteNumber(props.level);
    const level = rawLevel && rawLevel >= 1 && rawLevel <= 6 ? Math.floor(rawLevel) : 1;
    result.level = level;
    if (props.isToggleable === true) result.isToggleable = true;
  }

  if (type === "checkListItem") {
    result.checked = asBoolean(props.checked) ?? false;
  }

  if (type === "numberedListItem") {
    const start = asFiniteNumber(props.start);
    if (start !== undefined) result.start = Math.max(1, Math.floor(start));
  }

  if (type === "codeBlock") {
    const language = asString(props.language);
    if (language) result.language = language;
  }

  if (type === "table") {
    const textColor = asString(props.textColor);
    if (textColor) result.textColor = textColor;
  }

  if (MEDIA_BLOCK_TYPES.has(type)) {
    const name = asString(props.name);
    const url = asString(props.url);
    const caption = asString(props.caption);
    const showPreview = asBoolean(props.showPreview);
    const previewWidth = asFiniteNumber(props.previewWidth);
    const backgroundColor = asString(props.backgroundColor);
    const textAlignment = asString(props.textAlignment);

    if (name) result.name = name;
    if (url) result.url = url;
    if (caption) result.caption = caption;
    if (showPreview !== undefined) result.showPreview = showPreview;
    if (previewWidth !== undefined) result.previewWidth = previewWidth;
    if (backgroundColor) result.backgroundColor = backgroundColor;
    if (textAlignment && TEXT_ALIGNMENTS.has(textAlignment)) {
      result.textAlignment = textAlignment;
    }
  }

  return result;
}

function sanitizeTableCellProps(props: unknown) {
  if (!isRecord(props)) return undefined;

  const result: JsonRecord = {};
  addDefaultTextProps(result, props);

  const colspan = asFiniteNumber(props.colspan);
  const rowspan = asFiniteNumber(props.rowspan);
  if (colspan !== undefined) result.colspan = Math.max(1, Math.floor(colspan));
  if (rowspan !== undefined) result.rowspan = Math.max(1, Math.floor(rowspan));

  return Object.keys(result).length > 0 ? result : undefined;
}

function sanitizeTableCell(cell: unknown): unknown {
  if (typeof cell === "string") return sanitizeInlineContent(cell);
  if (Array.isArray(cell)) return sanitizeInlineContent(cell);

  if (isRecord(cell) && cell.type === "tableCell") {
    const sanitizedCell: JsonRecord = {
      type: "tableCell",
      content: sanitizeInlineContent(cell.content),
    };
    const props = sanitizeTableCellProps(cell.props);
    if (props) sanitizedCell.props = props;
    return sanitizedCell;
  }

  return sanitizeInlineContent(extractPlainText(cell));
}

function sanitizeTableContent(content: unknown) {
  if (!isRecord(content) || content.type !== "tableContent" || !Array.isArray(content.rows)) {
    return undefined;
  }

  const rows = content.rows
    .map((row) => {
      if (!isRecord(row) || !Array.isArray(row.cells)) return null;
      return { cells: row.cells.map(sanitizeTableCell) };
    })
    .filter((row): row is { cells: unknown[] } => Boolean(row && row.cells.length > 0));

  if (rows.length === 0) return undefined;

  const tableContent: JsonRecord = {
    type: "tableContent",
    rows,
  };

  if (Array.isArray(content.columnWidths)) {
    const columnWidths = content.columnWidths.filter(
      (width): width is number => typeof width === "number" && Number.isFinite(width),
    );
    if (columnWidths.length > 0) tableContent.columnWidths = columnWidths;
  }

  const headerRows = asFiniteNumber(content.headerRows);
  const headerCols = asFiniteNumber(content.headerCols);
  if (headerRows !== undefined) tableContent.headerRows = Math.max(0, Math.floor(headerRows));
  if (headerCols !== undefined) tableContent.headerCols = Math.max(0, Math.floor(headerCols));

  return tableContent;
}

function sanitizeBlock(block: unknown, seenIds: Set<string>) {
  if (!isRecord(block)) return null;

  const normalized = normalizeBlockType(block);
  let type = normalized.type;
  const props = sanitizeProps(type, normalized.props);
  const next: SanitizedBlockNoteBlock = { type, children: [] };

  const id = asString(block.id);
  if (id && !seenIds.has(id)) {
    next.id = id;
    seenIds.add(id);
  }

  if (Object.keys(props).length > 0) {
    next.props = props;
  }

  if (type === "table") {
    const tableContent = sanitizeTableContent(block.content);
    if (tableContent) {
      next.content = tableContent;
    } else {
      type = "paragraph";
      next.type = type;
      next.content = sanitizeInlineContent(extractPlainText(block.content));
      delete next.props;
    }
  } else if (INLINE_BLOCK_TYPES.has(type)) {
    next.content = sanitizeInlineContent(block.content);
  }

  if (Array.isArray(block.children)) {
    next.children = sanitizeBlockNoteDocument(block.children, seenIds);
  }

  return next;
}

export function sanitizeBlockNoteDocument(
  blocks: unknown,
  seenIds = new Set<string>(),
): SanitizedBlockNoteBlock[] {
  const source = Array.isArray(blocks)
    ? blocks
    : isRecord(blocks)
      ? [blocks]
      : [];

  const result: SanitizedBlockNoteBlock[] = [];
  for (const block of source) {
    const sanitized = sanitizeBlock(block, seenIds);
    if (sanitized) result.push(sanitized);
  }
  return result;
}
