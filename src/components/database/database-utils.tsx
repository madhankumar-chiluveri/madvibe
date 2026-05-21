"use client";

import {
  CalendarDays,
  CheckSquare,
  Clock3,
  FileText,
  Hash,
  Link2,
  List,
  Mail,
  Phone,
  Sigma,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type {
  FilterCondition,
  FilterGroup,
  FilterOperator,
  FormulaConfig,
  FormulaDisplayStyle,
  FormulaResultType,
  PropertyConfig,
  PropertySchema,
  PropertyType,
  SelectOption,
  SortRule,
} from "@/types/database";

export const TITLE_COLUMN_WIDTH = 360;
export const DEFAULT_COLUMN_WIDTH = 220;
export const ACTION_COLUMN_WIDTH = 80;
export const MIN_TABLE_WIDTH = 920;

export const SELECT_OPTION_COLORS = [
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
] as const;

export interface FilterOperatorMeta {
  value: FilterOperator;
  label: string;
}

export interface PropertyValueContext {
  rowData?: Record<string, unknown> | null;
  properties?: PropertySchema[];
  rowCreatedAt?: number;
  now?: number;
}

type FormulaEvaluationContext = Required<Pick<PropertyValueContext, "rowCreatedAt" | "now">> & {
  rowData: Record<string, unknown>;
  properties: PropertySchema[];
  stack: Set<string>;
};

type BadgeTone = "gray" | "green" | "red" | "amber" | "blue";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const HOUR_IN_MS = 60 * 60 * 1000;
const MINUTE_IN_MS = 60 * 1000;

export const PROPERTY_TYPE_META: Array<{
  value: PropertyType;
  label: string;
  icon: LucideIcon;
  supported: boolean;
}> = [
  { value: "title", label: "Title", icon: Type, supported: true },
  { value: "id", label: "ID", icon: Hash, supported: true },
  { value: "text", label: "Text", icon: FileText, supported: true },
  { value: "number", label: "Number", icon: Hash, supported: true },
  { value: "select", label: "Select", icon: List, supported: true },
  { value: "multi_select", label: "Multi-select", icon: List, supported: true },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare, supported: true },
  { value: "date", label: "Date", icon: CalendarDays, supported: true },
  { value: "url", label: "URL", icon: Link2, supported: true },
  { value: "email", label: "Email", icon: Mail, supported: true },
  { value: "phone", label: "Phone", icon: Phone, supported: true },
  { value: "created_time", label: "Created time", icon: Clock3, supported: true },
  { value: "formula", label: "Formula", icon: Sigma, supported: true },
  { value: "relation", label: "Relation", icon: Link2, supported: false },
  { value: "rollup", label: "Rollup", icon: Hash, supported: false },
  { value: "file", label: "Files", icon: FileText, supported: false },
];

export function getPropertyMeta(type: PropertyType) {
  return PROPERTY_TYPE_META.find((item) => item.value === type) ?? PROPERTY_TYPE_META[0];
}

export function getPropertyIcon(type: PropertyType, className = "h-3.5 w-3.5") {
  const Icon = getPropertyMeta(type).icon;
  return <Icon className={className} />;
}

function normalizeFormulaResultType(value: unknown): FormulaResultType {
  return value === "number" || value === "date" ? value : "text";
}

function normalizeFormulaDisplayStyle(value: unknown): FormulaDisplayStyle {
  return value === "plain" || value === "badge" ? value : "auto";
}

export function getFormulaConfig(
  property: Partial<PropertySchema> | null | undefined
): FormulaConfig {
  const config = property?.config?.formula;

  return {
    expression: typeof config?.expression === "string" ? config.expression : "",
    resultType: normalizeFormulaResultType(config?.resultType),
    displayStyle: normalizeFormulaDisplayStyle(config?.displayStyle),
  };
}

export function getDefaultColumnWidth(type: PropertyType) {
  switch (type) {
    case "title":
      return TITLE_COLUMN_WIDTH;
    case "id":
      return 120;
    case "checkbox":
      return 96;
    case "date":
    case "created_time":
      return 190;
    case "number":
      return 160;
    case "formula":
      return 210;
    case "url":
    case "email":
    case "phone":
      return 240;
    default:
      return DEFAULT_COLUMN_WIDTH;
  }
}

export function getPropertyWidth(property: Partial<PropertySchema>) {
  const type = (property.type ?? "text") as PropertyType;
  const legacyWidth = (property as { width?: number })?.width;
  const width = Number(property.config?.width ?? legacyWidth ?? getDefaultColumnWidth(type));
  return Number.isFinite(width) ? width : getDefaultColumnWidth(type);
}

