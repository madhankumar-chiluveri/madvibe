"use client";

import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft, Bot, Check, ChevronDown, CircleAlert,
  Copy, History, Loader2, Plus, Send, Settings2,
  Sparkles, Trash2, X, Zap,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppIcon } from "@/components/ui/app-icon";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app.store";

// ── Constants ─────────────────────────────────────────────────────────────────

const PANEL_EASE = [0.22, 1, 0.36, 1] as const;

// ── Model registry ────────────────────────────────────────────────────────────
export const MADDY_MODELS = [
  // ── Gemini (Google AI Studio) ──────────────────────────────────────────────
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    maker: "Google AI Studio",
    badge: "GEMINI",
    speed: "fastest",
    ctx: "1M",
    best: "Best overall — fastest, smartest, free-tier tool-calling",
  },
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    maker: "Google AI Studio",
    badge: "GEMINI",
    speed: "fastest",
    ctx: "1M",
    best: "Reliable free-tier fallback with 1M context window",
  },
  // ── GitHub Models ──────────────────────────────────────────────────────────
  {
    id: "gpt-4o-mini",
    label: "GPT-4o Mini",
    maker: "GitHub Models",
    badge: "GITHUB",
    speed: "fastest",
    ctx: "128k",
    best: "Fast and smart fallback model running via GitHub Models",
  },
  // ── Groq ───────────────────────────────────────────────────────────────────
  {
    id: "llama-3.1-8b-instant",
    label: "Llama 3.1 8B Instant",
    maker: "Groq",
    badge: "GROQ",
    speed: "fastest",
    ctx: "128k",
    best: "Ultra-fast inference via Groq — great for quick Q&A and tool calls",
  },
  // ── Ollama (Local VM) ──────────────────────────────────────────────────────
  {
    id: "qwen2.5:3b-instruct",
    label: "Qwen 2.5 3B",
    maker: "Ollama (Local VM)",
    badge: "LOCAL",
    speed: "fast",
    ctx: "128k",
    best: "Excellent balance of speed & reasoning on local CPU",
  },
  {
    id: "qwen2.5:1.5b-instruct",
    label: "Qwen 2.5 1.5B",
    maker: "Ollama (Local VM)",
    badge: "LOCAL",
    speed: "fast",
    ctx: "128k",
    best: "Smallest footprint, requires prompt cache to be warm",
  },
  {
    id: "qwen2.5:14b-instruct-q4_K_M",
    label: "Qwen 2.5 14B",
    maker: "Ollama (Local VM)",
    badge: "LOCAL",
    speed: "slow",
    ctx: "128k",
    best: "Highest reasoning & agent capability (Slow on CPU)",
  },
] as const;

export type MaddyModel = (typeof MADDY_MODELS)[number];

const DEFAULT_MODEL_ID = "gemini-2.5-flash";

const QUICK_PROMPTS = [
  "What should I focus on today?",
  "Summarise my recent pages.",
  "Show me my upcoming reminders.",
  "Give me a weekly action plan template.",
];

const SPEED_COLOR: Record<string, string> = {
  fastest: "text-emerald-400",
  fast: "text-sky-400",
  medium: "text-amber-400",
  slow: "text-rose-400",
};

