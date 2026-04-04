import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  findUserByEmail,
  getCurrentUserRecord,
  getWorkspaceAccessForUser,
  normalizeEmail,
  requireAuthenticatedUserId,
  requireWorkspaceAccess,
} from "./workspaceAccess";
import { workspaceRoleValidator } from "./workspaceShared";

async function getWorkspaceMemberCount(ctx: any, workspaceId: Id<"workspaces">) {
  const members = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspaceId", (q: any) => q.eq("workspaceId", workspaceId))
    .collect();

  return members.length + 1;
}

async function buildWorkspaceSummary(
  ctx: any,
  workspace: any,
  role: "owner" | "editor" | "viewer",
) {
  const owner = await ctx.db.get(workspace.userId as Id<"users">);
  const memberCount = await getWorkspaceMemberCount(ctx, workspace._id);

  return {
    ...workspace,
    role,
    isShared: role !== "owner",
    ownerUserId: workspace.userId,
    ownerName: owner?.name ?? owner?.email ?? "Workspace owner",
    ownerEmail: owner?.email ?? null,
    memberCount,
  };
}

async function requireWorkspaceOwner(ctx: any, workspaceId: Id<"workspaces">) {
  const access = await requireWorkspaceAccess(ctx, workspaceId, "owner");
  return access;
}

async function clearWorkspaceInviteRecords(
  ctx: any,
  workspaceId: Id<"workspaces">,
  email: string,
) {
  const existingInvites = await ctx.db
    .query("workspaceInvites")
    .withIndex("by_workspaceId_email", (q: any) =>
      q.eq("workspaceId", workspaceId).eq("email", email),
    )
    .collect();

  for (const invite of existingInvites) {
    await ctx.db.delete(invite._id);
  }
}

// ---- Workspaces ----
export const createWorkspace = mutation({
  args: {
    name: v.string(),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUserId(ctx);

    return await ctx.db.insert("workspaces", {
      name: args.name,
      userId,
      icon: args.icon,
      createdAt: Date.now(),
    });
  },
});

export const getWorkspace = query({
  args: { id: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const access = await getWorkspaceAccessForUser(ctx, args.id, String(userId));
    if (!access) {
      return null;
    }

    return buildWorkspaceSummary(ctx, access.workspace, access.role);
  },
});

export const getWorkspaceAccess = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");
    const workspace = await buildWorkspaceSummary(ctx, access.workspace, access.role);

    return {
      workspace,
      role: access.role,
      isOwner: access.isOwner,
      canEdit: access.role !== "viewer",
      canManageMembers: access.role === "owner",
    };
  },
});

export const listWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const normalizedUserId = String(userId);
    const ownedWorkspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_userId", (q) => q.eq("userId", normalizedUserId))
      .collect();

    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_userId", (q: any) => q.eq("userId", normalizedUserId))
      .collect();

    const sharedWorkspaces = await Promise.all(
      memberships.map(async (membership) => {
        const workspace = await ctx.db.get(membership.workspaceId);
        if (!workspace) {
          return null;
        }

        return {
          workspace,
          role: membership.role as "editor" | "viewer",
        };
      }),
    );

    const summaries = await Promise.all([
      ...ownedWorkspaces.map((workspace) => buildWorkspaceSummary(ctx, workspace, "owner")),
      ...sharedWorkspaces
        .filter((entry): entry is { workspace: any; role: "editor" | "viewer" } => entry !== null)
        .map((entry) => buildWorkspaceSummary(ctx, entry.workspace, entry.role)),
    ]);

    const uniqueById = new Map<string, any>();
    for (const workspace of summaries) {
      uniqueById.set(String(workspace._id), workspace);
    }

    return Array.from(uniqueById.values()).sort((left, right) => {
      if (left.role === right.role) {
        return left.name.localeCompare(right.name);
      }

      if (left.role === "owner") return -1;
      if (right.role === "owner") return 1;
      return left.name.localeCompare(right.name);
    });
  },
});

