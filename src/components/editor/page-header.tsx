"use client";

import { useState, useRef } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppIcon } from "@/components/ui/app-icon";
import { useAppStore } from "@/store/app.store";
import { cn } from "@/lib/utils";
import {
  MoreHorizontal,
  Smile,
  Maximize2,
  Minimize2,
  Wand2,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import EmojiPicker from "emoji-picker-react";

interface PageHeaderProps {
  page: any;
}

export function PageHeader({ page }: PageHeaderProps) {
  const updatePage = useMutation(api.pages.update);
  const tagPage = useAction(api.maddy.tagPage);
  const { geminiApiKey, maddyEnabled } = useAppStore();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(page.title);
  const [showEmoji, setShowEmoji] = useState(false);
  const [tagging, setTagging] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const handleTitleSave = async () => {
    setEditing(false);
    if (title !== page.title) {
      try {
        await updatePage({ id: page._id, title });
      } catch {
        toast.error("Failed to update title");
        setTitle(page.title);
      }
    }
  };

  const handleFavourite = async () => {
    try {
      await updatePage({ id: page._id, isFavourite: !page.isFavourite });
    } catch {
      toast.error("Failed to update favourite");
    }
  };

  const handleFullWidth = async () => {
    try {
      await updatePage({ id: page._id, isFullWidth: !page.isFullWidth });
    } catch {
      toast.error("Failed to update width");
    }
  };

  const handleRemoveCover = async () => {
    await updatePage({ id: page._id, coverImage: null });
  };

  const handleEmojiSelect = async (emojiData: any) => {
    setShowEmoji(false);
    try {
      await updatePage({ id: page._id, icon: emojiData.emoji });
    } catch {
      toast.error("Failed to set icon");
    }
  };

  const handleRemoveIcon = async () => {
    await updatePage({ id: page._id, icon: null });
  };

  const handleAutoTag = async () => {
    if (!geminiApiKey) {
      toast.error("Add your Gemini API key in Settings to use Maddy AI");
      return;
    }
    setTagging(true);
    try {
      const result = await tagPage({ pageId: page._id, geminiApiKey });
      toast.success(`Tagged: ${(result as any).tags?.join(", ") || "done"}`);
    } catch {
      toast.error("Tagging failed");
    } finally {
      setTagging(false);
    }
  };

  return (
    <div className={cn("relative", page.isFullWidth ? "max-w-none" : "max-w-3xl mx-auto")}>
      {/* Cover image */}
      {page.coverImage && (
        <div className="relative w-full h-48 -mx-8 mb-4 overflow-hidden">
          <img
            src={page.coverImage}
            alt="cover"
            className="w-full h-full object-cover"
          />
          <button
            className="absolute top-2 right-2 bg-black/40 text-white text-xs px-2 py-1 rounded hover:bg-black/60 transition"
            onClick={handleRemoveCover}
          >
            Remove cover
          </button>
        </div>
      )}

      {/* Icon + title area */}
      <div className="group relative pt-8">
        {/* Icon */}
        {page.icon && (
          <div className="relative inline-block mb-2">
            <span className="text-5xl leading-none cursor-pointer" onClick={() => setShowEmoji(true)}>
              {page.icon}
            </span>
            {showEmoji && (
              <div className="absolute top-full left-0 z-50 mt-1">
                <EmojiPicker onEmojiClick={handleEmojiSelect} />
              </div>
            )}
          </div>
        )}

        {/* Hover toolbar above title */}
        <div className="hidden group-hover:flex items-center gap-1 mb-2 text-xs text-muted-foreground">
          {!page.icon && (
            <button
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-accent/50 transition-colors"
              onClick={() => setShowEmoji(!showEmoji)}
            >
              <Smile className="w-3.5 h-3.5" /> Add icon
            </button>
          )}
          {page.icon && (
            <button
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-accent/50 transition-colors"
              onClick={handleRemoveIcon}
            >
              <X className="w-3.5 h-3.5" /> Remove icon
            </button>
          )}
          {maddyEnabled && (
            <button
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-accent/50 transition-colors text-foreground"
              onClick={handleAutoTag}
              disabled={tagging}
            >
              <Wand2 className="w-3.5 h-3.5" />
              {tagging ? "Tagging…" : "Auto-tag"}
            </button>
          )}
          <button
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-accent/50 transition-colors"
            onClick={handleFavourite}
          >
            {page.isFavourite ? (
              <>
                <AppIcon className="w-3.5 h-3.5 rounded-sm" /> Unfavourite
              </>
            ) : (
              <>
                <AppIcon className="w-3.5 h-3.5 rounded-sm" /> Favourite
              </>
            )}
          </button>
          <button
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-accent/50 transition-colors"
            onClick={handleFullWidth}
          >
            {page.isFullWidth ? (
              <><Minimize2 className="w-3.5 h-3.5" /> Full width off</>
            ) : (
              <><Maximize2 className="w-3.5 h-3.5" /> Full width</>
            )}
          </button>
        </div>

        {/* Title */}
        {editing ? (
          <Input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSave();
              if (e.key === "Escape") {
                setTitle(page.title);
                setEditing(false);
              }
            }}
            className="text-4xl font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent text-foreground"
            autoFocus
          />
        ) : (
          <h1
            className="text-4xl font-bold cursor-text hover:text-foreground/80 transition-colors min-h-[1.2em] empty:before:content-['Untitled'] empty:before:text-muted-foreground/40"
            onClick={() => setEditing(true)}
          >
            {page.title || (
              <span className="text-muted-foreground/40">Untitled</span>
            )}
          </h1>
        )}

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

      {/* Emoji picker overlay closer */}
      {showEmoji && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowEmoji(false)}
        />
      )}
    </div>
  );
}
