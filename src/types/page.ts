// ─────────────────────────────────────────────────────────────
// src/types/page.ts
// ─────────────────────────────────────────────────────────────
import { Id } from "../../convex/_generated/dataModel";

export type PageType = "document" | "database" | "dashboard";

export interface Page {
  _id: Id<"pages">;
  _creationTime: number;
  workspaceId: Id<"workspaces">;
  parentId: Id<"pages"> | null;
  type: PageType;
  isSpaceRoot?: boolean;
  title: string;
  icon: string | null;
  coverImage: string | null;
  isFullWidth: boolean;
  isFavourite: boolean;
  isArchived: boolean;
  archivedAt: number | null;
  sortOrder: number;
  createdBy: string;
  updatedAt: number;
  maddyTags?: string[];
  maddySuggested?: string[];
}

export interface Workspace {
  _id: Id<"workspaces">;
  _creationTime: number;
  name: string;
  userId: string;
  icon?: string;
  createdAt: number;
}

export interface CreatePageInput {
  workspaceId: Id<"workspaces">;
  parentId?: Id<"pages"> | null;
  type?: PageType;
  isSpaceRoot?: boolean;
  title?: string;
  icon?: string;
}

export interface UpdatePageInput {
  id: Id<"pages">;
  title?: string;
  icon?: string | null;
  coverImage?: string | null;
  isFullWidth?: boolean;
  isFavourite?: boolean;
  maddyTags?: string[];
  maddySuggested?: string[];
}