export function getDefaultConfig(type: PropertyType): PropertyConfig {
  return {
    options: type === "select" || type === "multi_select" ? [] : undefined,
    width: getDefaultColumnWidth(type),
    wrap: type === "text" || type === "formula",
    frozen: type === "title",
    showPageIcon: type === "title",
    nextId: type === "id" ? 1 : undefined,
    formula:
      type === "formula"
        ? {
            expression: "",
            resultType: "text",
            displayStyle: "auto",
          }
        : undefined,
  };
}

function normalizeOption(option: Partial<SelectOption> | null | undefined): SelectOption {
  return {
    id: String(option?.id ?? crypto.randomUUID()),
    label: String(option?.label ?? "Option"),
    color: String(option?.color ?? "gray"),
  };
}

export function getPropertyOptions(property: Partial<PropertySchema> | null | undefined): SelectOption[] {
  const options = property?.config?.options ?? property?.options ?? [];
  return Array.isArray(options) ? options.map(normalizeOption) : [];
}

export function normalizeProperty(property: Partial<PropertySchema> | null | undefined, index = 0): PropertySchema {
  const type = (property?.type ?? "text") as PropertyType;
  const defaults = getDefaultConfig(type);
  const config = property?.config ?? {};

  return {
    id: String(property?.id ?? `property_${index + 1}`),
    name: String(property?.name ?? getPropertyMeta(type).label),
    type,
    config: {
      ...defaults,
      ...config,
      options: supportsOptions(type) ? getPropertyOptions(property) : undefined,
      width: Number(config.width ?? (property as { width?: number })?.width ?? defaults.width),
      wrap: Boolean(config.wrap ?? (property as { wrap?: boolean })?.wrap ?? defaults.wrap),
      frozen: Boolean(config.frozen ?? (property as { frozen?: boolean })?.frozen ?? defaults.frozen),
      showPageIcon: Boolean(
        config.showPageIcon ??
          (property as { showPageIcon?: boolean })?.showPageIcon ??
          defaults.showPageIcon
      ),
      nextId:
        type === "id"
          ? Number(config.nextId ?? (property as { nextId?: number })?.nextId ?? defaults.nextId ?? 1)
          : undefined,
      formula: type === "formula" ? getFormulaConfig(property) : undefined,
    },
  };
}

export function normalizeProperties(properties: PropertySchema[] | undefined | null): PropertySchema[] {
  const normalized = (properties ?? []).map((property, index) => normalizeProperty(property, index));
  const titleIndex = normalized.findIndex((property) => property.type === "title");

  if (titleIndex === -1) {
    return [createProperty("title", "Name"), ...normalized];
  }

  return normalized.map((property, index) => {
    if (property.type !== "title") return property;

    return {
      ...property,
      config: {
        ...property.config,
        frozen: index === titleIndex ? Boolean(property.config?.frozen ?? true) : false,
        showPageIcon: Boolean(property.config?.showPageIcon ?? true),
      },
    };
  });
}

export function createProperty(type: PropertyType, name?: string): PropertySchema {
  return {
    id: `property_${crypto.randomUUID()}`,
    name: name ?? getPropertyMeta(type).label,
    type,
    config: getDefaultConfig(type),
  };
}

export function updateProperty(
  property: PropertySchema,
  updates: Partial<Omit<PropertySchema, "config">> & { config?: Partial<PropertyConfig> }
): PropertySchema {
  const nextType = updates.type ?? property.type;
  const baseDefaults = getDefaultConfig(nextType);
  const options = supportsOptions(nextType)
    ? updates.config?.options ?? property.config?.options ?? []
    : undefined;
  const formula = nextType === "formula"
    ? {
        ...getFormulaConfig({ config: baseDefaults }),
        ...getFormulaConfig(property),
        ...updates.config?.formula,
      }
    : undefined;

  return normalizeProperty({
    ...property,
    ...updates,
    type: nextType,
    config: {
      ...baseDefaults,
      ...property.config,
      ...updates.config,
      options,
      formula,
    },
  });
}

export function supportsOptions(type: PropertyType) {
  return type === "select" || type === "multi_select";
}

function isFormulaNumeric(property: PropertySchema) {
  return property.type === "formula" && getFormulaResultType(property) === "number";
}

function isFormulaDate(property: PropertySchema) {
  return property.type === "formula" && getFormulaResultType(property) === "date";
}

function isDateLikeProperty(property: PropertySchema) {
  return property.type === "date" || property.type === "created_time" || isFormulaDate(property);
}

function isNumericLikeProperty(property: PropertySchema) {
  return property.type === "id" || property.type === "number" || isDateLikeProperty(property) || isFormulaNumeric(property);
}

