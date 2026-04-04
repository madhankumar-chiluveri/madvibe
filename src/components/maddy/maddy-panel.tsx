"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Clock3,
  History,
  Loader2,
  Plus,
  Send,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppIcon } from "@/components/ui/app-icon";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { cn } from "@/lib/utils";
import { useAppStore, type MaddyProvider } from "@/store/app.store";

const PANEL_EASE = [0.22, 1, 0.36, 1] as const;
const MAX_HISTORY_ITEMS = 14;
type MaddySurfaceMode = "overlay" | "page";

type ModelOption = {
  id: string;
  label: string;
  provider: MaddyProvider;
  helper: string;
};

type ProviderKeys = Record<MaddyProvider, string>;

type SettingsDraft = {
  gemini: string;
  openai: string;
  anthropic: string;
  groq: string;
  openrouter: string;
};

const MODEL_OPTIONS: ModelOption[] = [
  { id: "gemini-1.5-flash-latest", label: "Gemini Flash", provider: "gemini", helper: "Fast workspace replies" },
  { id: "gemini-1.5-pro-latest", label: "Gemini Pro", provider: "gemini", helper: "Longer, more deliberate output" },
  { id: "gpt-4o-mini", label: "GPT-4o mini", provider: "openai", helper: "Compact OpenAI chat" },
  { id: "gpt-4.1", label: "GPT-4.1", provider: "openai", helper: "Stronger OpenAI reasoning" },
  { id: "claude-3-5-haiku-latest", label: "Claude Haiku", provider: "anthropic", helper: "Fast Claude replies" },
  { id: "claude-3-5-sonnet-latest", label: "Claude Sonnet", provider: "anthropic", helper: "Better long-form writing" },
  { id: "llama-3.1-8b-instant", label: "Llama Instant", provider: "groq", helper: "Low-latency Groq model" },
  { id: "llama-3.1-70b-versatile", label: "Llama 70B", provider: "groq", helper: "Broader Groq reasoning" },
  { id: "openai/gpt-4o-mini", label: "OpenRouter GPT-4o mini", provider: "openrouter", helper: "OpenRouter bridge" },
  { id: "anthropic/claude-3.5-sonnet", label: "OpenRouter Claude", provider: "openrouter", helper: "Claude through OpenRouter" },
];

const QUICK_PROMPTS = [
  "What should I focus on next?",
  "Turn my notes into a short action plan.",
  "Draft a crisp weekly review.",
];

const KEY_FIELDS: Array<{
  id: keyof SettingsDraft;
  label: string;
  placeholder: string;
}> = [
  { id: "gemini", label: "Gemini", placeholder: "Google AI key" },
  { id: "openai", label: "OpenAI", placeholder: "OpenAI API key" },
  { id: "anthropic", label: "Anthropic", placeholder: "Anthropic API key" },
  { id: "groq", label: "Groq", placeholder: "Groq API key" },
  { id: "openrouter", label: "OpenRouter", placeholder: "OpenRouter API key" },
];

function formatRouteModule(pathname: string) {
  const segment = pathname.split("/")[2] ?? "";
  if (!segment || segment === "overview") return "overview";
  if (segment === "feed") return "feed";
  if (segment === "ledger") return "ledger";
  if (segment === "settings") return "settings";
  if (segment === "ai") return "ai";
  return "brain";
}

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.max(1, Math.floor(diff / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function providerLabel(provider: MaddyProvider) {
  if (provider === "gemini") return "Gemini";
  if (provider === "openai") return "OpenAI";
  if (provider === "anthropic") return "Anthropic";
  if (provider === "groq") return "Groq";
  return "OpenRouter";
}

function getModelOption(modelId: string, provider?: string | null) {
  return (
    MODEL_OPTIONS.find(
      (option) =>
        option.id === modelId && (!provider || option.provider === provider)
    ) ?? MODEL_OPTIONS[0]
  );
}

function getProviderKey(provider: MaddyProvider, keys: ProviderKeys) {
  return keys[provider]?.trim() ?? "";
}

function buildSettingsDraft(keys: ProviderKeys): SettingsDraft {
  return {
    gemini: keys.gemini,
    openai: keys.openai,
    anthropic: keys.anthropic,
    groq: keys.groq,
    openrouter: keys.openrouter,
  };
}

function getDraftCount(draft: SettingsDraft) {
  return Object.values(draft).filter((value) => value.trim().length > 0).length;
}

function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-[22px] px-3.5 py-3 text-[13px] leading-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
          isUser
            ? "rounded-tr-md bg-[linear-gradient(180deg,rgba(255,255,255,0.17),rgba(255,255,255,0.08))] text-white"
            : "rounded-tl-md border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] text-zinc-100"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  );
}

