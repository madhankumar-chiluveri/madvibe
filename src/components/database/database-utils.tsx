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
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { PropertyConfig, PropertySchema, PropertyType, SelectOption } from "@/types/database";

export const TITLE_COLUMN_WIDTH = 360;
export const DEFAULT_COLUMN_WIDTH = 220;
export const ACTION_COLUMN_WIDTH = 44;
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

export const PROPERTY_TYPE_META: Array<{
  value: PropertyType;
  label: string;
  icon: LucideIcon;
  supported: boolean;
}> = [
  { value: "title", label: "Title", icon: Type, supported: true },
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
  { value: "relation", label: "Relation", icon: Link2, supported: false },
  { value: "rollup", label: "Rollup", icon: Hash, supported: false },
  { value: "formula", label: "Formula", icon: Hash, supported: false },
  { value: "file", label: "Files", icon: FileText, supported: false },
];

export interface DatabaseFilterState {
  propertyId: string | null;
  value: string;
}

export interface DatabaseSortState {
  propertyId: string | null;
  direction: "asc" | "desc";
}

export function getPropertyMeta(type: PropertyType) {
  return PROPERTY_TYPE_META.find((item) => item.value === type) ?? PROPERTY_TYPE_META[0];
}

export function getPropertyIcon(type: PropertyType, className = "h-3.5 w-3.5") {
  const Icon = getPropertyMeta(type).icon;
  return <Icon className={className} />;
}

export function getDefaultColumnWidth(type: PropertyType) {
  switch (type) {
    case "title":
      return TITLE_COLUMN_WIDTH;
    case "checkbox":
      return 96;
    case "date":
    case "created_time":
      return 190;
    case "number":
      return 160;
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
  const legacyWidth = (property as any)?.width;
  const width = Number(property.config?.width ?? legacyWidth ?? getDefaultColumnWidth(type));
  return Number.isFinite(width) ? width : getDefaultColumnWidth(type);
}

export function getDefaultConfig(type: PropertyType): PropertyConfig {
  return {
    options: type === "select" || type === "multi_select" ? [] : undefined,
    width: getDefaultColumnWidth(type),
    wrap: type === "text",
    frozen: type === "title",
    showPageIcon: type === "title",
  };
}

function normalizeOption(option: any): SelectOption {
  return {
    id: String(option?.id ?? crypto.randomUUID()),
    label: String(option?.label ?? option?.name ?? "Option"),
    color: String(option?.color ?? "gray"),
  };
}

export function getPropertyOptions(property: Partial<PropertySchema> | null | undefined): SelectOption[] {
  const options = property?.config?.options ?? property?.options ?? [];
  return Array.isArray(options) ? options.map(normalizeOption) : [];
}

export function normalizeProperty(property: any, index = 0): PropertySchema {
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
      width: Number(config?.width ?? property?.width ?? defaults.width),
      wrap: Boolean(config?.wrap ?? property?.wrap ?? defaults.wrap),
      frozen: Boolean(config?.frozen ?? property?.frozen ?? defaults.frozen),
      showPageIcon: Boolean(
        config?.showPageIcon ?? property?.showPageIcon ?? defaults.showPageIcon
      ),
    },
  };
}

export function normalizeProperties(properties: any[] | undefined | null): PropertySchema[] {
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

  return normalizeProperty({
    ...property,
    ...updates,
    type: nextType,
    config: {
      ...baseDefaults,
      ...property.config,
      ...updates.config,
      options,
    },
  });
}

export function supportsOptions(type: PropertyType) {
  return type === "select" || type === "multi_select";
}

export function getDefaultValueForProperty(property: Pick<PropertySchema, "type">) {
  switch (property.type) {
    case "title":
      return "Untitled";
    case "checkbox":
      return false;
    case "multi_select":
      return [];
    default:
      return null;
  }
}