export function getFilterOperatorOptions(property: PropertySchema): FilterOperatorMeta[] {
  if (property.type === "checkbox") {
    return [{ value: "is", label: "Is" }];
  }

  if (property.type === "select") {
    return [
      { value: "is", label: "Is" },
      { value: "is_not", label: "Is not" },
      { value: "is_empty", label: "Is empty" },
      { value: "is_not_empty", label: "Is not empty" },
    ];
  }

  if (property.type === "multi_select") {
    return [
      { value: "contains", label: "Contains" },
      { value: "does_not_contain", label: "Does not contain" },
      { value: "is_empty", label: "Is empty" },
      { value: "is_not_empty", label: "Is not empty" },
    ];
  }

  if (isNumericLikeProperty(property)) {
    return [
      { value: "is", label: isDateLikeProperty(property) ? "Is" : "Is equal to" },
      { value: "is_not", label: isDateLikeProperty(property) ? "Is not" : "Is not equal to" },
      { value: "greater_than", label: isDateLikeProperty(property) ? "After" : "Greater than" },
      {
        value: "greater_than_or_equal",
        label: isDateLikeProperty(property) ? "On or after" : "Greater than or equal",
      },
      { value: "less_than", label: isDateLikeProperty(property) ? "Before" : "Less than" },
      {
        value: "less_than_or_equal",
        label: isDateLikeProperty(property) ? "On or before" : "Less than or equal",
      },
      { value: "is_empty", label: "Is empty" },
      { value: "is_not_empty", label: "Is not empty" },
    ];
  }

  return [
    { value: "contains", label: "Contains" },
    { value: "does_not_contain", label: "Does not contain" },
    { value: "is", label: "Is" },
    { value: "is_not", label: "Is not" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ];
}

export function getDefaultFilterOperator(property: PropertySchema): FilterOperator {
  return getFilterOperatorOptions(property)[0]?.value ?? "contains";
}

export function filterOperatorNeedsValue(operator: FilterOperator) {
  return operator !== "is_empty" && operator !== "is_not_empty";
}

function hasProvidedFilterValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return value !== null && value !== undefined;
}

export function isFilterConditionActive(
  condition: FilterCondition,
  properties: PropertySchema[]
) {
  const property = properties.find((candidate) => candidate.id === condition.propertyId);
  if (!property) return false;

  return filterOperatorNeedsValue(condition.operator)
    ? hasProvidedFilterValue(condition.value)
    : true;
}

export function getDefaultFilterValue(
  property: PropertySchema,
  operator = getDefaultFilterOperator(property)
) {
  if (!filterOperatorNeedsValue(operator)) {
    return "";
  }

  if (property.type === "checkbox") {
    return "true";
  }

  if (supportsOptions(property.type)) {
    return getPropertyOptions(property)[0]?.id ?? "";
  }

  return "";
}

export function getDefaultValueForProperty(property: Pick<PropertySchema, "type">) {
  switch (property.type) {
    case "title":
      return "Untitled";
    case "id":
      return null;
    case "checkbox":
      return false;
    case "multi_select":
      return [];
    case "formula":
      return null;
    default:
      return null;
  }
}

export function buildInitialRowData(properties: PropertySchema[], now = Date.now()) {
  const initialData: Record<string, unknown> = {};

  for (const property of properties) {
    if (property.type === "created_time") {
      initialData[property.id] = now;
      continue;
    }

    const configuredDefault = property.config?.defaultValue;
    if (configuredDefault !== undefined && configuredDefault !== null) {
      initialData[property.id] = normalizeValueForProperty(
        property,
        cloneDatabaseValue(configuredDefault)
      );
      continue;
    }

    initialData[property.id] = getDefaultValueForProperty(property);
  }

  return initialData;
}