function EmptyState({
  pageTitle,
  onPrompt,
}: {
  pageTitle?: string;
  onPrompt: (prompt: string) => void;
}) {
  const prompts = pageTitle
    ? [
        `Summarise "${pageTitle}" for me.`,
        `Pull action items from "${pageTitle}".`,
        QUICK_PROMPTS[0],
        QUICK_PROMPTS[1],
      ]
    : QUICK_PROMPTS;

  return (
    <div className="flex h-full flex-col items-center justify-center px-5 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_62%)] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
        <AppIcon className="h-7 w-7 rounded-xl" />
      </div>
      <h2 className="mt-4 text-base font-semibold tracking-[-0.02em] text-white">
        Global workspace chat
      </h2>
      <p className="mt-2 max-w-[280px] text-sm leading-6 text-zinc-500">
        Ask, plan, rewrite, or use the current page as context without switching modes.
      </p>
      <div className="mt-5 grid w-full gap-2">
        {prompts.slice(0, 4).map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPrompt(prompt)}
            className="rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-3 text-left text-sm text-zinc-200 transition-all hover:border-white/12 hover:bg-white/[0.05]"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function MaddyPanelSurface({
  mode = "overlay",
  onDismiss,
}: {
  mode?: MaddySurfaceMode;
  onDismiss: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const {
    geminiApiKey,
    openaiApiKey,
    anthropicApiKey,
    groqApiKey,
    openrouterApiKey,
    setGeminiApiKey,
    setOpenaiApiKey,
    setAnthropicApiKey,
    setGroqApiKey,
    setOpenrouterApiKey,
    maddyDefaultModel,
    maddyDefaultProvider,
    setMaddyDefaultModel,
    setMaddyDefaultProvider,
  } = useAppStore();
  const { currentWorkspace, resolvedWorkspaceId } = useResolvedWorkspace();

  const pageId = params?.pageId as Id<"pages"> | undefined;
  const currentModule = formatRouteModule(pathname);
  const isPageMode = mode === "page";

  const [selectedConversationId, setSelectedConversationId] =
    useState<Id<"aiConversations"> | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(
    getModelOption(maddyDefaultModel, maddyDefaultProvider).id
  );
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>({
    gemini: geminiApiKey,
    openai: openaiApiKey,
    anthropic: anthropicApiKey,
    groq: groqApiKey,
    openrouter: openrouterApiKey,
  });

  const conversations = useQuery(api.aiChat.listConversations) ?? [];
  const messages =
    useQuery(
      api.aiChat.getMessages,
      selectedConversationId ? { conversationId: selectedConversationId } : "skip"
    ) ?? [];
  const currentPage = useQuery(api.pages.get, pageId ? { id: pageId } : "skip");

  const createConversation = useMutation(api.aiChat.createConversation);
  const addMessage = useMutation(api.aiChat.addMessage);
  const deleteConversation = useMutation(api.aiChat.deleteConversation);
  const updateConversationConfig = useMutation(api.aiChat.updateConversationConfig);
  const chatWithMaddy = useAction(api.maddy.chatWithMaddy);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const providerKeys = useMemo<ProviderKeys>(
    () => ({
      gemini: geminiApiKey,
      openai: openaiApiKey,
      anthropic: anthropicApiKey,
      groq: groqApiKey,
      openrouter: openrouterApiKey,
    }),
    [anthropicApiKey, geminiApiKey, groqApiKey, openaiApiKey, openrouterApiKey]
  );

  const activeModel = useMemo(() => getModelOption(selectedModelId), [selectedModelId]);
  const activeApiKey = getProviderKey(activeModel.provider, providerKeys);
  const recentConversations = useMemo(
    () => conversations.slice(0, MAX_HISTORY_ITEMS),
    [conversations]
  );
  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation: any) => conversation._id === selectedConversationId
      ) ?? null,
    [conversations, selectedConversationId]
  );
  const contextLine = [
    currentWorkspace?.name || "No workspace",
    currentModule.toUpperCase(),
    pageId ? currentPage?.title || "Current page" : null,
  ]
    .filter(Boolean)
    .join(" / ");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [loading, messages]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  useEffect(() => {
    if (selectedConversationId) {
      const stillExists = conversations.some(
        (conversation: any) => conversation._id === selectedConversationId
      );
      if (!stillExists) setSelectedConversationId(conversations[0]?._id ?? null);
      return;
    }
    if (conversations.length > 0) setSelectedConversationId(conversations[0]._id);
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversation) {
      setSelectedModelId(getModelOption(maddyDefaultModel, maddyDefaultProvider).id);
      return;
    }
    setSelectedModelId(
      getModelOption(selectedConversation.model, selectedConversation.provider).id
    );
  }, [
    maddyDefaultModel,
    maddyDefaultProvider,
    selectedConversation?._id,
    selectedConversation?.model,
    selectedConversation?.provider,
  ]);

  useEffect(() => {
    if (settingsOpen) setSettingsDraft(buildSettingsDraft(providerKeys));
  }, [providerKeys, settingsOpen]);

  const createThread = async (model: ModelOption) => {
    const newId = (await createConversation({
      model: model.id,
      provider: model.provider,
      contextModule: currentModule,
      contextPageId: pageId ? String(pageId) : undefined,
    })) as Id<"aiConversations">;
    setSelectedConversationId(newId);
    return newId;
  };

  const handleModelChange = (value: string) => {
    const nextModel = getModelOption(value);
    setSelectedModelId(nextModel.id);
    setMaddyDefaultProvider(nextModel.provider);
    setMaddyDefaultModel(nextModel.id);
  };

  const handleSaveSettings = () => {
    setGeminiApiKey(settingsDraft.gemini.trim());
    setOpenaiApiKey(settingsDraft.openai.trim());
    setAnthropicApiKey(settingsDraft.anthropic.trim());
    setGroqApiKey(settingsDraft.groq.trim());
    setOpenrouterApiKey(settingsDraft.openrouter.trim());
    setSettingsOpen(false);
    toast.success("Maddy settings saved");
  };

  const handleSend = async (overridePrompt?: string) => {
    const prompt = (overridePrompt ?? input).trim();
    if (!prompt || loading) return;
    if (!activeApiKey) {
      toast.error(`Add your ${providerLabel(activeModel.provider)} API key in Maddy settings`);
      return;
    }

    setLoading(true);
    if (!overridePrompt) setInput("");

    try {
      const conversationId = selectedConversationId ?? (await createThread(activeModel));

      if (
        selectedConversation &&
        (selectedConversation.model !== activeModel.id ||
          selectedConversation.provider !== activeModel.provider)
      ) {
        await updateConversationConfig({
          id: selectedConversation._id,
          model: activeModel.id,
          provider: activeModel.provider,
          contextModule: currentModule,
          contextPageId: pageId ? String(pageId) : undefined,
        });
      }

      const history = messages
        .filter((message: any) => message.role === "user" || message.role === "assistant")
        .slice(-8)
        .map((message: any) => ({
          role: message.role as "user" | "assistant",
          content: message.content,
        }));

      await addMessage({
        conversationId,
        role: "user",
        content: prompt,
        model: activeModel.id,
      });

      const response = await chatWithMaddy({
        prompt,
        apiKey: activeApiKey,
        provider: activeModel.provider,
        model: activeModel.id,
        workspaceId: resolvedWorkspaceId ?? undefined,
        pageId,
        history,
      });

      await addMessage({
        conversationId,
        role: "assistant",
        content: response || "I could not generate a useful reply just now.",
        model: activeModel.id,
      });

      setSelectedConversationId(conversationId);
    } catch {
      toast.error("Maddy could not complete that message");
      if (!overridePrompt) setInput(prompt);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSettings = () => {
    setSettingsOpen(false);
    if (!isPageMode) {
      onDismiss();
    }
    router.push("/workspace/settings");
  };

  return (
    <div
      className="flex h-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),rgba(255,255,255,0.015)_36%),linear-gradient(180deg,#131211_0%,#0f0e0d_100%)] text-zinc-100"
      style={isPageMode ? { paddingTop: "env(safe-area-inset-top)" } : undefined}
    >
      <div className="border-b border-white/8 px-3.5 pb-3 pt-3.5 shadow-[inset_0_-1px_0_rgba(255,255,255,0.03)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2.5">
            {isPageMode ? (
              <button
                type="button"
                aria-label="Back"
                onClick={onDismiss}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-300 transition-all hover:border-white/16 hover:bg-white/[0.06] hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.13),rgba(255,255,255,0.03)_62%)] shadow-[0_14px_28px_rgba(0,0,0,0.22)]">
              <AppIcon className="h-5 w-5 rounded-xl" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-[-0.02em] text-white">Maddy AI</div>
              <div className="truncate text-[11px] text-zinc-500">{contextLine}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Open chat history"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-300 transition-all hover:border-white/16 hover:bg-white/[0.06] hover:text-white"
                >
                  <History className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-80 max-w-[calc(100vw-1rem)] border-white/10 bg-[#181715] p-2.5"
              >
                <div className="mb-2 px-1">
                  <div className="text-sm font-semibold text-white">History</div>
                  <div className="text-[11px] text-zinc-500">Recent chats across your workspace</div>
                </div>

                {recentConversations.length > 0 ? (
                  <div className="max-h-[360px] space-y-1 overflow-y-auto">
                    {recentConversations.map((conversation: any) => {
                      const conversationModel = getModelOption(
                        conversation.model,
                        conversation.provider
                      );
                      const isActive = conversation._id === selectedConversationId;

                      return (
                        <button
                          key={conversation._id}
                          type="button"
                          onClick={() => setSelectedConversationId(conversation._id)}
                          className={cn(
                            "group flex w-full items-start gap-2 rounded-2xl border px-3 py-2.5 text-left transition-all",
                            isActive
                              ? "border-white/14 bg-white/[0.07]"
                              : "border-white/6 bg-white/[0.025] hover:border-white/10 hover:bg-white/[0.05]"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-white">
                              {conversation.title}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                              <span>{conversationModel.label}</span>
                              <span className="h-1 w-1 rounded-full bg-zinc-700" />
                              <span>{formatRelativeTime(conversation.updatedAt)}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            aria-label="Delete conversation"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-500 opacity-0 transition-all hover:bg-white/[0.06] hover:text-red-200 group-hover:opacity-100"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void deleteConversation({ id: conversation._id }).catch(() => {
                                toast.error("Could not delete that chat");
                              });
                              if (selectedConversationId === conversation._id) {
                                setSelectedConversationId(null);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-3 py-5 text-center text-sm text-zinc-500">
                    No chat history yet
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Open Maddy settings"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-300 transition-all hover:border-white/16 hover:bg-white/[0.06] hover:text-white"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-[22.5rem] max-w-[calc(100vw-1rem)] border-white/10 bg-[#181715] p-3"
              >
                <div className="mb-3">
                  <div className="text-sm font-semibold text-white">Model access</div>
                  <div className="mt-1 text-[11px] leading-5 text-zinc-500">
                    Bring your own provider keys. They stay in local app storage on this device.
                  </div>
                </div>

                <div className="space-y-3">
                  {KEY_FIELDS.map((field) => (
                    <div key={field.id}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-[11px] font-medium text-zinc-300">
                          {field.label}
                        </label>
                        {settingsDraft[field.id].trim() ? (
                          <span className="text-[10px] text-emerald-300">Configured</span>
                        ) : null}
                      </div>
                      <Input
                        type="password"
                        value={settingsDraft[field.id]}
                        onChange={(event) =>
                          setSettingsDraft((draft) => ({
                            ...draft,
                            [field.id]: event.target.value,
                          }))
                        }
                        placeholder={field.placeholder}
                        className="h-9 rounded-xl border-white/10 bg-white/[0.03] text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-white/15"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>{getDraftCount(settingsDraft)} providers configured</span>
                  <button
                    type="button"
                    className="text-zinc-300 transition-colors hover:text-white"
                    onClick={handleOpenSettings}
                  >
                    Open settings
                  </button>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    className="rounded-xl px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
                  >
                    Save
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            <button
              type="button"
              aria-label="Start a new chat"
              onClick={() => {
                void createThread(activeModel).catch(() => {
                  toast.error("Could not create a new chat");
                });
                setInput("");
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-300 transition-all hover:border-white/16 hover:bg-white/[0.06] hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>

            {!isPageMode ? (
              <button
                type="button"
                aria-label="Close Maddy AI"
                onClick={onDismiss}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-300 transition-all hover:border-white/16 hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {!activeApiKey ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-amber-400/14 bg-amber-400/[0.08] px-3 py-2 text-[11px] leading-5 text-amber-100">
            <CircleAlert className="h-3.5 w-3.5 shrink-0" />
            Add your {providerLabel(activeModel.provider)} API key to use {activeModel.label}.
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500">
            <Check className="h-3.5 w-3.5 text-emerald-300" />
            {providerLabel(activeModel.provider)} is ready
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5">
        {messages.length === 0 && !loading ? (
          <EmptyState
            pageTitle={pageId ? currentPage?.title || "Current page" : undefined}
            onPrompt={(prompt) => void handleSend(prompt)}
          />
        ) : (
          <div className="space-y-3">
            {messages.map((message: any) => (
              <MessageBubble key={message._id} message={message} />
            ))}

            {loading ? (
              <div className="flex items-center gap-2 px-1 text-xs text-zinc-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Maddy is thinking...
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div
        className="border-t border-white/8 px-3.5 py-3.5"
        style={
          isPageMode
            ? { paddingBottom: "calc(env(safe-area-inset-bottom) + 0.875rem)" }
            : undefined
        }
      >
        <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            rows={1}
            placeholder="Ask Maddy about your workspace..."
            className="min-h-[62px] w-full resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-zinc-500"
          />

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={selectedModelId} onValueChange={handleModelChange}>
                <SelectTrigger className="h-8 w-full rounded-full border-white/10 bg-white/[0.04] px-3 text-xs text-zinc-200 shadow-none focus:ring-0 sm:w-[188px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#1a1917] text-zinc-100">
                  {MODEL_OPTIONS.map((option) => {
                    const hasKey = Boolean(getProviderKey(option.provider, providerKeys));
                    return (
                      <SelectItem
                        key={`${option.provider}:${option.id}`}
                        value={option.id}
                        className="rounded-xl py-2.5"
                      >
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-[11px] text-zinc-500">
                            {providerLabel(option.provider)} - {hasKey ? option.helper : "Add key in settings"}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <div className="hidden items-center gap-1.5 text-[11px] text-zinc-500 sm:flex">
                <Clock3 className="h-3.5 w-3.5" />
                Enter to send
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={loading || !input.trim() || !activeApiKey}
              className={cn(
                "flex h-10 w-10 self-end items-center justify-center rounded-full transition-all sm:h-9 sm:w-9 sm:self-auto",
                loading || !input.trim() || !activeApiKey
                  ? "cursor-not-allowed bg-white/[0.05] text-zinc-600"
                  : "bg-white text-black shadow-[0_16px_34px_rgba(255,255,255,0.12)] hover:scale-[1.02]"
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MaddyScreen({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="h-full min-h-full overflow-hidden bg-[#12110f]">
      <MaddyPanelSurface mode="page" onDismiss={onDismiss} />
    </div>
  );
}

export function MaddyPanel() {
  const maddyPanelOpen = useAppStore((state) => state.maddyPanelOpen);
  const closeMaddyPanel = useAppStore((state) => state.closeMaddyPanel);

  return (
    <AnimatePresence initial={false}>
      {maddyPanelOpen ? (
        <>
          <motion.div
            key="maddy-backdrop"
            className="fixed inset-0 z-40 bg-black/44 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: PANEL_EASE }}
            onClick={closeMaddyPanel}
          />

          <motion.div
            key="maddy-overlay-shell"
            className="pointer-events-none fixed inset-0 z-50 flex justify-end p-2 sm:p-3"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1 }}
          >
            <motion.aside
              className="pointer-events-auto h-full w-full max-w-[420px] overflow-hidden rounded-[28px] border border-white/10 bg-[#12110f] shadow-[0_30px_90px_rgba(0,0,0,0.5)]"
              initial={{ x: "110%", opacity: 0.92 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "110%", opacity: 0.92 }}
              transition={{ duration: 0.34, ease: PANEL_EASE }}
            >
              <MaddyPanelSurface mode="overlay" onDismiss={closeMaddyPanel} />
            </motion.aside>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

