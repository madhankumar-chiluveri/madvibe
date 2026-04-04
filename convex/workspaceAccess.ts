import { getAuthUserId } from "@convex-dev/auth/server";

import type { Id } from "./_generated/dataModel";
import type { WorkspaceRole } from "./workspaceShared";

const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function requireAuthenticatedUserId(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  return String(userId);
}

export async function getCurrentUserRecord(ctx: any) {
  const userId = await requireAuthenticatedUserId(ctx);
  const user = await ctx.db.get(userId);
  return {
    userId,
    user,
  };
}

export async function findUserByEmail(ctx: any, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const exactMatches = await ctx.db
    .query("users")
    .filter((q: any) => q.eq(q.field("email"), normalizedEmail))
    .take(2);

  if (exactMatches.length > 1) {
    throw new Error("Multiple accounts matched that email.");
  }

  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  const rawMatches =
    normalizedEmail === email.trim()
      ? []
      : await ctx.db
          .query("users")
          .filter((q: any) => q.eq(q.field("email"), email.trim()))
          .take(2);

  if (rawMatches.length > 1) {
    throw new Error("Multiple accounts matched that email.");
  }

  return rawMatches[0] ?? null;
}

export async function getWorkspaceAccessForUser(
  ctx: any,
  workspaceId: Id<"workspaces">,
  userId: string,
) {
  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) {
    return null;
  }

  if (workspace.userId === userId) {
    return {
      workspace,
      role: "owner" as const,
      isOwner: true,
      membership: null,
    };
  }

  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspaceId_userId", (q: any) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId),
    )
    .unique();

  if (!membership) {
    return null;
  }

  return {
    workspace,
    role: membership.role as WorkspaceRole,
    isOwner: false,
    membership,
  };
}

export async function requireWorkspaceAccess(
  ctx: any,
  workspaceId: Id<"workspaces">,
  minimumRole: WorkspaceRole = "viewer",
) {
  const userId = await requireAuthenticatedUserId(ctx);
  const access = await getWorkspaceAccessForUser(ctx, workspaceId, userId);

  if (!access) {
    throw new Error("Workspace not found or access denied");
  }

  if (ROLE_RANK[access.role] < ROLE_RANK[minimumRole]) {
    throw new Error("You do not have permission to edit this workspace");
  }

  return {
    ...access,
    userId,
  };
}

export async function requirePageAccess(
  ctx: any,
  pageId: Id<"pages">,
  minimumRole: WorkspaceRole = "viewer",
) {
  const page = await ctx.db.get(pageId);
  if (!page) {
    throw new Error("Page not found");
  }

  const access = await requireWorkspaceAccess(ctx, page.workspaceId, minimumRole);
  return {
    page,
    ...access,
  };
}

export async function requireBlockAccess(
  ctx: any,
  blockId: Id<"blocks">,
  minimumRole: WorkspaceRole = "viewer",
) {
  const block = await ctx.db.get(blockId);
  if (!block) {
    throw new Error("Block not found");
  }

  const pageAccess = await requirePageAccess(ctx, block.pageId, minimumRole);
  return {
    block,
    ...pageAccess,
  };
}

export async function requireDatabaseAccess(
  ctx: any,
  databaseId: Id<"databases">,
  minimumRole: WorkspaceRole = "viewer",
) {
  const database = await ctx.db.get(databaseId);
  if (!database) {
    throw new Error("Database not found");
  }

  const pageAccess = await requirePageAccess(ctx, database.pageId, minimumRole);
  return {
    database,
    ...pageAccess,
  };
}

export async function requireRowAccess(
  ctx: any,
  rowId: Id<"rows">,
  minimumRole: WorkspaceRole = "viewer",
) {
  const row = await ctx.db.get(rowId);
  if (!row) {
    throw new Error("Row not found");
  }

  const databaseAccess = await requireDatabaseAccess(ctx, row.databaseId, minimumRole);
  return {
    row,
    ...databaseAccess,
  };
}

export async function requireViewAccess(
  ctx: any,
  viewId: Id<"views">,
  minimumRole: WorkspaceRole = "viewer",
) {
  const view = await ctx.db.get(viewId);
  if (!view) {
    throw new Error("View not found");
  }

  const databaseAccess = await requireDatabaseAccess(ctx, view.databaseId, minimumRole);
  return {
    view,
    ...databaseAccess,
  };
}

export async function requireCommentAccess(
  ctx: any,
  commentId: Id<"comments">,
  minimumRole: WorkspaceRole = "viewer",
) {
  const comment = await ctx.db.get(commentId);
  if (!comment) {
    throw new Error("Comment not found");
  }

  const access = await requireWorkspaceAccess(ctx, comment.workspaceId, minimumRole);
  return {
    comment,
    ...access,
  };
}