const BADGE_COLOR: Record<string, string> = {
  GEMINI: "bg-blue-500/15 text-blue-300",
  FREE: "bg-emerald-500/15 text-emerald-400",
  PRO: "bg-violet-500/15 text-violet-300",
  LOCAL: "bg-sky-500/15 text-sky-300",
  GROQ: "bg-orange-500/15 text-orange-300",
  GITHUB: "bg-teal-500/15 text-teal-300",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type MaddySurfaceMode = "overlay" | "page";

interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  toolsUsed?: string[];
  createdAt: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.max(1, Math.floor(diff / 60_000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatRouteModule(pathname: string) {
  const seg = pathname.split("/")[2] ?? "";
  if (!seg || seg === "overview") return "overview";
  if (seg === "feed") return "feed";
  if (seg === "ledger") return "ledger";
  if (seg === "ai") return "ai";
  return "brain";
}

function getModel(id: string): MaddyModel {
  return MADDY_MODELS.find((m) => m.id === id) ?? MADDY_MODELS[0];
}

async function callAgent(payload: {
  messages: { role: string; content: string }[];
  workspace_id: string;
  user_id: string;
  model: string;
  conversation_id?: string;
  page_id?: string | null;
}): Promise<{
  response: string;
  conversation_id: string;
  tools_used: string[];
  model_used?: string;
}> {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Agent error ${res.status}`);
  return res.json();
}

// ── ModelPicker ───────────────────────────────────────────────────────────────

function ModelPicker({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = getModel(selectedId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full border border-foreground/10 bg-foreground/[0.04] px-3 py-1.5 text-xs text-foreground transition-all hover:border-foreground/18 hover:bg-foreground/[0.07]"
        >
          <Sparkles className="h-3 w-3 text-violet-400" />
          <span className="max-w-[120px] truncate">{active.label}</span>
          <span className={cn(
            "rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide",
            BADGE_COLOR[active.badge]
          )}>
            {active.badge}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[340px] max-w-[calc(100vw-1.5rem)] border-foreground/10 bg-[#18171580] p-2 backdrop-blur-2xl"
        style={{ backdropFilter: "blur(24px)" }}
      >
        <div className="mb-2 px-2 pt-1">
          <p className="text-sm font-semibold text-foreground">Choose an agent model</p>
          <p className="text-[11px] text-muted-foreground">Gemini models use Google AI Studio free tier · Local models run on your VM</p>
        </div>
        <div className="max-h-[360px] space-y-0.5 overflow-y-auto">
          {MADDY_MODELS.map((m) => {
            const isActive = m.id === selectedId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => { onSelect(m.id); setOpen(false); }}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                  isActive
                    ? "bg-foreground/[0.09]"
                    : "hover:bg-foreground/[0.05]"
                )}
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.04]">
                  {isActive && <Check className="h-3 w-3 text-emerald-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{m.label}</span>
                    <span className={cn(
                      "rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wider",
                      BADGE_COLOR[m.badge]
                    )}>
                      {m.badge}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{m.maker}</span>
                    <span>·</span>
                    <span>{m.ctx} ctx</span>
                    <span>·</span>
                    <span className={cn("font-medium", SPEED_COLOR[m.speed])}>{m.speed}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground/70">{m.best}</p>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: AgentMessage }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn("group flex gap-2", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.04]">
          <AppIcon className="h-3.5 w-3.5 rounded-full" />
        </div>
      )}
      <div className="max-w-[85%] space-y-1">
        <div
          className={cn(
            "rounded-[20px] px-4 py-3 text-[13px] leading-[1.65]",
            isUser
              ? "rounded-tr-sm bg-foreground/[0.12] text-foreground"
              : "rounded-tl-sm border border-foreground/8 bg-foreground/[0.04] text-foreground"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:text-foreground prose-headings:font-semibold">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>
        <div className={cn("flex items-center gap-2 px-1", isUser ? "justify-end" : "justify-start")}>
          {!isUser && msg.toolsUsed && msg.toolsUsed.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
              <Zap className="h-2.5 w-2.5" />
              {msg.toolsUsed.join(", ")}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/50 opacity-0 transition-all group-hover:opacity-100 hover:text-muted-foreground"
          >
            {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── TypingIndicator ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2"
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.04]">
        <AppIcon className="h-3.5 w-3.5 rounded-full" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-foreground/8 bg-foreground/[0.04] px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ onPrompt }: { onPrompt: (p: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-5 py-8 text-center">
      <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-[22px] bg-gradient-to-br from-violet-500/20 to-indigo-500/10 blur-lg" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] border border-foreground/12 bg-foreground/[0.05] shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
          <AppIcon className="h-8 w-8 rounded-xl" />
        </div>
      </div>
      <h2 className="text-base font-semibold tracking-tight text-foreground">Maddy AI Agent</h2>
      <p className="mt-2 max-w-[260px] text-[13px] leading-6 text-muted-foreground">
        I can read your pages, reminders, habits, and finances. Powered by Ollama on OCI.
      </p>
      <div className="mt-6 grid w-full gap-2">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPrompt(p)}
            className="rounded-[14px] border border-foreground/8 bg-foreground/[0.025] px-4 py-2.5 text-left text-[13px] text-foreground/80 transition-all hover:border-foreground/14 hover:bg-foreground/[0.05] hover:text-foreground"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── HistoryPanel ──────────────────────────────────────────────────────────────

function HistoryPanel({
  conversations,
  selectedId,
  onSelect,
  onDelete,
}: {
  conversations: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="w-full space-y-0.5">
      {conversations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/8 px-4 py-6 text-center text-[13px] text-muted-foreground/70">
          No conversations yet
        </div>
      ) : (
        conversations.slice(0, 20).map((c: any) => {
          const m = getModel(c.model);
          const isActive = c._id === selectedId;
          return (
            <button
              key={c._id}
              type="button"
              onClick={() => onSelect(c._id)}
              className={cn(
                "group flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition-all",
                isActive ? "bg-foreground/[0.08]" : "hover:bg-foreground/[0.04]"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">{c.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                  {m.label} · {formatRelativeTime(c.updatedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(c._id); }}
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground/50 opacity-0 transition-all hover:bg-foreground/[0.06] hover:text-red-400 group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </button>
          );
        })
      )}
    </div>
  );
}

// ── MaddyPanelSurface (main) ──────────────────────────────────────────────────

function MaddyPanelSurface({
  mode = "overlay",
  onDismiss,
}: {
  mode?: MaddySurfaceMode;
  onDismiss: () => void;
}) {
  const pathname = usePathname();
  const params = useParams();
  const { openrouterApiKey, setOpenrouterApiKey } = useAppStore();
  const { currentWorkspace, resolvedWorkspaceId } = useResolvedWorkspace();

  const pageId = params?.pageId as Id<"pages"> | undefined;
  const isPageMode = mode === "page";

  // ── Local state ────────────────────────────────────────────────────────────
  const [selectedConvId, setSelectedConvId] = useState<Id<"aiConversations"> | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [agentConvId, setAgentConvId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [keyDraft, setKeyDraft] = useState(openrouterApiKey);
  const [keyOpen, setKeyOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // ── Convex queries / mutations ─────────────────────────────────────────────
  const conversations = useQuery(api.aiChat.listConversations) ?? [];
  const convexMessages = useQuery(
    api.aiChat.getMessages,
    selectedConvId ? { conversationId: selectedConvId } : "skip"
  );
  const currentPage = useQuery(api.pages.get, pageId ? { id: pageId } : "skip");

  const createConversation = useMutation(api.aiChat.createConversation);
  const addMessage = useMutation(api.aiChat.addMessage);
  const deleteConversation = useMutation(api.aiChat.deleteConversation);

  useEffect(() => {
    if (!selectedConvId) {
      setMessages((prev) => (prev.length === 0 ? prev : []));
      setAgentConvId((prev) => (prev === null ? prev : null));
      return;
    }
    
    // Fallback safely if undefined
    const messagesToMap = convexMessages || [];
    const mapped: AgentMessage[] = messagesToMap.map((m: any) => ({
      id: m._id,
      role: m.role,
      content: m.content,
      model: m.model,
      createdAt: m.createdAt,
    }));
    
    // Prevent infinite loops by checking if the mapped array is actually different
    setMessages((prev) => {
      if (prev.length === mapped.length && prev.every((m, i) => m.id === mapped[i].id)) {
        return prev;
      }
      return mapped;
    });
  }, [convexMessages, selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onDismiss(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onDismiss]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleNewChat = useCallback(async () => {
    const id = await createConversation({
      model: modelId,
      provider: "ollama",
      contextModule: formatRouteModule(pathname),
      contextPageId: pageId ? String(pageId) : undefined,
    }) as Id<"aiConversations">;
    setSelectedConvId(id);
    setMessages([]);
    setAgentConvId(null);
  }, [createConversation, modelId, pathname, pageId]);

  const handleSelectConv = useCallback((id: string) => {
    setSelectedConvId(id as Id<"aiConversations">);
    setAgentConvId(null);
    setHistoryOpen(false);
  }, []);

  const handleDeleteConv = useCallback((id: string) => {
    void deleteConversation({ id: id as Id<"aiConversations"> }).catch(() =>
      toast.error("Could not delete conversation")
    );
    if (selectedConvId === id) { setSelectedConvId(null); setMessages([]); }
  }, [deleteConversation, selectedConvId]);

  const handleSend = useCallback(async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;

    setLoading(true);
    if (!override) setInput("");

    const userMsg: AgentMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const assistantMsgId = `ai-${Date.now()}`;

    try {
      let convId = selectedConvId;
      if (!convId) {
        convId = await createConversation({
          model: modelId,
          provider: "ollama",
          contextModule: formatRouteModule(pathname),
          contextPageId: pageId ? String(pageId) : undefined,
        }) as Id<"aiConversations">;
        setSelectedConvId(convId);
      }

      // Save user message to Convex
      await addMessage({ conversationId: convId, role: "user", content: text, model: modelId });

      // Add a placeholder assistant message
      const assistantMsg: AgentMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        model: modelId,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev.filter((m) => m.id !== userMsg.id), userMsg, assistantMsg]);

      // Call the agent service with stream: true
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
          workspace_id: resolvedWorkspaceId ?? "",
          user_id: "",
          model: modelId,
          conversation_id: agentConvId ?? undefined,
          page_id: pageId ? String(pageId) : null,
          stream: true,
        }),
      });

      if (!res.ok) throw new Error(`Agent error ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let finalResponse = "";
      let finalToolsUsed: string[] = [];
      let finalModelUsed = modelId;
      let finalConversationId = agentConvId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "token") {
              finalResponse += event.text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: finalResponse } : m
                )
              );
            } else if (event.type === "tool") {
              const tool = event.tool;
              if (tool && !finalToolsUsed.includes(tool)) {
                finalToolsUsed.push(tool);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, toolsUsed: [...finalToolsUsed] } : m
                  )
                );
              }
            } else if (event.type === "done") {
              if (event.response) finalResponse = event.response;
              if (event.tools_used) finalToolsUsed = event.tools_used;
              if (event.model_used) finalModelUsed = event.model_used;
              if (event.conversation_id) finalConversationId = event.conversation_id;
            } else if (event.type === "error") {
              throw new Error(event.detail || "Error streaming response");
            }
          } catch (e) {
            console.error("Failed to parse stream line", e);
          }
        }
      }

      // Save assistant reply to Convex
      const assistantModel = finalModelUsed ?? modelId;
      const assistantContent = finalResponse || "I wasn't able to generate a response. Please try again.";

      await addMessage({
        conversationId: convId,
        role: "assistant",
        content: assistantContent,
        model: assistantModel,
      });

      if (finalConversationId) {
        setAgentConvId(finalConversationId);
      }

      // Finalize the local message state with tools and everything
      const finalMsg: AgentMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: assistantContent,
        model: assistantModel,
        toolsUsed: finalToolsUsed,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev.filter((m) => m.id !== assistantMsgId), finalMsg]);

    } catch (err) {
      console.error("Maddy streaming error:", err);
      toast.error("Maddy could not complete that message");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id && m.id !== assistantMsgId));
      if (!override) setInput(text);
    } finally {
      setLoading(false);
    }
  }, [input, loading, selectedConvId, modelId, agentConvId,
      createConversation, addMessage, pathname, pageId, resolvedWorkspaceId]);

  const contextLine = [
    currentWorkspace?.name,
    pageId ? currentPage?.title : null,
  ].filter(Boolean).join(" / ") || "Workspace";

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at top, #1a1725 0%, #0f0e0d 60%)",
        paddingTop: isPageMode ? "env(safe-area-inset-top)" : undefined,
      }}
    >
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-foreground/[0.06] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {isPageMode && (
              <button
                type="button"
                onClick={onDismiss}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.03] text-muted-foreground transition-all hover:bg-foreground/[0.07] hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
              <div className="absolute inset-0 rounded-[14px] bg-gradient-to-br from-violet-500/30 to-indigo-500/10 blur-md" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-[14px] border border-foreground/12 bg-foreground/[0.06]">
                <AppIcon className="h-5 w-5 rounded-xl" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">Maddy AI</div>
              <div className="truncate text-[11px] text-muted-foreground/70">{contextLine}</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* History */}
            <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.03] text-muted-foreground transition-all hover:bg-foreground/[0.07] hover:text-foreground"
                >
                  <History className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[300px] border-foreground/10 bg-popover p-3">
                <p className="mb-3 px-1 text-sm font-semibold text-foreground">History</p>
                <HistoryPanel
                  conversations={conversations}
                  selectedId={selectedConvId}
                  onSelect={handleSelectConv}
                  onDelete={handleDeleteConv}
                />
              </PopoverContent>
            </Popover>

            {/* New chat */}
            <button
              type="button"
              onClick={() => void handleNewChat()}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.03] text-muted-foreground transition-all hover:bg-foreground/[0.07] hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>

            {!isPageMode && (
              <button
                type="button"
                onClick={onDismiss}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.03] text-muted-foreground transition-all hover:bg-foreground/[0.07] hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !loading ? (
          <EmptyState onPrompt={(p) => void handleSend(p)} />
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {loading && <TypingIndicator />}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div
        className="shrink-0 border-t border-foreground/[0.06] px-4 py-3"
        style={isPageMode ? { paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" } : undefined}
      >
        <div className="rounded-[20px] border border-foreground/[0.08] bg-foreground/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all focus-within:border-foreground/[0.14]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={1}
            placeholder="Ask Maddy about your workspace…"
            className="w-full resize-none bg-transparent text-[13px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/70"
            style={{ minHeight: "40px", maxHeight: "160px" }}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <ModelPicker selectedId={modelId} onSelect={setModelId} />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={loading || !input.trim()}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all",
                loading || !input.trim()
                  ? "cursor-not-allowed bg-foreground/[0.04] text-muted-foreground/70"
                  : "bg-violet-600 text-foreground shadow-[0_8px_24px_rgba(139,92,246,0.35)] hover:bg-violet-500 hover:scale-105"
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Public exports ─────────────────────────────────────────────────────────────

export function MaddyScreen({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="h-full min-h-full overflow-hidden bg-background">
      <MaddyPanelSurface mode="page" onDismiss={onDismiss} />
    </div>
  );
}

export function MaddyPanel() {
  const maddyPanelOpen = useAppStore((s) => s.maddyPanelOpen);
  const closeMaddyPanel = useAppStore((s) => s.closeMaddyPanel);

  return (
    <AnimatePresence initial={false}>
      {maddyPanelOpen ? (
        <>
          <motion.div
            key="maddy-backdrop"
            className="fixed inset-0 z-40 bg-foreground/50 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMaddyPanel}
          />
          <motion.div
            key="maddy-panel"
            className="fixed inset-y-0 right-0 z-50 w-[380px] max-w-full overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ ease: PANEL_EASE, duration: 0.36 }}
          >
            <MaddyPanelSurface mode="overlay" onDismiss={closeMaddyPanel} />
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