export function cloneDatabaseValue<T>(value: T): T {
  if (value === undefined || value === null) {
    return value;
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function createSnapshotRowData(
  rowData: Record<string, unknown> | null | undefined,
  properties: PropertySchema[],
  rowCreatedAt?: number
) {
  const nextData = cloneDatabaseValue(rowData ?? {});

  for (const property of properties) {
    if (
      property.type === "created_time" &&
      rowCreatedAt !== undefined &&
      nextData[property.id] === undefined
    ) {
      nextData[property.id] = rowCreatedAt;
    }
  }

  return nextData;
}

export function normalizeValueForProperty(property: Pick<PropertySchema, "type">, value: unknown) {
  switch (property.type) {
    case "id":
      if (value === null || value === undefined || value === "") return null;
      return Number.isNaN(Number(value)) ? null : Math.max(1, Math.floor(Number(value)));
    case "title":
    case "text":
    case "url":
    case "email":
    case "phone":
      if (value === null || value === undefined || value === "") return null;
      return String(value);
    case "number":
      if (value === null || value === undefined || value === "") return null;
      return Number.isNaN(Number(value)) ? null : Number(value);
    case "checkbox":
      return Boolean(value);
    case "date":
    case "created_time": {
      if (value === null || value === undefined || value === "") return null;
      const parsed = toTimestamp(value);
      return parsed === null ? null : parsed;
    }
    case "select":
      if (value === null || value === undefined || value === "") return null;
      if (Array.isArray(value)) return value[0] ?? null;
      return String(value);
    case "multi_select":
      if (value === null || value === undefined || value === "") return [];
      if (Array.isArray(value)) return value.map((item) => String(item));
      return [String(value)];
    case "formula":
      return null;
    default:
      return value ?? null;
  }
}

export function getPropertyOption(property: Partial<PropertySchema>, optionId: unknown) {
  if (optionId === null || optionId === undefined || optionId === "") return null;
  const normalizedOptionId = String(optionId);

  return (
    getPropertyOptions(property).find(
      (option) => option.id === normalizedOptionId || option.label === normalizedOptionId
    ) ?? null
  );
}

export function doesPropertyValueMatchOption(
  property: Partial<PropertySchema>,
  value: unknown,
  optionId: string
) {
  const option = getPropertyOption(property, optionId);
  if (!option) return false;

  const matches = (candidate: unknown) => {
    if (candidate === null || candidate === undefined || candidate === "") return false;
    const normalized = String(candidate);
    return normalized === option.id || normalized === option.label;
  };

  return Array.isArray(value) ? value.some(matches) : matches(value);
}

export function getPropertyOptionList(property: Partial<PropertySchema>, value: unknown) {
  const values = Array.isArray(value)
    ? value.map((item) => String(item))
    : value === null || value === undefined || value === ""
      ? []
      : [String(value)];

  return values
    .map((optionId) => getPropertyOption(property, optionId))
    .filter((option): option is SelectOption => Boolean(option));
}

function toTimestamp(rawValue: unknown) {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return null;
  }

  if (rawValue instanceof Date) {
    const timestamp = rawValue.getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  if (typeof rawValue === "number") {
    return Number.isFinite(rawValue) ? rawValue : null;
  }

  const asNumber = Number(rawValue);
  if (Number.isFinite(asNumber) && String(rawValue).trim() !== "") {
    return asNumber;
  }

  const parsed = new Date(String(rawValue)).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function getFormulaResultType(property: Partial<PropertySchema>) {
  return getFormulaConfig(property).resultType ?? "text";
}

function getFormulaDisplayStyle(property: Partial<PropertySchema>) {
  return getFormulaConfig(property).displayStyle ?? "auto";
}

function formatTimestampValue(rawValue: unknown, options?: Intl.DateTimeFormatOptions) {
  const timestamp = toTimestamp(rawValue);
  if (timestamp === null) return "";

  return new Intl.DateTimeFormat(
    "en-US",
    options ?? {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(new Date(timestamp));
}

function formatCompactDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / MINUTE_IN_MS));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.length > 0 ? parts.join(" ") : "0m";
}

function toNumberValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toTextValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value.map((entry): string => toTextValue(entry)).join(", ");
  }

  return String(value);
}

function isEmptyPropertyValue(value: unknown) {
  return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
}

function findPropertyReference(reference: string, properties: PropertySchema[]) {
  const normalizedReference = reference.trim().toLowerCase();

  return (
    properties.find((property) => property.id === reference) ??
    properties.find((property) => property.name.trim().toLowerCase() === normalizedReference) ??
    null
  );
}

function coerceFormulaValue(value: unknown, resultType: FormulaResultType) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  switch (resultType) {
    case "number":
      return toNumberValue(value);
    case "date":
      return toTimestamp(value);
    default:
      return value;
  }
}

function getRawPropertyValue(
  property: PropertySchema,
  rowData: Record<string, unknown>,
  rowCreatedAt?: number
) {
  if (property.type === "created_time") {
    return rowData[property.id] ?? rowCreatedAt ?? null;
  }

  return rowData[property.id];
}

function getUnitDivisor(unit: string) {
  const normalizedUnit = unit.toLowerCase();
  if (normalizedUnit.startsWith("minute")) return MINUTE_IN_MS;
  if (normalizedUnit.startsWith("hour")) return HOUR_IN_MS;
  if (normalizedUnit.startsWith("day")) return DAY_IN_MS;
  return 1;
}

function wholeUnitDifference(diff: number, unit: string) {
  const divisor = getUnitDivisor(unit);
  const ratio = diff / divisor;
  return ratio >= 0 ? Math.floor(ratio) : Math.ceil(ratio);
}

