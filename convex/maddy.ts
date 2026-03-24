import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

type MaddyPagePreview = {
  title: string;
  contentPreview: string;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type MaddyEmbeddingRecord = {
  _id: unknown;
  vector: number[];
  contentHash: string;
};

type VectorSearchMatch = {
  _id: any;
};

type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type OpenAICompatibleResponse = {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
};

type AnthropicResponse = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
};

function readOpenAICompatibleContent(
  content:
    | string
    | Array<{
        type?: string;
        text?: string;
      }>
    | undefined
) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === "text" && typeof part.text === "string" ? part.text : ""))
      .join("\n")
      .trim();
  }

  return "";
}

async function callGeminiChat(args: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  history: ChatHistoryMessage[];
  prompt: string;
}) {
  const normalizedModel = args.model.startsWith("models/")
    ? args.model.split("/").pop() || "gemini-1.5-flash-latest"
    : args.model;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent?key=${args.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: args.systemPrompt }],
          },
          ...args.history.map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }],
          })),
          {
            role: "user",
            parts: [{ text: args.prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.65,
          maxOutputTokens: 1200,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = (await response.json()) as GeminiGenerateContentResponse;
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callOpenAICompatibleChat(args: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  history: ChatHistoryMessage[];
  prompt: string;
  baseUrl: string;
  extraHeaders?: Record<string, string>;
}) {
  const response = await fetch(args.baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      ...args.extraHeaders,
    },
    body: JSON.stringify({
      model: args.model,
      messages: [
        { role: "system", content: args.systemPrompt },
        ...args.history.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        { role: "user", content: args.prompt },
      ],
      temperature: 0.65,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.status}`);
  }

  const data = (await response.json()) as OpenAICompatibleResponse;
  return readOpenAICompatibleContent(data.choices?.[0]?.message?.content);
}

async function callAnthropicChat(args: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  history: ChatHistoryMessage[];
  prompt: string;
}) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": args.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: args.model,
      system: args.systemPrompt,
      max_tokens: 1200,
      temperature: 0.65,
      messages: [
        ...args.history.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        { role: "user", content: args.prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  return data.content
    ?.map((part) => (part.type === "text" && typeof part.text === "string" ? part.text : ""))
    .join("\n")
    .trim() ?? "";
}

// ---- Auto-tag page with Maddy ----
export const tagPage = action({
  args: {
    pageId: v.id("pages"),
    geminiApiKey: v.string(),
  },
  handler: async (ctx, args): Promise<{ tags: string[] }> => {
    const page = await ctx.runQuery(api.maddy.getPageForMaddy, {
      pageId: args.pageId,
    }) as MaddyPagePreview | null;
    if (!page) throw new Error("Page not found");

    const prompt = `You are Maddy, an AI knowledge organiser. Given the following note/page content, generate 3-7 relevant tags that categorise this content. Return ONLY a JSON array of tag strings, no explanation.

Title: ${page.title}
Content: ${page.contentPreview}

Return format: ["tag1", "tag2", "tag3"]`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${args.geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 200,
            },
          }),
        }
      );

      if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

      const data = await response.json() as GeminiGenerateContentResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

      // Extract JSON array from response
      const match = text.match(/\[[\s\S]*\]/);
      const tags: string[] = match ? JSON.parse(match[0]) : [];

      await ctx.runMutation(internal.maddy.updatePageTags, {
        pageId: args.pageId,
        tags: tags.slice(0, 8),
      });

      return { tags };
    } catch (err) {
      console.error("Maddy tagging error:", err);
      return { tags: [] };
    }
  },
});

// ---- Summarise page ----
export const summarisePage = action({
  args: {
    pageId: v.id("pages"),
    geminiApiKey: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const page = await ctx.runQuery(api.maddy.getPageForMaddy, {
      pageId: args.pageId,
    }) as MaddyPagePreview | null;
    if (!page) throw new Error("Page not found");

    const prompt = `Summarise the following content in 3-5 concise bullet points. Be direct and capture the key insights.

Title: ${page.title}
Content: ${page.contentPreview}

Return bullet points starting with •`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${args.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
        }),
      }
    );

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
    const data = await response.json() as GeminiGenerateContentResponse;
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  },
});

// ---- Extract tasks from page ----
export const extractTasks = action({
  args: {
    pageId: v.id("pages"),
    geminiApiKey: v.string(),
  },
  handler: async (ctx, args): Promise<string[]> => {
    const page = await ctx.runQuery(api.maddy.getPageForMaddy, {
      pageId: args.pageId,
    }) as MaddyPagePreview | null;
    if (!page) throw new Error("Page not found");

    const prompt = `Extract all actionable tasks and to-dos from the following content. Return a JSON array of task strings.

Title: ${page.title}
Content: ${page.contentPreview}

Return format: ["task 1", "task 2", "task 3"]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${args.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
        }),
      }
    );

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
    const data = await response.json() as GeminiGenerateContentResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  },
});

