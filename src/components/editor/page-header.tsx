"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { AppIcon } from "@/components/ui/app-icon";
import { ReminderTriggerButton } from "@/components/reminders/reminder-trigger-button";
import { useAppStore } from "@/store/app.store";
import { cn } from "@/lib/utils";
import {
  Smile,
  Maximize2,
  Minimize2,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="w-[350px] h-[420px] rounded-xl border bg-popover animate-pulse" />
  ),
});

interface PageHeaderProps {
  page: any;
  editable?: boolean;
  mobileToolbarOpen?: boolean;
  onMobileToolbarToggle?: () => void;
}

export function PageHeader({
  page,
  editable = true,
  mobileToolbarOpen = false,
  onMobileToolbarToggle,
}: PageHeaderProps) {
  const updatePage = useMutation(api.pages.update);
  const tagPage = useAction(api.maddy.tagPage);
  const { geminiApiKey, maddyEnabled } = useAppStore();

  const [title, setTitle] = useState(page.title);
  const [showEmoji, setShowEmoji] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number }>({ top: 120, left: 80 });
  const [tagging, setTagging] = useState(false);

  const titleAreaRef = useRef<HTMLDivElement>(null);
  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTitle = useRef(page.title);

  // Keep local title in sync when server updates the page (e.g. switching pages)
  useEffect(() => {
    setTitle(page.title);
    latestTitle.current = page.title;
  }, [page._id]); // only reset when navigating to a different page

  // Debounced title save — fires 600 ms after the user stops typing
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!editable) return;
      const value = e.target.value;
      setTitle(value);
      latestTitle.current = value;

      if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
      titleSaveTimer.current = setTimeout(async () => {
        if (latestTitle.current === page.title) return;
        try {
          await updatePage({ id: page._id, title: latestTitle.current });
        } catch {
          toast.error("Failed to save title");
        }
      }, 600);
    },
    [editable, page._id, page.title, updatePage]
  );

  // Flush save immediately on blur (covers Tab-away)
  const handleTitleBlur = useCallback(async () => {
    if (!editable) return;
    if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
    if (latestTitle.current !== page.title) {
      try {
        await updatePage({ id: page._id, title: latestTitle.current });
      } catch {
        toast.error("Failed to save title");
      }
    }
  }, [editable, page._id, page.title, updatePage]);

  const handleFavourite = useCallback(async () => {
    if (!editable) return;
    try {
      await updatePage({ id: page._id, isFavourite: !page.isFavourite });
    } catch {
      toast.error("Failed to update favourite");
    }
  }, [editable, page._id, page.isFavourite, updatePage]);

  const handleFullWidth = useCallback(async () => {
    if (!editable) return;
    try {
      await updatePage({ id: page._id, isFullWidth: !page.isFullWidth });
    } catch {
      toast.error("Failed to update width");
    }
  }, [editable, page._id, page.isFullWidth, updatePage]);

  const handleRemoveCover = useCallback(async () => {
    if (!editable) return;
    await updatePage({ id: page._id, coverImage: null });
  }, [editable, page._id, updatePage]);

  const handleEmojiSelect = useCallback(
    async (emojiData: any) => {
      if (!editable) return;
      setShowEmoji(false);
      try {
        await updatePage({ id: page._id, icon: emojiData.emoji });
      } catch {
        toast.error("Failed to set icon");
      }
    },
    [editable, page._id, updatePage]
  );

  const handleRemoveIcon = useCallback(async () => {
    if (!editable) return;
    await updatePage({ id: page._id, icon: null });
  }, [editable, page._id, updatePage]);

  const openPicker = useCallback(() => {
    if (!editable) return;
    if (titleAreaRef.current) {
      const rect = titleAreaRef.current.getBoundingClientRect();
      setPickerPos({
        top: Math.min(rect.top + 80, window.innerHeight - 450),
        left: Math.max(rect.left, 8),
      });
    }
    setShowEmoji(true);
  }, [editable]);

  const handleAutoTag = useCallback(async () => {
    if (!editable) return;
    if (!geminiApiKey) {
      toast.error("Add your Gemini API key in Settings to use Maddy AI");
      return;
    }
    setTagging(true);
    try {
      const result = await tagPage({ pageId: page._id, geminiApiKey });
      toast.success(
        `Tagged: ${(result as any).tags?.join(", ") || "done"}`
      );
    } catch {
      toast.error("Tagging failed");
    } finally {
      setTagging(false);
    }
  }, [editable, geminiApiKey, page._id, tagPage]);

  // Shared toolbar actions list (reused on desktop hover + mobile menu)
  const toolbarActions = (
    <>
      {editable && !page.icon && (
        <button
          className="flex items-center gap-1.5 px-2.5 py-2 rounded hover:bg-accent/50 transition-colors text-xs whitespace-nowrap"
          onClick={() => { openPicker(); onMobileToolbarToggle?.(); }}
        >
          <Smile className="w-3.5 h-3.5" /> Add icon
        </button>
      )}
      {editable && page.icon && (
        <button
          className="flex items-center gap-1.5 px-2.5 py-2 rounded hover:bg-accent/50 transition-colors text-xs whitespace-nowrap"
          onClick={() => { openPicker(); onMobileToolbarToggle?.(); }}
        >
          <Smile className="w-3.5 h-3.5" /> Change icon
        </button>
      )}
      {editable && page.icon && (
        <button
          className="flex items-center gap-1.5 px-2.5 py-2 rounded hover:bg-accent/50 transition-colors text-xs whitespace-nowrap"
          onClick={() => { handleRemoveIcon(); onMobileToolbarToggle?.(); }}
        >
          <X className="w-3.5 h-3.5" /> Remove icon
        </button>
      )}
      {editable && maddyEnabled && (
        <button
          className="flex items-center gap-1.5 px-2.5 py-2 rounded hover:bg-accent/50 transition-colors text-xs text-foreground whitespace-nowrap"
          onClick={() => { handleAutoTag(); onMobileToolbarToggle?.(); }}
          disabled={tagging}
        >
          <Wand2 className="w-3.5 h-3.5" />
          {tagging ? "Tagging…" : "Auto-tag"}
        </button>
      )}
      <ReminderTriggerButton
        workspaceId={page.workspaceId}
        label="Remind me"
        className="px-2.5 py-2 text-xs"
        initialValues={{
          title: page.title ? `Review ${page.title}` : "Review page",
          pageId: page._id,
          sourceLabel: page.title || "Page",
          sourceUrl: `/workspace/${page._id}`,
        }}
      />
      {editable && (
        <button
          className="flex items-center gap-1.5 px-2.5 py-2 rounded hover:bg-accent/50 transition-colors text-xs whitespace-nowrap"
          onClick={() => { handleFavourite(); onMobileToolbarToggle?.(); }}
        >
          <AppIcon className="w-3.5 h-3.5 rounded-sm" />
          {page.isFavourite ? "Unfavourite" : "Favourite"}
        </button>
      )}
      {editable && (
        <button
          className="flex items-center gap-1.5 px-2.5 py-2 rounded hover:bg-accent/50 transition-colors text-xs whitespace-nowrap"
          onClick={() => { handleFullWidth(); onMobileToolbarToggle?.(); }}
        >
          {page.isFullWidth ? (
            <><Minimize2 className="w-3.5 h-3.5" /> Full width off</>
          ) : (
            <><Maximize2 className="w-3.5 h-3.5" /> Full width</>
          )}
        </button>
      )}
    </>
  );

  return (
    <div
      className={cn(
        "relative",
        page.isFullWidth ? "max-w-none" : "max-w-3xl mx-auto"
      )}
    >
      {/* Cover image — margin matches parent container padding */}
      {page.coverImage && (
        <div className="relative w-full h-36 md:h-48 -mx-4 md:-mx-8 mb-4 overflow-hidden">
          <Image
            src={page.coverImage}
            alt="cover"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          {editable ? (
            <button
              className="absolute top-2 right-2 bg-black/40 text-white text-xs px-2 py-1 rounded hover:bg-black/60 transition"
              onClick={handleRemoveCover}
            >
              Remove cover
            </button>
          ) : null}
        </div>
      )}

      {/* Icon + title area */}
      <div ref={titleAreaRef} className="group relative pt-6 md:pt-8">
        {/* Page icon */}
        {page.icon && (
          <div className="relative inline-block mb-2">
            <span
              className={cn("text-4xl md:text-5xl leading-none", editable && "cursor-pointer")}
              onClick={editable ? openPicker : undefined}
            >
              {page.icon}
            </span>
          </div>
        )}

        {/* Desktop hover toolbar */}
        <div className="hidden group-hover:flex items-center flex-wrap gap-1 mb-2 text-xs text-muted-foreground">
          {toolbarActions}
        </div>

        {/* Mobile expanded toolbar (toggle lives in the top bar) */}
        {mobileToolbarOpen && (
          <div className="flex md:hidden flex-wrap gap-1 mb-3 p-2 rounded-xl border border-border/60 bg-muted/20 text-xs text-muted-foreground animate-fade-in-fast">
            {toolbarActions}
          </div>
        )}

        {/* Title — responsive font size */}
        <input
          value={title}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          readOnly={!editable}
          onKeyDown={(e) => {
            if (!editable) return;
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Untitled"
          className={cn(
            "w-full text-2xl sm:text-3xl md:text-4xl font-bold bg-transparent border-none outline-none",
            "placeholder:text-muted-foreground/40 text-foreground",
            "focus:ring-0 focus:outline-none",
            !editable && "cursor-default"
          )}
        />

        {/* Tags */}
        {page.maddyTags && page.maddyTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {page.maddyTags.map((tag: string) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Emoji picker — fixed positioned to avoid z-index/overflow issues */}
      {showEmoji && (
        <div
          className="fixed z-[9999]"
          style={{ top: pickerPos.top, left: pickerPos.left }}
        >
          <EmojiPicker onEmojiClick={handleEmojiSelect} />
        </div>
      )}

      {/* Backdrop — closes emoji picker when clicking outside */}
      {showEmoji && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setShowEmoji(false)}
        />
      )}
    </div>
  );
}