function resolvePropertyValueInternal(
  property: PropertySchema,
  rawValue: unknown,
  context: FormulaEvaluationContext
): unknown {
  if (property.type !== "formula") {
    return property.type === "created_time" ? rawValue ?? context.rowCreatedAt ?? null : rawValue;
  }

  if (context.stack.has(property.id)) {
    return "#CYCLE!";
  }

  const expression = getFormulaConfig(property).expression?.trim();
  if (!expression) {
    return null;
  }

  const nextStack = new Set(context.stack);
  nextStack.add(property.id);

  const resolveReference = (reference: unknown) => {
    if (reference === null || reference === undefined || reference === "") {
      return null;
    }

    const referencedProperty = findPropertyReference(String(reference), context.properties);
    if (!referencedProperty) {
      return null;
    }

    return resolvePropertyValueInternal(
      referencedProperty,
      getRawPropertyValue(referencedProperty, context.rowData, context.rowCreatedAt),
      {
        ...context,
        stack: nextStack,
      }
    );
  };

  const IF = (condition: unknown, truthy: unknown, falsy: unknown) =>
    condition ? truthy : falsy;
  const AND = (...values: unknown[]) => values.every(Boolean);
  const OR = (...values: unknown[]) => values.some(Boolean);
  const NOT = (value: unknown) => !value;
  const NOW = () => context.now;
  const TODAY = () => {
    const date = new Date(context.now);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };
  const DATE = (value?: unknown) => (value === undefined ? context.now : toTimestamp(value));
  const DATE_ADD = (value: unknown, amount: unknown, unit = "days") => {
    const timestamp = toTimestamp(value);
    const numericAmount = toNumberValue(amount);
    if (timestamp === null || numericAmount === null) return null;
    return timestamp + numericAmount * getUnitDivisor(unit);
  };
  const DATE_DIFF = (left: unknown, right: unknown, unit = "days") => {
    const leftValue = toTimestamp(left);
    const rightValue = toTimestamp(right);
    if (leftValue === null || rightValue === null) return null;
    return (leftValue - rightValue) / getUnitDivisor(unit);
  };
  const DAYS_UNTIL = (value: unknown) => {
    const timestamp = toTimestamp(value);
    if (timestamp === null) return null;
    return wholeUnitDifference(timestamp - context.now, "days");
  };
  const HOURS_UNTIL = (value: unknown) => {
    const timestamp = toTimestamp(value);
    if (timestamp === null) return null;
    return wholeUnitDifference(timestamp - context.now, "hours");
  };
  const MINUTES_UNTIL = (value: unknown) => {
    const timestamp = toTimestamp(value);
    if (timestamp === null) return null;
    return wholeUnitDifference(timestamp - context.now, "minutes");
  };
  const RENEWS_IN = (value: unknown, activeLabel = "Active") => {
    const timestamp = toTimestamp(value);
    if (timestamp === null) return null;
    const diff = timestamp - context.now;
    return diff <= 0 ? activeLabel : formatCompactDuration(diff);
  };
  const CONCAT = (...values: unknown[]) => values.map((value) => toTextValue(value)).join("");
  const TEXT = (value: unknown) => toTextValue(value);
  const NUMBER = (value: unknown) => toNumberValue(value);
  const ROUND = (value: unknown, digits = 0) => {
    const numericValue = toNumberValue(value);
    const numericDigits = toNumberValue(digits);
    if (numericValue === null || numericDigits === null) return null;
    const factor = 10 ** numericDigits;
    return Math.round(numericValue * factor) / factor;
  };
  const MIN = (...values: unknown[]) => {
    const numbers = values.map(toNumberValue).filter((value): value is number => value !== null);
    return numbers.length > 0 ? Math.min(...numbers) : null;
  };
  const MAX = (...values: unknown[]) => {
    const numbers = values.map(toNumberValue).filter((value): value is number => value !== null);
    return numbers.length > 0 ? Math.max(...numbers) : null;
  };
  const ABS = (value: unknown) => {
    const numericValue = toNumberValue(value);
    return numericValue === null ? null : Math.abs(numericValue);
  };
  const UPPER = (value: unknown) => toTextValue(value).toUpperCase();
  const LOWER = (value: unknown) => toTextValue(value).toLowerCase();
  const IS_EMPTY = (value: unknown) => isEmptyPropertyValue(value);

  try {
    const evaluator = new Function(
      "PROP",
      "prop",
      "IF",
      "AND",
      "OR",
      "NOT",
      "NOW",
      "TODAY",
      "DATE",
      "DATE_ADD",
      "DATE_DIFF",
      "DAYS_UNTIL",
      "HOURS_UNTIL",
      "MINUTES_UNTIL",
      "RENEWS_IN",
      "CONCAT",
      "TEXT",
      "NUMBER",
      "ROUND",
      "MIN",
      "MAX",
      "ABS",
      "UPPER",
      "LOWER",
      "IS_EMPTY",
      "window",
      "document",
      "globalThis",
      "Function",
      "eval",
      `"use strict"; return (${expression});`
    );

    return coerceFormulaValue(
      evaluator(
        resolveReference,
        resolveReference,
        IF,
        AND,
        OR,
        NOT,
        NOW,
        TODAY,
        DATE,
        DATE_ADD,
        DATE_DIFF,
        DAYS_UNTIL,
        HOURS_UNTIL,
        MINUTES_UNTIL,
        RENEWS_IN,
        CONCAT,
        TEXT,
        NUMBER,
        ROUND,
        MIN,
        MAX,
        ABS,
        UPPER,
        LOWER,
        IS_EMPTY,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      ),
      getFormulaResultType(property)
    );
  } catch {
    return "#ERROR!";
  }
}

