"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store/app.store";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/app-icon";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  X,
  Loader2,
  Wand2,
  Search,
  Tags,
  FileText,
  AlignLeft,
  ListTodo,
  ArrowRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { Id } from "../../../convex/_generated/dataModel";

interface MaddyPanelProps {
  open: boolean;
  onClose: () => void;
}

type Tab = "chat" | "search" | "page";

export function MaddyPanel({ open, onClose }: MaddyPanelProps) {
  const { geminiApiKey, maddyEnabled, currentWorkspaceId } = useAppStore();
  const params = useParams();
  const pageId = params?.pageId as Id<"pages"> | undefined;

  const [tab, setTab] = useState<Tab>("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  // Actions
  const inlineCommand = useAction(api.maddy.inlineCommand);
  const semanticSearch = useAction(api.maddy.semanticSearch);
  const summarise = useAction(api.maddy.summarisePage);
  const extractTasks = useAction(api.maddy.extractTasks);
  const tagPage = useAction(api.maddy.tagPage);

  const currentPage = useQuery(
    api.pages.get,
    pageId ? { id: pageId } : "skip"
  );

  if (!open) return null;

  const needsKey = !geminiApiKey;

  const runChat = async () => {
    if (!input.trim() || !geminiApiKey) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const result = await inlineCommand({
        command: "explain",
        text: userMsg,
        geminiApiKey,
      });
      setMessages((m) => [
        ...m,
        { role: "assistant", content: result as string },
      ]);
    } catch {
      toast.error("Maddy failed to respond");
    } finally {
      setLoading(false);
    }
  };

  const runSearch = async () => {
    if (!input.trim() || !geminiApiKey || !currentWorkspaceId) return;
    const query = input.trim();
    setInput("");
    setLoading(true);
    try {
      const results = (await semanticSearch({
        query,
        workspaceId: currentWorkspaceId,
        geminiApiKey,
      })) as any[];
      const content =
        results.length === 0
          ? "No relevant pages found."
          : `Found ${results.length} related pages:\n${results
              .map((p) => `• ${p.icon ?? "📄"} **${p.title}**`)
              .join("\n")}`;
      setMessages((m) => [
        ...m,
        { role: "user", content: `Search: "${query}"` },
        { role: "assistant", content },
      ]);
    } catch {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const runPageAction = async (action: "summarise" | "tasks" | "tag") => {
    if (!pageId || !geminiApiKey) {
      toast.error("No page open or API key missing");
      return;
    }
    setLoading(true);
    try {
      if (action === "summarise") {
        const result = await summarise({ pageId, geminiApiKey });
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `**Summary of "${currentPage?.title}"**\n\n${result}` },
        ]);
      } else if (action === "tasks") {
        const tasks = (await extractTasks({ pageId, geminiApiKey })) as string[];
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              `**Tasks from "${currentPage?.title}"**\n\n` +
              (tasks.length === 0
                ? "No tasks found."
                : tasks.map((t, i) => `${i + 1}. ${t}`).join("\n")),
          },
        ]);
      } else {
        const result = (await tagPage({ pageId, geminiApiKey })) as any;
        toast.success(`Tags applied: ${result?.tags?.join(", ")}`);
      }
    } catch {
      toast.error(`Action failed`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-background border-l shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <img src="/app-icon.png" alt="MADVERSE" className="w-7 h-7 rounded-lg" />
          <span className="font-semibold text-sm">Maddy AI</span>
        </div>
        <button
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent"
          onClick={onClose}
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 py-2 border-b">
        {(["chat", "search", "page"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 text-xs py-1.5 rounded-md capitalize transition-colors",
              tab === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent/50"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* API key warning */}
      {needsKey && (
        <div className="mx-3 mt-3 flex items-start gap-2 p-3 rounded-lg bg-muted text-foreground text-xs">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <p>
            Add your Gemini API key in{" "}
            <strong>Settings → Maddy AI</strong> to enable AI features.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {tab === "page" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-2">
              Actions for{" "}
              <strong>
                {currentPage?.title || "current page"}
              </strong>
            </p>
            <QuickAction
              icon={<AlignLeft className="w-4 h-4" />}
              label="Summarise page"
              onClick={() => runPageAction("summarise")}
              disabled={loading || needsKey || !pageId}
            />
            <QuickAction
              icon={<ListTodo className="w-4 h-4" />}
              label="Extract tasks"
              onClick={() => runPageAction("tasks")}
              disabled={loading || needsKey || !pageId}
            />
            <QuickAction
              icon={<Tags className="w-4 h-4" />}
              label="Auto-tag page"
              onClick={() => runPageAction("tag")}
              disabled={loading || needsKey || !pageId}
            />
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "text-sm rounded-lg px-3 py-2 max-w-full",
              msg.role === "user"
                ? "bg-primary/10 text-foreground ml-4"
                : "bg-muted text-foreground"
            )}
          >
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
              {msg.content}
            </pre>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            Maddy is thinking…
          </div>
        )}

        {messages.length === 0 && tab !== "page" && !loading && (
          <div className="text-center py-8">
            <AppIcon className="w-8 h-8 rounded-xl mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {tab === "chat"
                ? "Ask Maddy anything about your notes"
                : "Search across your knowledge base"}
            </p>
          </div>
        )}
      </div>

      {/* Input */}
      {tab !== "page" && (
        <div className="border-t px-3 py-3">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  tab === "search" ? runSearch() : runChat();
                }
              }}
              placeholder={
                tab === "search"
                  ? "Search your knowledge base…"
                  : "Ask Maddy anything…"
              }
              className="flex-1 min-h-[60px] max-h-[120px] text-sm resize-none"
              disabled={needsKey}
            />
            <Button
              size="icon"
              className="self-end shrink-0 bg-foreground text-background hover:opacity-90"
              onClick={tab === "search" ? runSearch : runChat}
              disabled={loading || needsKey || !input.trim()}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inline panel (for future use within editor) ───────────────────────────────
export function MaddyInlinePanel() {
  return null;
}

// ── Quick action button ──────────────────────────────────────────────────────
function QuickAction({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors",
        "border border-border hover:bg-accent/50 hover:border-primary/50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="text-foreground">{icon}</span>
      {label}
    </button>
  );
}
