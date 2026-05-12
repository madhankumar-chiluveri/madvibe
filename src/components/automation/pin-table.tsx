"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Pin = {
  _id: Id<"pinManagerPins">;
  title: string;
  mediaUrl: string;
  pinterestBoard: string;
  thumbnail: string;
  description: string;
  link: string;
  publishDate: string;
  keywords: string;
};

type PinColumnKey =
  | "title"
  | "mediaUrl"
  | "pinterestBoard"
  | "thumbnail"
  | "description"
  | "link"
  | "publishDate"
  | "keywords";

type PinColumn = {
  key: PinColumnKey;
  label: string;
  placeholder: string;
  width: string;
  isUrl?: boolean;
};

const COLUMNS: readonly PinColumn[] = [
  { key: "title", label: "Title", placeholder: "Pin title", width: "min-w-[220px]" },
  { key: "mediaUrl", label: "Media URL", placeholder: "https://...", width: "min-w-[280px]", isUrl: true },
  { key: "pinterestBoard", label: "Pinterest board", placeholder: "Board name", width: "min-w-[180px]" },
  { key: "thumbnail", label: "Thumbnail", placeholder: "https://...", width: "min-w-[200px]", isUrl: true },
  { key: "description", label: "Description", placeholder: "Pin description", width: "min-w-[300px]" },
  { key: "link", label: "Link", placeholder: "https://...", width: "min-w-[240px]", isUrl: true },
  { key: "publishDate", label: "Publish date", placeholder: "YYYY-MM-DD HH:mm", width: "min-w-[160px]" },
  { key: "keywords", label: "Keywords", placeholder: "tag1, tag2, ...", width: "min-w-[260px]" },
];

export function PinTable({
  workspaceId,
  pins,
}: {
  workspaceId: Id<"workspaces">;
  pins: Pin[];
}) {
  const addPin = useMutation(api.automations.pinManager.addPin);
  const updatePin = useMutation(api.automations.pinManager.updatePin);
  const deletePin = useMutation(api.automations.pinManager.deletePin);
  const [adding, setAdding] = useState(false);

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Pinterest pin table</p>
          <p className="text-xs text-muted-foreground">
            {pins.length === 0
              ? "Empty — paste a CSV below or click Add row."
              : `${pins.length} pin${pins.length === 1 ? "" : "s"} · ${pins.filter((p) => p.mediaUrl).length} with Media URL`}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={adding}
          onClick={async () => {
            setAdding(true);
            try {
              await addPin({ workspaceId });
            } finally {
              setAdding(false);
            }
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add row
        </Button>
      </header>

      {pins.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">No rows yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/15 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left w-12">#</th>
                {COLUMNS.map((col) => (
                  <th key={col.key} className={cn("px-3 py-2 text-left", col.width)}>
                    {col.label}
                  </th>
                ))}
                <th className="px-3 py-2 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {pins.map((pin, idx) => (
                <tr key={pin._id} className="hover:bg-muted/10">
                  <td className="px-3 py-1.5 align-middle">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </td>
                  {COLUMNS.map((col) => (
                    <td key={col.key} className={cn("px-2 py-1.5 align-middle", col.width)}>
                      <EditableCell
                        value={(pin as any)[col.key] ?? ""}
                        placeholder={col.placeholder}
                        isUrl={col.isUrl}
                        onCommit={(next) =>
                          updatePin({ pinId: pin._id, patch: { [col.key]: next } as any })
                        }
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 align-middle">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => void deletePin({ pinId: pin._id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EditableCell({
  value,
  placeholder,
  isUrl,
  onCommit,
}: {
  value: string;
  placeholder?: string;
  isUrl?: boolean;
  onCommit: (next: string) => Promise<unknown> | void;
}) {
  const [local, setLocal] = useState(value);
  const [focused, setFocused] = useState(false);
  if (!focused && local !== value) setLocal(value);

  const showLink = isUrl && value && /^https?:\/\//.test(value) && !focused;

  return (
    <div className="relative">
      <Input
        value={local}
        placeholder={placeholder}
        className={cn("h-8 border-transparent bg-transparent shadow-none focus:bg-background focus:border-border", isUrl && "pr-7")}
        onChange={(e) => setLocal(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (local !== value) void onCommit(local);
        }}
      />
      {showLink && (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}