export function getResolvedPropertyValue(
  property: PropertySchema,
  value: unknown,
  context: PropertyValueContext = {}
) {
  const properties = context.properties ?? [property];
  const rowData = context.rowData ?? {};

  return resolvePropertyValueInternal(property, value, {
    rowData,
    properties,
    rowCreatedAt: context.rowCreatedAt ?? 0,
    now: context.now ?? Date.now(),
    stack: new Set<string>(),
  });
}

function getFormulaBadgeTone(value: unknown): BadgeTone | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.startsWith("#")) return "red";

  if (
    normalized.includes("active") ||
    normalized.includes("done") ||
    normalized.includes("paid") ||
    normalized.includes("complete") ||
    normalized.includes("healthy") ||
    normalized.includes("current")
  ) {
    return "green";
  }

  if (
    normalized.includes("expired") ||
    normalized.includes("overdue") ||
    normalized.includes("blocked") ||
    normalized.includes("failed") ||
    normalized.includes("inactive") ||
    normalized.includes("error")
  ) {
    return "red";
  }

  if (
    normalized.includes("soon") ||
    normalized.includes("pending") ||
    normalized.includes("warning") ||
    normalized.includes("review")
  ) {
    return "amber";
  }

  if (
    normalized.includes("progress") ||
    normalized.includes("planned") ||
    normalized.includes("queued")
  ) {
    return "blue";
  }

  return null;
}

export function shouldRenderFormulaAsBadge(property: PropertySchema, value: unknown) {
  const displayStyle = getFormulaDisplayStyle(property);

  if (displayStyle === "plain") return false;
  if (value === null || value === undefined || value === "") return false;
  if (displayStyle === "badge") return true;

  return Boolean(getFormulaBadgeTone(value));
}

export function getFormulaBadgeClasses(value: unknown) {
  const tone = getFormulaBadgeTone(value) ?? "gray";
  const palette: Record<BadgeTone, string> = {
    gray: "border-foreground/10 bg-foreground/[0.05] text-foreground",
    green: "border-emerald-500/22 bg-emerald-500/18 text-emerald-100",
    red: "border-red-500/22 bg-red-500/18 text-red-100",
    amber: "border-amber-400/22 bg-amber-400/18 text-amber-100",
    blue: "border-sky-500/22 bg-sky-500/18 text-sky-100",
  };

  return palette[tone];
}