export const listWorkspaceMembers = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAccess(ctx, args.workspaceId, "viewer");
    const owner = await ctx.db.get(access.workspace.userId as Id<"users">);
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspaceId", (q: any) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const memberUsers = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId as Id<"users">);
        return {
          _id: membership._id,
          userId: membership.userId,
          role: membership.role,
          joinedAt: membership.joinedAt,
          updatedAt: membership.updatedAt,
          name: user?.name ?? user?.email ?? "Member",
          email: user?.email ?? null,
          image: user?.image ?? null,
          isCurrentUser: membership.userId === access.userId,
        };
      }),
    );

    return [
      {
        _id: "owner",
        userId: access.workspace.userId,
        role: "owner" as const,
        joinedAt: access.workspace.createdAt,
        updatedAt: access.workspace.createdAt,
        name: owner?.name ?? owner?.email ?? "Workspace owner",
        email: owner?.email ?? null,
        image: owner?.image ?? null,
        isCurrentUser: access.workspace.userId === access.userId,
      },
      ...memberUsers.sort((left, right) => {
        if (left.role === right.role) {
          return left.name.localeCompare(right.name);
        }

        if (left.role === "editor") return -1;
        if (right.role === "editor") return 1;
        return left.name.localeCompare(right.name);
      }),
    ];
  },
});

export const listWorkspaceInvites = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceOwner(ctx, args.workspaceId);

    const invites = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_workspaceId", (q: any) => q.eq("workspaceId", args.workspaceId))
      .collect();

    return invites
      .filter((invite) => invite.status === "pending")
      .sort((left, right) => right.createdAt - left.createdAt);
  },
});

export const listMyWorkspaceInvites = query({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await getCurrentUserRecord(ctx);
    const normalizedEmail = user?.email ? normalizeEmail(String(user.email)) : "";
    if (!normalizedEmail) {
      return [];
    }

    const invites = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_email_status", (q: any) =>
        q.eq("email", normalizedEmail).eq("status", "pending"),
      )
      .collect();

    const detailedInvites = await Promise.all(
      invites.map(async (invite) => {
        const access = await getWorkspaceAccessForUser(ctx, invite.workspaceId, userId);
        if (access) {
          return null;
        }

        const workspace = await ctx.db.get(invite.workspaceId);
        if (!workspace) {
          return null;
        }

        const owner = await ctx.db.get(workspace.userId as Id<"users">);
        return {
          ...invite,
          workspaceName: workspace.name,
          workspaceIcon: workspace.icon ?? null,
          ownerName: owner?.name ?? owner?.email ?? "Workspace owner",
        };
      }),
    );

    return detailedInvites.filter((invite) => invite !== null);
  },
});

export const inviteToWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: workspaceRoleValidator,
  },
  handler: async (ctx, args) => {
    const access = await requireWorkspaceOwner(ctx, args.workspaceId);
    const normalizedEmail = normalizeEmail(args.email);
    if (!normalizedEmail) {
      throw new Error("Enter an email address");
    }

    const ownerUser = await ctx.db.get(access.workspace.userId as Id<"users">);
    if (normalizeEmail(String(ownerUser?.email ?? "")) === normalizedEmail) {
      throw new Error("The workspace owner already has access");
    }

    const existingUser = await findUserByEmail(ctx, normalizedEmail);
    if (existingUser) {
      const existingMembership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspaceId_userId", (q: any) =>
          q.eq("workspaceId", args.workspaceId).eq("userId", String(existingUser._id)),
        )
        .unique();

      if (existingMembership) {
        if (existingMembership.role === args.role) {
          throw new Error("That account already has access");
        }

        await ctx.db.patch(existingMembership._id, {
          role: args.role,
          updatedAt: Date.now(),
        });

        await clearWorkspaceInviteRecords(ctx, args.workspaceId, normalizedEmail);

        return {
          status: "updated_member" as const,
          workspaceId: args.workspaceId,
        };
      }

      await ctx.db.insert("workspaceMembers", {
        workspaceId: args.workspaceId,
        userId: String(existingUser._id),
        role: args.role,
        invitedByUserId: access.userId,
        joinedAt: Date.now(),
        updatedAt: Date.now(),
      });

      await clearWorkspaceInviteRecords(ctx, args.workspaceId, normalizedEmail);

      return {
        status: "added_member" as const,
        workspaceId: args.workspaceId,
      };
    }

    await clearWorkspaceInviteRecords(ctx, args.workspaceId, normalizedEmail);

    await ctx.db.insert("workspaceInvites", {
      workspaceId: args.workspaceId,
      email: normalizedEmail,
      invitedUserId: undefined,
      role: args.role,
      status: "pending",
      invitedByUserId: access.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      status: "created_invite" as const,
      workspaceId: args.workspaceId,
    };
  },
});

