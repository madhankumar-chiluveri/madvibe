"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Sparkles, Plus, Send, ChevronDown,
  Trash2, MessageSquare, Brain, Code, BarChart2,
  Menu, X,
} from "lucide-react";

// ── Model config ──────────────────────────────────────────────────────────────
const MODELS = [
  { id: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash", provider: "openrouter", tag: "Free" },
  { id: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B", provider: "openrouter", tag: "Free" },
  { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B", provider: "openrouter", tag: "Free" },
  { id: "qwen/qwen-2-7b-instruct:free", label: "Qwen 2 7B", provider: "openrouter", tag: "Free" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", provider: "openrouter", tag: "Paid" },
  { id: "openai/gpt-4o", label: "GPT-4o", provider: "openrouter", tag: "Paid" },
] as const;

const AGENT_MODES = [
  { id: "general", label: "General", icon: Sparkles },
  { id: "research", label: "Research", icon: Brain },
  { id: "code", label: "Code", icon: Code },
  { id: "finance", label: "Finance", icon: BarChart2 },
] as const;

// ── Chat message bubble ───────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: any }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 mt-1">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className={cn(
        "max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-card border rounded-tl-sm"
      )}>
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        {msg.tokensOutput && (
          <p className="text-xs opacity-50 mt-1">{msg.tokensOutput} tokens</p>
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1 text-xs font-bold text-muted-foreground">
          M
        </div>
      )}
    </div>
  );
}

// ── Conversation List Item ─────────────────────────────────────────────────────
function ConvItem({
  conv, selected, onSelect, onDelete,
}: {
  conv: any; selected: boolean; onSelect: () => void; onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors",
        selected ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground"
      )}
      onClick={onSelect}
    >
      <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{conv.title}</p>
        <p className="text-xs text-muted-foreground">{conv.model?.split("/").pop()?.replace(":free", "") ?? "—"}</p>
      </div>
      <button
        className="hidden group-hover:flex w-6 h-6 items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Main AI Page ──────────────────────────────────────────────────────────────
export default function AIPage() {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(MODELS[0].id);
  const [agentMode, setAgentMode] = useState<string>("general");
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const conversations = useQuery(api.aiChat.listConversations);
  const messages = useQuery(
    api.aiChat.getMessages,
    selectedConvId ? { conversationId: selectedConvId as any } : "skip"
  );
  const createConv = useMutation(api.aiChat.createConversation);
  const addMessage = useMutation(api.aiChat.addMessage);
  const deleteConv = useMutation(api.aiChat.deleteConversation);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const text = input.trim();
    setInput("");
    setIsStreaming(true);

    try {
      let convId = selectedConvId;
      if (!convId) {
        const model = MODELS.find((m) => m.id === selectedModel)!;
        convId = await createConv({
          model: selectedModel,
          provider: model.provider,
          contextModule: agentMode !== "general" ? agentMode : undefined,
        }) as string;
        setSelectedConvId(convId);
      }

      // Add user message
      await addMessage({
        conversationId: convId as any,
        role: "user",
        content: text,
      });

      // Add placeholder assistant message
      await addMessage({
        conversationId: convId as any,
        role: "assistant",
        content: "Thinking… (connect your OpenRouter API key in Settings to enable real responses)",
        model: selectedModel,
        tokensOutput: 0,
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const selectedModelInfo = MODELS.find((m) => m.id === selectedModel)!;

  return (
    <div className="h-full flex bg-background">
      {/* ── Conversation sidebar (desktop left panel / mobile drawer) ─────── */}
      <>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className={cn(
          "fixed md:relative z-50 md:z-auto inset-y-0 left-0 flex flex-col",
          "w-64 border-r bg-sidebar transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
          <div className="flex items-center justify-between px-3 py-3 border-b shrink-0">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" /> Maddy AI
            </span>
            <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-2 pt-2 shrink-0">
            <button
              onClick={async () => {
                const model = MODELS.find((m) => m.id === selectedModel)!;
                const id = await createConv({ model: selectedModel, provider: model.provider });
                setSelectedConvId(id as string);
                setSidebarOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors min-h-[44px]"
            >
              <Plus className="w-4 h-4" /> New conversation
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
            {conversations?.map((c: any) => (
              <ConvItem
                key={c._id}
                conv={c}
                selected={c._id === selectedConvId}
                onSelect={() => { setSelectedConvId(c._id); setSidebarOpen(false); }}
                onDelete={() => deleteConv({ id: c._id })}
              />
            ))}
            {!conversations?.length && (
              <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>
            )}
          </div>
        </div>
      </>

      {/* ── Main chat area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur shrink-0">
          {/* Mobile sidebar toggle */}
          <button
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted min-h-[44px]"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Model selector */}
          <div className="relative">
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm hover:bg-muted transition-colors min-h-[36px]"
              onClick={() => setModelOpen(!modelOpen)}
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              <span className="font-medium max-w-[120px] md:max-w-none truncate">
                {selectedModelInfo.label}
              </span>
              <span className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                selectedModelInfo.tag === "Free"
                  ? "bg-emerald-500/20 text-emerald-600"
                  : "bg-amber-500/20 text-amber-600"
              )}>
                {selectedModelInfo.tag}
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            {modelOpen && (
              <div className="absolute top-full left-0 mt-1 z-30 w-72 bg-popover border rounded-xl shadow-lg overflow-hidden">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left min-h-[44px]",
                      selectedModel === m.id && "bg-primary/10 text-primary"
                    )}
                    onClick={() => { setSelectedModel(m.id as string); setModelOpen(false); }}
                  >
                    <span className="font-medium">{m.label}</span>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      m.tag === "Free" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                       : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                    )}>
                      {m.tag}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Agent mode pills */}
          <div className="hidden sm:flex gap-1 ml-auto">
            {AGENT_MODES.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                    agentMode === mode.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                  onClick={() => setAgentMode(mode.id)}
                >
                  <Icon className="w-3 h-3" />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {!selectedConvId ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Maddy AI</h2>
                <p className="text-sm text-muted-foreground mt-1">Your multi-model AI assistant. Start a new conversation or pick one from the sidebar.</p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full">
                {[
                  "Summarise my project status from KB",
                  "Analyse my spending this month",
                  "Find free AI tools for video editing",
                  "Write a daily planning template",
                ].map((q) => (
                  <button
                    key={q}
                    className="text-left px-4 py-3 rounded-xl border hover:bg-muted transition-colors text-sm min-h-[44px]"
                    onClick={() => setInput(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages?.map((msg: any) => (
                <MessageBubble key={msg._id} msg={msg} />
              ))}
              {isStreaming && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-card border rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className="px-4 py-3 border-t bg-background/95 shrink-0"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 bg-muted/40 border rounded-2xl focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/40 transition-all p-3">
              <textarea
                ref={textareaRef}
                className="flex-1 bg-transparent text-sm outline-none resize-none leading-relaxed placeholder:text-muted-foreground max-h-40"
                placeholder="Ask Maddy anything… (Shift+Enter for new line)"
                value={input}
                rows={1}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0",
                  input.trim() && !isStreaming
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              {selectedModelInfo.label} · {agentMode} mode · AI can make mistakes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
