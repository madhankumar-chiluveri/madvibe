// ─────────────────────────────────────────────────────────────
// src/types/database.ts
// ─────────────────────────────────────────────────────────────
import { Id } from "../../convex/_generated/dataModel";

export type PropertyType =
  | "title"
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

export interface PropertyConfig {
  options?: SelectOption[];
  format?: string;
  width?: number;
  wrap?: boolean;
  frozen?: boolean;
  showPageIcon?: boolean;
  relation?: { databaseId: Id<"databases"> };
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

export interface FilterCondition {
  propertyId: string;
  operator: string;
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