export function getPropertyValueAsText(
  property: PropertySchema,
  value: unknown,
  context: PropertyValueContext = {}
) {
  const resolvedValue = getResolvedPropertyValue(property, value, context);

  switch (property.type) {
    case "id":
      return String(resolvedValue ?? "");
    case "select":
      return getPropertyOption(property, resolvedValue)?.label ?? String(resolvedValue ?? "");
    case "multi_select":
      return getPropertyOptionList(property, resolvedValue)
        .map((option) => option.label)
        .join(", ");
    case "checkbox":
      return Boolean(resolvedValue) ? "checked" : "unchecked";
    case "date":
      return formatTimestampValue(resolvedValue);
    case "created_time":
      return formatTimestampValue(resolvedValue, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    case "formula":
      if (getFormulaResultType(property) === "date") {
        return formatTimestampValue(resolvedValue);
      }

      return toTextValue(resolvedValue);
    default:
      return String(resolvedValue ?? "");
  }
}

function getPropertyValueForSorting(
  property: PropertySchema,
  value: unknown,
  context: PropertyValueContext = {}
) {
  const resolvedValue = getResolvedPropertyValue(property, value, context);

  switch (property.type) {
    case "id":
      return resolvedValue === null || resolvedValue === undefined || resolvedValue === ""
        ? null
        : Number(resolvedValue);
    case "number":
      return resolvedValue === null || resolvedValue === undefined || resolvedValue === ""
        ? null
        : Number(resolvedValue);
    case "checkbox":
      return Boolean(resolvedValue) ? 1 : 0;
    case "date":
    case "created_time":
      return resolvedValue === null || resolvedValue === undefined || resolvedValue === ""
        ? null
        : Number(resolvedValue);
    case "formula": {
      const resultType = getFormulaResultType(property);

      if (resultType === "number" || resultType === "date") {
        return resolvedValue === null || resolvedValue === undefined || resolvedValue === ""
          ? null
          : Number(resolvedValue);
      }

      return toTextValue(resolvedValue).toLowerCase();
    }
    default:
      return getPropertyValueAsText(property, value, context).toLowerCase();
  }
}

function matchesFilterCondition(
  row: {
    _creationTime: number;
    data?: Record<string, unknown>;
  },
  property: PropertySchema,
  condition: FilterCondition,
  properties: PropertySchema[],
  now?: number
) {
  const rawValue = row.data?.[property.id];
  const context = {
    rowData: row.data,
    properties,
    rowCreatedAt: row._creationTime,
    now,
  };
  const resolvedValue = getResolvedPropertyValue(property, rawValue, context);

  if (condition.operator === "is_empty") {
    return isEmptyPropertyValue(resolvedValue);
  }

  if (condition.operator === "is_not_empty") {
    return !isEmptyPropertyValue(resolvedValue);
  }

  if (supportsOptions(property.type)) {
    const optionId = String(condition.value ?? "");
    const matchesOption = doesPropertyValueMatchOption(property, resolvedValue, optionId);

    if (condition.operator === "does_not_contain" || condition.operator === "is_not") {
      return !matchesOption;
    }

    return matchesOption;
  }

  if (property.type === "checkbox") {
    const expectedValue = condition.value === true || condition.value === "true";
    return condition.operator === "is_not"
      ? Boolean(resolvedValue) !== expectedValue
      : Boolean(resolvedValue) === expectedValue;
  }

  if (isNumericLikeProperty(property)) {
    const leftValue = isDateLikeProperty(property)
      ? toTimestamp(resolvedValue)
      : toNumberValue(resolvedValue);
    const rightValue = isDateLikeProperty(property)
      ? toTimestamp(condition.value)
      : toNumberValue(condition.value);

    if (leftValue === null || rightValue === null) {
      return false;
    }

    switch (condition.operator) {
      case "is":
        return leftValue === rightValue;
      case "is_not":
        return leftValue !== rightValue;
      case "greater_than":
        return leftValue > rightValue;
      case "greater_than_or_equal":
        return leftValue >= rightValue;
      case "less_than":
        return leftValue < rightValue;
      case "less_than_or_equal":
        return leftValue <= rightValue;
      default:
        return false;
    }
  }

  const leftText = getPropertyValueAsText(property, rawValue, context).trim().toLowerCase();
  const rightText = toTextValue(condition.value).trim().toLowerCase();

  switch (condition.operator) {
    case "contains":
      return leftText.includes(rightText);
    case "does_not_contain":
      return !leftText.includes(rightText);
    case "is":
      return leftText === rightText;
    case "is_not":
      return leftText !== rightText;
    default:
      return false;
  }
}

export function filterAndSortRows(
  rows: Array<{
    _creationTime: number;
    data?: Record<string, unknown>;
  }>,
  properties: PropertySchema[],
  {
    searchQuery,
    filters,
    sorts,
    now,
  }: {
    searchQuery: string;
    filters: FilterGroup | null;
    sorts: SortRule[];
    now?: number;
  }
) {
  let nextRows = [...rows];
  const normalizedSearch = searchQuery.trim().toLowerCase();

  if (normalizedSearch) {
    nextRows = nextRows.filter((row) =>
      properties.some((property) =>
        getPropertyValueAsText(property, row.data?.[property.id], {
          rowData: row.data,
          properties,
          rowCreatedAt: row._creationTime,
          now,
        })
          .toLowerCase()
          .includes(normalizedSearch)
      )
    );
  }

  const activeConditions =
    filters?.conditions.filter((condition) => isFilterConditionActive(condition, properties)) ?? [];

  if (activeConditions.length > 0) {
    const filterMode = filters?.operator ?? "and";

    nextRows = nextRows.filter((row) => {
      const results = activeConditions.map((condition) => {
        const property = properties.find((candidate) => candidate.id === condition.propertyId);
        if (!property) return false;

        return matchesFilterCondition(row, property, condition, properties, now);
      });

      return filterMode === "or" ? results.some(Boolean) : results.every(Boolean);
    });
  }

  const activeSorts = sorts.filter((rule) =>
    properties.some((candidate) => candidate.id === rule.propertyId)
  );

  if (activeSorts.length === 0) {
    return nextRows;
  }

  return nextRows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      for (const sort of activeSorts) {
        const property = properties.find((candidate) => candidate.id === sort.propertyId);
        if (!property) continue;

        const leftValue = getPropertyValueForSorting(property, left.row.data?.[property.id], {
          rowData: left.row.data,
          properties,
          rowCreatedAt: left.row._creationTime,
          now,
        });
        const rightValue = getPropertyValueForSorting(property, right.row.data?.[property.id], {
          rowData: right.row.data,
          properties,
          rowCreatedAt: right.row._creationTime,
          now,
        });

        const leftEmpty = leftValue === null || leftValue === undefined || leftValue === "";
        const rightEmpty = rightValue === null || rightValue === undefined || rightValue === "";

        if (leftEmpty && rightEmpty) {
          continue;
        }
        if (leftEmpty) return 1;
        if (rightEmpty) return -1;

        let comparison = 0;
        if (typeof leftValue === "number" && typeof rightValue === "number") {
          comparison = leftValue - rightValue;
        } else {
          comparison = String(leftValue).localeCompare(String(rightValue));
        }

        if (comparison !== 0) {
          return sort.direction === "asc" ? comparison : comparison * -1;
        }
      }

      return left.index - right.index;
    })
    .map((entry) => entry.row);
}