export const updateWorkspaceMemberRole = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    memberUserId: v.string(),
    role: workspaceRoleValidator,
  },
  handler: async (ctx, args) => {
    await requireWorkspaceOwner(ctx, args.workspaceId);

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspaceId_userId", (q: any) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.memberUserId),
      )
      .unique();

    if (!membership) {
      throw new Error("Member not found");
    }

    await ctx.db.patch(membership._id, {
      role: args.role,
      updatedAt: Date.now(),
    });
  },
});

export const removeWorkspaceMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    memberUserId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceOwner(ctx, args.workspaceId);

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspaceId_userId", (q: any) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.memberUserId),
      )
      .unique();

    if (!membership) {
      throw new Error("Member not found");
    }

    await ctx.db.delete(membership._id);
  },
});

export const cancelWorkspaceInvite = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    inviteId: v.id("workspaceInvites"),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceOwner(ctx, args.workspaceId);

    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.workspaceId !== args.workspaceId) {
      throw new Error("Invite not found");
    }

    await ctx.db.patch(invite._id, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
  },
});

export const acceptWorkspaceInvite = mutation({
  args: {
    inviteId: v.id("workspaceInvites"),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await getCurrentUserRecord(ctx);
    const normalizedEmail = normalizeEmail(String(user?.email ?? ""));
    if (!normalizedEmail) {
      throw new Error("Your account is missing an email address");
    }

    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.status !== "pending") {
      throw new Error("Invite not found");
    }

    if (invite.email !== normalizedEmail) {
      throw new Error("This invite was sent to a different email address");
    }

    const existingAccess = await getWorkspaceAccessForUser(ctx, invite.workspaceId, userId);
    if (!existingAccess) {
      await ctx.db.insert("workspaceMembers", {
        workspaceId: invite.workspaceId,
        userId,
        role: invite.role,
        invitedByUserId: invite.invitedByUserId,
        joinedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(invite._id, {
      invitedUserId: userId,
      status: "accepted",
      acceptedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return invite.workspaceId;
  },
});

export const declineWorkspaceInvite = mutation({
  args: {
    inviteId: v.id("workspaceInvites"),
  },
  handler: async (ctx, args) => {
    const { user } = await getCurrentUserRecord(ctx);
    const normalizedEmail = normalizeEmail(String(user?.email ?? ""));
    if (!normalizedEmail) {
      throw new Error("Your account is missing an email address");
    }

    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.status !== "pending") {
      throw new Error("Invite not found");
    }

    if (invite.email !== normalizedEmail) {
      throw new Error("This invite was sent to a different email address");
    }

    await ctx.db.patch(invite._id, {
      status: "declined",
      updatedAt: Date.now(),
    });
  },
});

// ---- User Settings ----
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

export const updateSettings = mutation({
  args: {
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
    accentColor: v.optional(v.string()),
    fontFamily: v.optional(v.union(v.literal("default"), v.literal("serif"), v.literal("mono"))),
    maddyEnabled: v.optional(v.boolean()),
    fullWidthDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUserId(ctx);

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("userSettings", { userId, ...args });
    }
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db.get(userId);
  },
});
