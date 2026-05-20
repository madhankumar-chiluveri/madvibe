// ─────────────────────────────────────────────────────────────
// src/types/database.ts
// ─────────────────────────────────────────────────────────────
import { Id } from "../../convex/_generated/dataModel";

export type PropertyType =
  | "title"
  | "id"
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "checkbox"
  | "date"
  | "url"
  | "email"
  | "phone"
  | "relation"
  | "rollup"
  | "formula"
  | "created_time"
  | "file";

export interface SelectOption {
  id: string;
  label: string;
  color: string;
}

export type FormulaResultType = "text" | "number" | "date";
export type FormulaDisplayStyle = "auto" | "plain" | "badge";

export interface FormulaConfig {
  expression?: string;
  resultType?: FormulaResultType;
  displayStyle?: FormulaDisplayStyle;
}

export interface PropertyConfig {
  options?: SelectOption[];
  format?: string;
  width?: number;
  wrap?: boolean;
  frozen?: boolean;
  showPageIcon?: boolean;
  nextId?: number;
  relation?: { databaseId: Id<"databases"> };
  formula?: FormulaConfig;
  defaultValue?: unknown;
}

export interface PropertySchema {
  id: string;
  name: string;
  type: PropertyType;
  config?: PropertyConfig;
  options?: SelectOption[];
}

export interface Database {
  _id: Id<"databases">;
  _creationTime: number;
  pageId: Id<"pages">;
  name: string;
  properties: PropertySchema[];
  defaultViewId: Id<"views"> | null;
}

export type ViewType = "table" | "board" | "list" | "calendar" | "gallery" | "timeline";

export type FilterOperator =
  | "contains"
  | "does_not_contain"
  | "is"
  | "is_not"
  | "is_empty"
  | "is_not_empty"
  | "greater_than"
  | "greater_than_or_equal"
  | "less_than"
  | "less_than_or_equal";

export interface FilterCondition {
  propertyId: string;
  operator: FilterOperator;
  value: unknown;
}

export interface FilterGroup {
  operator: "and" | "or";
  conditions: FilterCondition[];
}

export interface SortRule {
  propertyId: string;
  direction: "asc" | "desc";
}

export interface DatabaseView {
  _id: Id<"views">;
  _creationTime: number;
  databaseId: Id<"databases">;
  name: string;
  type: ViewType;
  filters: FilterGroup | null;
  sorts: SortRule[];
  groupBy: string | null;
  visibleProperties: string[];
  cardCoverPropertyId: string | null;
}

export interface DatabaseRow {
  _id: Id<"rows">;
  _creationTime: number;
  databaseId: Id<"databases">;
  pageId: Id<"pages"> | null;
  data: Record<string, unknown>;
  sortOrder: number;
  isArchived?: boolean;
}