// ---- Inline command: rewrite/explain/continue ----
export const inlineCommand = action({
  args: {
    command: v.union(
      v.literal("explain"),
      v.literal("rewrite"),
      v.literal("continue"),
      v.literal("brainstorm"),
      v.literal("translate")
    ),
    text: v.string(),
    context: v.optional(v.string()),
    targetLanguage: v.optional(v.string()),
    geminiApiKey: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    let prompt = "";
    switch (args.command) {
      case "explain":
        prompt = `Explain the following text in simple, clear language:\n\n${args.text}`;
        break;
      case "rewrite":
        prompt = `Rewrite the following text to be clearer and more concise, preserving the original meaning:\n\n${args.text}`;
        break;
      case "continue":
        prompt = `Continue writing from this text naturally (1-3 sentences):\n\n${args.text}`;
        break;
      case "brainstorm":
        prompt = `Generate 10 creative ideas related to:\n\n${args.text}\n\nReturn as a numbered list.`;
        break;
      case "translate":
        prompt = `Translate the following text to ${args.targetLanguage ?? "Spanish"}:\n\n${args.text}`;
        break;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${args.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
        }),
      }
    );

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
    const data = await response.json() as GeminiGenerateContentResponse;
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  },
});

// ---- Conversational chat with Maddy ----
export const chatWithMaddy = action({
  args: {
    prompt: v.string(),
    apiKey: v.string(),
    provider: v.union(
      v.literal("gemini"),
      v.literal("openai"),
      v.literal("anthropic"),
      v.literal("groq"),
      v.literal("openrouter")
    ),
    model: v.string(),
    workspaceId: v.optional(v.id("workspaces")),
    pageId: v.optional(v.id("pages")),
    history: v.optional(
      v.array(
        v.object({
          role: v.union(v.literal("user"), v.literal("assistant")),
          content: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args): Promise<string> => {
    const contextSections: string[] = [];

    if (args.workspaceId) {
      const workspace = await ctx.runQuery(api.workspaces.getWorkspace, {
        id: args.workspaceId,
      });
      if (workspace?.name) {
        contextSections.push(`Current workspace: ${workspace.name}`);
      }
    }

    if (args.pageId) {
      const page = (await ctx.runQuery(api.maddy.getPageForMaddy, {
        pageId: args.pageId,
      })) as MaddyPagePreview | null;

      if (page) {
        contextSections.push(
          `Current page title: ${page.title}`,
          `Current page preview: ${page.contentPreview || "No page content available."}`
        );
      }
    }

    const systemPrompt = [
      "You are Maddy, a premium AI workspace assistant inside MadVibe.",
      "Be clear, concise, practical, and helpful.",
      "Use the available workspace and page context when it helps, but do not invent facts.",
      "When the user asks for ideas, structure them cleanly. When they ask for action, be decisive.",
      contextSections.length > 0 ? contextSections.join("\n") : "No additional workspace context is available.",
    ].join("\n\n");

    const contents = [
      ...(args.history ?? []).slice(-8),
    ];

    if (args.provider === "gemini") {
      return await callGeminiChat({
        apiKey: args.apiKey,
        model: args.model,
        systemPrompt,
        history: contents,
        prompt: args.prompt,
      });
    }

    if (args.provider === "anthropic") {
      return await callAnthropicChat({
        apiKey: args.apiKey,
        model: args.model,
        systemPrompt,
        history: contents,
        prompt: args.prompt,
      });
    }

    if (args.provider === "groq") {
      return await callOpenAICompatibleChat({
        apiKey: args.apiKey,
        model: args.model,
        systemPrompt,
        history: contents,
        prompt: args.prompt,
        baseUrl: "https://api.groq.com/openai/v1/chat/completions",
      });
    }

    if (args.provider === "openrouter") {
      return await callOpenAICompatibleChat({
        apiKey: args.apiKey,
        model: args.model,
        systemPrompt,
        history: contents,
        prompt: args.prompt,
        baseUrl: "https://openrouter.ai/api/v1/chat/completions",
        extraHeaders: {
          "X-Title": "MadVibe Maddy",
        },
      });
    }

    return await callOpenAICompatibleChat({
      apiKey: args.apiKey,
      model: args.model,
      systemPrompt,
      history: contents,
      prompt: args.prompt,
      baseUrl: "https://api.openai.com/v1/chat/completions",
    });
  },
});

// ---- Generate a project starter page ----
export const generateProjectStarter = action({
  args: {
    projectName: v.string(),
    brief: v.string(),
    geminiApiKey: v.string(),
  },
  handler: async (_ctx, args): Promise<string> => {
    const prompt = `You are Maddy, an AI project planning assistant.

Create a practical markdown starter page for this project.
Project name: ${args.projectName}
Brief: ${args.brief}

Use this structure:
# Project Name
## Mission
## Success Criteria
## Scope
## Milestones
## Risks
## First Tasks
## Notes

Be concrete, concise, and useful. Return only markdown.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${args.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1400,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json() as GeminiGenerateContentResponse;
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  },
});

// ---- Generate embedding for semantic search ----
export const generateEmbedding = action({
  args: {
    pageId: v.id("pages"),
    geminiApiKey: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const page = await ctx.runQuery(api.maddy.getPageForMaddy, {
      pageId: args.pageId,
    }) as MaddyPagePreview | null;
    if (!page) return;

    const textToEmbed = `${page.title}\n${page.contentPreview}`.slice(0, 2000);
    const contentHash = await hashString(textToEmbed);

    // Check if already embedded with same content
    const existing = await ctx.runQuery(api.maddy.getEmbedding, {
      pageId: args.pageId,
    }) as MaddyEmbeddingRecord | null;
    if (existing?.contentHash === contentHash) return;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${args.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text: textToEmbed }] },
        }),
      }
    );

    if (!response.ok) throw new Error(`Gemini Embedding API error: ${response.status}`);
    const data = await response.json() as { embedding?: { values?: number[] } };
    const vector: number[] = data.embedding?.values ?? [];

    if (vector.length > 0) {
      await ctx.runMutation(internal.maddy.upsertEmbedding, {
        pageId: args.pageId,
        vector,
        contentHash,
      });
    }
  },
});

// ---- Semantic search ----
export const semanticSearch = action({
  args: {
    query: v.string(),
    workspaceId: v.id("workspaces"),
    geminiApiKey: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any[]> => {
    if (!args.query.trim()) return [];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${args.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text: args.query }] },
        }),
      }
    );

    if (!response.ok) return [];
    const data = await response.json() as { embedding?: { values?: number[] } };
    const queryVector: number[] = data.embedding?.values ?? [];

    if (queryVector.length === 0) return [];

    const results = await ctx.vectorSearch("maddyEmbeddings", "by_vector", {
      vector: queryVector,
      limit: args.limit ?? 10,
    }) as VectorSearchMatch[];

    const pageIds = results.map((r) => r._id);
    const pages = await ctx.runQuery(api.maddy.getPagesByEmbeddingIds, {
      embeddingIds: pageIds,
      workspaceId: args.workspaceId,
    }) as any[];

    return pages;
  },
});

// ---- Related pages (Maddy Suggests) ----
export const getRelatedPages = action({
  args: {
    pageId: v.id("pages"),
    workspaceId: v.id("workspaces"),
    geminiApiKey: v.string(),
  },
  handler: async (ctx, args): Promise<any[]> => {
    const page = await ctx.runQuery(api.maddy.getPageForMaddy, {
      pageId: args.pageId,
    }) as MaddyPagePreview | null;
    if (!page) return [];

    const existing = await ctx.runQuery(api.maddy.getEmbedding, {
      pageId: args.pageId,
    }) as MaddyEmbeddingRecord | null;
    if (!existing || existing.vector.length === 0) return [];

    const results = await ctx.vectorSearch("maddyEmbeddings", "by_vector", {
      vector: existing.vector,
      limit: 8,
    }) as VectorSearchMatch[];

    // Exclude the current page
    const filteredIds = results
      .filter((r) => r._id !== existing._id)
      .slice(0, 5)
      .map((r) => r._id);

    const pages = await ctx.runQuery(api.maddy.getPagesByEmbeddingIds, {
      embeddingIds: filteredIds,
      workspaceId: args.workspaceId,
    }) as any[];

    return pages;
  },
});

// ---- Internal helpers ----
export const getPageForMaddy = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args): Promise<MaddyPagePreview | null> => {
    const page = await ctx.db.get(args.pageId);
    if (!page) return null;

    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_pageId", (q) => q.eq("pageId", args.pageId))
      .order("asc")
      .take(20);

    const textContent = blocks
      .map((b) => {
        try {
          if (typeof b.content === "string") return b.content;
          if (b.content?.content) {
            return extractText(b.content);
          }
          return "";
        } catch {
          return "";
        }
      })
      .join(" ")
      .slice(0, 1000);

    return {
      title: page.title,
      contentPreview: textContent,
    };
  },
});

function extractText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.text) return node.text;
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (node.content) return extractText(node.content);
  return "";
}

export const updatePageTags = internalMutation({
  args: {
    pageId: v.id("pages"),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.pageId, { maddyTags: args.tags, updatedAt: Date.now() });
  },
});

export const upsertEmbedding = internalMutation({
  args: {
    pageId: v.id("pages"),
    vector: v.array(v.float64()),
    contentHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("maddyEmbeddings")
      .withIndex("by_pageId", (q) => q.eq("pageId", args.pageId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        vector: args.vector,
        contentHash: args.contentHash,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("maddyEmbeddings", {
        pageId: args.pageId,
        vector: args.vector,
        contentHash: args.contentHash,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getEmbedding = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args): Promise<any | null> => {
    return await ctx.db
      .query("maddyEmbeddings")
      .withIndex("by_pageId", (q) => q.eq("pageId", args.pageId))
      .first();
  },
});

export const getPagesByEmbeddingIds = query({
  args: {
    embeddingIds: v.array(v.id("maddyEmbeddings")),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args): Promise<any[]> => {
    const results: any[] = [];
    for (const embId of args.embeddingIds) {
      const emb = await ctx.db.get(embId);
      if (!emb) continue;
      const page = await ctx.db.get(emb.pageId);
      if (page && page.workspaceId === args.workspaceId && !page.isArchived) {
        results.push(page);
      }
    }
    return results;
  },
});

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- Organise Workspace ----
export const organiseWorkspace = action({
  args: {
    pageList: v.array(v.object({
      id: v.id("pages"),
      title: v.string(),
      tags: v.array(v.string()),
      parentId: v.optional(v.union(v.id("pages"), v.null())),
    })),
    geminiApiKey: v.string(),
  },
  handler: async (ctx, args): Promise<any[]> => {
    if (args.pageList.length === 0) return [];

    const pageListText = args.pageList
      .slice(0, 40)
      .map((p) => `- "${p.title}" (id: ${p.id}, tags: ${p.tags.join(", ") || "none"})`)
      .join("\n");

    const prompt = `You are Maddy, an AI knowledge organiser. Analyse these notes and suggest reorganisations.

Pages:
${pageListText}

Return a JSON array of suggestions. Format:
[{"type": "move", "pageId": "<id>", "pageTitle": "<title>", "description": "<action>", "reason": "<why>"}]

Return [] if the structure looks fine. Return ONLY a valid JSON array.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${args.geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
          }),
        }
      );
      if (!response.ok) return [];
      const data = await response.json() as GeminiGenerateContentResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) return [];
      const suggestions = JSON.parse(match[0]);
      return Array.isArray(suggestions) ? suggestions : [];
    } catch {
      return [];
    }
  },
});