export function getSelectColorClasses(color: string): string {
  const palette: Record<string, string> = {
    gray:
      "border-zinc-300 bg-zinc-200/95 text-zinc-800 shadow-[inset_0_0_0_1px_rgba(113,113,122,0.16)] dark:border-zinc-500/40 dark:bg-zinc-500/30 dark:text-zinc-100",
    brown:
      "border-amber-500/40 bg-amber-200/95 text-amber-950 shadow-[inset_0_0_0_1px_rgba(180,83,9,0.18)] dark:border-amber-500/40 dark:bg-amber-600/30 dark:text-amber-100",
    orange:
      "border-orange-400/50 bg-orange-200/95 text-orange-950 shadow-[inset_0_0_0_1px_rgba(234,88,12,0.18)] dark:border-orange-500/50 dark:bg-orange-500/30 dark:text-orange-100",
    yellow:
      "border-yellow-400/50 bg-yellow-200/95 text-yellow-950 shadow-[inset_0_0_0_1px_rgba(202,138,4,0.2)] dark:border-yellow-400/40 dark:bg-yellow-400/25 dark:text-yellow-50",
    green:
      "border-emerald-400/50 bg-emerald-200/95 text-emerald-950 shadow-[inset_0_0_0_1px_rgba(5,150,105,0.18)] dark:border-emerald-400/50 dark:bg-emerald-500/25 dark:text-emerald-50",
    blue:
      "border-sky-400/50 bg-sky-200/95 text-sky-950 shadow-[inset_0_0_0_1px_rgba(2,132,199,0.2)] dark:border-sky-400/50 dark:bg-sky-500/30 dark:text-sky-50",
    purple:
      "border-violet-400/50 bg-violet-200/95 text-violet-950 shadow-[inset_0_0_0_1px_rgba(124,58,237,0.18)] dark:border-violet-400/50 dark:bg-violet-500/25 dark:text-violet-50",
    pink:
      "border-pink-400/50 bg-pink-200/95 text-pink-950 shadow-[inset_0_0_0_1px_rgba(219,39,119,0.18)] dark:border-pink-400/50 dark:bg-pink-500/25 dark:text-pink-50",
    red:
      "border-red-400/50 bg-red-200/95 text-red-950 shadow-[inset_0_0_0_1px_rgba(220,38,38,0.18)] dark:border-red-400/50 dark:bg-red-500/25 dark:text-red-50",
  };

  return palette[color] ?? palette.gray;
}

export function getSelectColorDotClass(color: string): string {
  const palette: Record<string, string> = {
    gray: "bg-zinc-500",
    brown: "bg-amber-700 dark:bg-amber-300",
    orange: "bg-orange-500 dark:bg-orange-300",
    yellow: "bg-yellow-500 dark:bg-yellow-300",
    green: "bg-emerald-500 dark:bg-emerald-300",
    blue: "bg-sky-500 dark:bg-sky-300",
    purple: "bg-violet-500 dark:bg-violet-300",
    pink: "bg-pink-500 dark:bg-pink-300",
    red: "bg-red-500 dark:bg-red-300",
  };

  return palette[color] ?? palette.gray;
}
