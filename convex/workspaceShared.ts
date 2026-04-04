import { v } from "convex/values";

export const workspaceRoleValidator = v.union(
  v.literal("viewer"),
  v.literal("editor"),
);

export const workspaceInviteStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("cancelled"),
);

export type WorkspaceRole = "owner" | "editor" | "viewer";