export function normalizeValueForProperty(property: Pick<PropertySchema, "type">, value: unknown) {
  switch (property.type) {
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
      const parsed = typeof value === "number" ? value : new Date(String(value)).getTime();
      return Number.isNaN(parsed) ? null : parsed;
    }
    case "select":
      if (value === null || value === undefined || value === "") return null;
      if (Array.isArray(value)) return value[0] ?? null;
      return String(value);
    case "multi_select":
      if (value === null || value === undefined || value === "") return [];
      if (Array.isArray(value)) return value.map((item) => String(item));
      return [String(value)];
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

function formatTimestampValue(rawValue: unknown, options?: Intl.DateTimeFormatOptions) {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return "";
  }

  const date = new Date(Number(rawValue));
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", options ?? {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function getPropertyValueAsText(
  property: PropertySchema,
  value: unknown,
  rowCreatedAt?: number
) {
  switch (property.type) {
    case "select":
      return getPropertyOption(property, value)?.label ?? String(value ?? "");
    case "multi_select":
      return getPropertyOptionList(property, value)
        .map((option) => option.label)
        .join(", ");
    case "checkbox":
      return Boolean(value) ? "checked" : "unchecked";
    case "date":
      return formatTimestampValue(value);
    case "created_time":
      return formatTimestampValue(rowCreatedAt ?? value, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    default:
      return String(value ?? "");
  }
}

function getPropertyValueForSorting(
  property: PropertySchema,
  value: unknown,
  rowCreatedAt?: number
) {
  switch (property.type) {
    case "number":
      return value === null || value === undefined || value === "" ? null : Number(value);
    case "checkbox":
      return Boolean(value) ? 1 : 0;
    case "date":
      return value === null || value === undefined || value === "" ? null : Number(value);
    case "created_time":
      return rowCreatedAt ?? (value === null || value === undefined || value === "" ? null : Number(value));
    default:
      return getPropertyValueAsText(property, value, rowCreatedAt).toLowerCase();
  }
}

function isEmptyPropertyValue(value: unknown) {
  return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
}

export function filterAndSortRows(
  rows: any[],
  properties: PropertySchema[],
  {
    searchQuery,
    filter,
    sort,
  }: {
    searchQuery: string;
    filter: DatabaseFilterState;
    sort: DatabaseSortState;
  }
) {
  let nextRows = [...rows];
  const normalizedSearch = searchQuery.trim().toLowerCase();

  if (normalizedSearch) {
    nextRows = nextRows.filter((row) =>
      properties.some((property) =>
        getPropertyValueAsText(property, row.data?.[property.id], row._creationTime)
          .toLowerCase()
          .includes(normalizedSearch)
      )
    );
  }

  if (filter.propertyId && filter.value) {
    const property = properties.find((candidate) => candidate.id === filter.propertyId);

    if (property) {
      nextRows = nextRows.filter((row) => {
        const rawValue = row.data?.[property.id];

        if (filter.value === "__empty") {
          return isEmptyPropertyValue(rawValue);
        }

        switch (property.type) {
          case "select":
          case "multi_select":
            return doesPropertyValueMatchOption(property, rawValue, filter.value);
          case "checkbox":
            return Boolean(rawValue) === (filter.value === "true");
          default:
            return getPropertyValueAsText(property, rawValue, row._creationTime)
              .toLowerCase()
              .includes(filter.value.trim().toLowerCase());
        }
      });
    }
  }

  if (!sort.propertyId) {
    return nextRows;
  }

  const property = properties.find((candidate) => candidate.id === sort.propertyId);
  if (!property) {
    return nextRows;
  }

  return nextRows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftValue = getPropertyValueForSorting(
        property,
        left.row.data?.[property.id],
        left.row._creationTime
      );
      const rightValue = getPropertyValueForSorting(
        property,
        right.row.data?.[property.id],
        right.row._creationTime
      );

      const leftEmpty = leftValue === null || leftValue === undefined || leftValue === "";
      const rightEmpty = rightValue === null || rightValue === undefined || rightValue === "";

      if (leftEmpty && rightEmpty) return left.index - right.index;
      if (leftEmpty) return 1;
      if (rightEmpty) return -1;

      let comparison = 0;
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        comparison = leftValue - rightValue;
      } else {
        comparison = String(leftValue).localeCompare(String(rightValue));
      }

      if (comparison === 0) {
        comparison = left.index - right.index;
      }

      return sort.direction === "asc" ? comparison : comparison * -1;
    })
    .map((entry) => entry.row);
}

export function getSelectColorClasses(color: string): string {
  const palette: Record<string, string> = {
    gray: "border-zinc-500/20 bg-zinc-500/14 text-zinc-200",
    brown: "border-amber-900/30 bg-amber-900/25 text-amber-100",
    orange: "border-orange-500/25 bg-orange-500/18 text-orange-100",
    yellow: "border-amber-400/20 bg-amber-400/16 text-amber-100",
    green: "border-emerald-500/20 bg-emerald-500/18 text-emerald-100",
    blue: "border-sky-500/20 bg-sky-500/18 text-sky-100",
    purple: "border-violet-500/20 bg-violet-500/18 text-violet-100",
    pink: "border-pink-500/20 bg-pink-500/18 text-pink-100",
    red: "border-red-500/20 bg-red-500/18 text-red-100",
  };

  return palette[color] ?? palette.gray;
}

export function getSelectColorDotClass(color: string): string {
  const palette: Record<string, string> = {
    gray: "bg-zinc-300",
    brown: "bg-amber-200",
    orange: "bg-orange-300",
    yellow: "bg-amber-300",
    green: "bg-emerald-300",
    blue: "bg-sky-300",
    purple: "bg-violet-300",
    pink: "bg-pink-300",
    red: "bg-red-300",
  };

  return palette[color] ?? palette.gray;
}
