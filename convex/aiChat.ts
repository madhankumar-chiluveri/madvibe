import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Conversations ─────────────────────────────────────────────────────────────

export const listConversations = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("aiConversations")
      .withIndex("by_userId_updatedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const getConversation = query({
  args: { id: v.id("aiConversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createConversation = mutation({
  args: {
    title: v.optional(v.string()),
    model: v.string(),
    provider: v.string(),
    contextModule: v.optional(v.string()),
    contextPageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    return await ctx.db.insert("aiConversations", {
      userId,
      title: args.title ?? "New conversation",
      model: args.model,
      provider: args.provider,
      contextModule: args.contextModule,
      contextPageId: args.contextPageId,
      isPinned: false,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateConversationTitle = mutation({
  args: { id: v.id("aiConversations"), title: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { title: args.title });
  },
});

export const updateConversationConfig = mutation({
  args: {
    id: v.id("aiConversations"),
    model: v.string(),
    provider: v.string(),
    contextModule: v.optional(v.string()),
    contextPageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      model: args.model,
      provider: args.provider,
      contextModule: args.contextModule,
      contextPageId: args.contextPageId,
      updatedAt: Date.now(),
    });
  },
});

export const togglePin = mutation({
  args: { id: v.id("aiConversations") },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.id);
    if (!conv) return;
    await ctx.db.patch(args.id, { isPinned: !conv.isPinned });
  },
});

export const deleteConversation = mutation({
  args: { id: v.id("aiConversations") },
  handler: async (ctx, args) => {
    // Delete all messages
    const msgs = await ctx.db
      .query("aiMessages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.id))
      .collect();
    await Promise.all(msgs.map((m) => ctx.db.delete(m._id)));
    await ctx.db.delete(args.id);
  },
});

// ── Messages ──────────────────────────────────────────────────────────────────

export const getMessages = query({
  args: { conversationId: v.id("aiConversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiMessages")
      .withIndex("by_conversationId_createdAt", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();
  },
});

export const addMessage = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    model: v.optional(v.string()),
    tokensInput: v.optional(v.number()),
    tokensOutput: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("aiMessages", {
      ...args,
      createdAt: Date.now(),
    });
    // Update conversation metadata
    const conv = await ctx.db.get(args.conversationId);
    if (conv) {
      await ctx.db.patch(args.conversationId, {
        messageCount: conv.messageCount + 1,
        updatedAt: Date.now(),
        // Auto-generate title from first user message
        title:
          conv.messageCount === 0 && args.role === "user"
            ? args.content.slice(0, 60) + (args.content.length > 60 ? "…" : "")
            : conv.title,
      });
    }
    return id;
  },
});
