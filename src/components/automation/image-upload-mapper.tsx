"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import {
  Check,
  Cloud,
  CloudOff,
  Copy,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Pin } from "./pin-table";

type QueueItem = {
  id: string;
  file: File;
  previewUrl: string;
  filename: string;
  selectedPinId: string; // "" = none
  status: "pending" | "uploading" | "done" | "failed";
  publicUrl?: string;
  error?: string;
};

const NONE_PIN = "__none__";

export function ImageUploadMapper({
  workspaceId,
  pins,
  ociConfigured,
}: {
  workspaceId: Id<"workspaces">;
  pins: Pin[];
  ociConfigured: boolean;
}) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const uploadStorageToOci = useAction(api.automations.ociUploader.uploadStorageToOci);

  const [items, setItems] = useState<QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Best-effort revoke object URLs
  useEffect(() => {
    return () => {
      items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detectRow = useCallback(
    (filename: string): string => {
      const match = filename.match(/^(\d{1,3})[_\-]/);
      if (!match) return NONE_PIN;
      const idx = Number(match[1]) - 1;
      return pins[idx]?._id ?? NONE_PIN;
    },
    [pins],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      setItems((prev) => {
        const usedPinIds = new Set(prev.map((it) => it.selectedPinId).filter((id) => id !== NONE_PIN));
        const emptyPins = pins.filter((p) => !p.mediaUrl && !usedPinIds.has(p._id));
        let emptyIndex = 0;

        const next = files.map((file) => {
          const previewUrl = URL.createObjectURL(file);
          const filename = file.name;
          
          let pinId = detectRow(filename);
          
          if (pinId === NONE_PIN && emptyIndex < emptyPins.length) {
            pinId = emptyPins[emptyIndex]._id;
            emptyIndex++;
          }

          return {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${filename}`,
            file,
            previewUrl,
            filename,
            selectedPinId: pinId,
            status: "pending" as const,
          };
        });
        return [...prev, ...next];
      });
    },
    [detectRow, pins],
  );

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((it) => it.id !== id);
    });
  };

  const clearAll = () => {
    items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setItems([]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    const files: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList.item(i);
      if (f && f.type.startsWith("image/")) files.push(f);
    }
    addFiles(files);
    e.currentTarget.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const fileList = e.dataTransfer.files;
    const files: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList.item(i);
      if (f && f.type.startsWith("image/")) files.push(f);
    }
    addFiles(files);
  };

  const updateRowSelection = (id: string, pinId: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, selectedPinId: pinId } : it)));
  };

  const uploadOne = async (item: QueueItem) => {
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, status: "uploading", error: undefined } : it)),
    );
    try {
      const uploadUrl: string = await generateUploadUrl();
      const putResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": item.file.type },
        body: item.file,
      });
      if (!putResponse.ok) throw new Error(`Convex storage upload failed: ${putResponse.status}`);
      const { storageId } = (await putResponse.json()) as { storageId: Id<"_storage"> };

      const result = await uploadStorageToOci({
        workspaceId,
        storageId,
        filename: item.filename,
        contentType: item.file.type || "application/octet-stream",
        autoFillPinId:
          item.selectedPinId && item.selectedPinId !== NONE_PIN
            ? (item.selectedPinId as Id<"pinManagerPins">)
            : undefined,
      });

      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: "done", publicUrl: result.publicUrl } : it,
        ),
      );
    } catch (err: any) {
      const msg = err?.message ?? "Upload failed";
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: "failed", error: msg } : it)),
      );
      throw err;
    }
  };

  const uploadAll = async () => {
    if (!ociConfigured) {
      toast.error("Configure Oracle OCI in Settings → Integrations first.");
      return;
    }
    const queue = items.filter((it) => it.status === "pending" || it.status === "failed");
    if (queue.length === 0) {
      toast.info("Nothing to upload.");
      return;
    }
    setUploading(true);
    let ok = 0;
    let failed = 0;
    for (const item of queue) {
      try {
        await uploadOne(item);
        ok++;
      } catch {
        failed++;
      }
    }
    setUploading(false);
    if (ok > 0 && failed === 0) toast.success(`${ok} image${ok === 1 ? "" : "s"} uploaded.`);
    else if (ok > 0) toast.success(`${ok} uploaded, ${failed} failed.`);
    else toast.error(`${failed} upload${failed === 1 ? "" : "s"} failed.`);
  };

  const pendingCount = useMemo(
    () => items.filter((it) => it.status === "pending" || it.status === "failed").length,
    [items],
  );

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-4 py-3">
        <div>
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Cloud className="h-4 w-4 text-muted-foreground" /> Upload images to OCI &amp; map to rows
          </p>
          <p className="text-xs text-muted-foreground">
            Filenames prefixed with <code className="rounded bg-muted/60 px-1">NN_</code> auto-pick row N.
          </p>
        </div>
        {items.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            disabled={uploading}
            onClick={clearAll}
          >
            Clear queue
          </Button>
        )}
      </header>

      <div className="p-4 space-y-4">
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative cursor-pointer rounded-xl border-2 border-dashed border-border bg-background px-4 py-8 text-center transition-all",
            "hover:border-cyan-500/50 hover:bg-cyan-500/[0.02]",
            dragOver && "border-cyan-500 bg-cyan-500/5",
          )}
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/25 to-sky-500/15 ring-1 ring-cyan-500/30">
            {dragOver ? <Upload className="h-5 w-5 text-cyan-500" /> : <ImagePlus className="h-5 w-5 text-cyan-500" />}
          </div>
          <p className="mt-3 text-sm font-medium">
            {dragOver ? "Drop to add" : "Drop images here or click to pick files"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PNG, JPG, JPEG, WEBP — multi-select supported.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>

        {items.length > 0 && (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-2.5"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.previewUrl} alt={item.filename} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium" title={item.filename}>
                    {item.filename}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Select
                      value={item.selectedPinId}
                      onValueChange={(v) => updateRowSelection(item.id, v)}
                      disabled={item.status === "uploading" || item.status === "done"}
                    >
                      <SelectTrigger className="h-8 w-[200px] text-xs">
                        <SelectValue placeholder="Map to row…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_PIN}>
                          <span className="text-muted-foreground">No row (upload only)</span>
                        </SelectItem>
                        {pins.map((pin, idx) => (
                          <SelectItem key={pin._id} value={pin._id}>
                            <span className="font-mono text-[10px] text-muted-foreground mr-1.5">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            {pin.title ? pin.title.slice(0, 38) : "(untitled)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <StatusBadge item={item} />
                    {item.publicUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        onClick={async () => {
                          await navigator.clipboard.writeText(item.publicUrl!);
                          toast.success("URL copied");
                        }}
                      >
                        <Copy className="mr-1 h-3 w-3" /> Copy URL
                      </Button>
                    )}
                  </div>
                  {item.error && (
                    <p className="mt-1 text-xs text-destructive truncate" title={item.error}>
                      {item.error}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(item.id)}
                  disabled={item.status === "uploading"}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={pendingCount === 0 || uploading || !ociConfigured}
            onClick={() => void uploadAll()}
          >
            {uploading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Cloud className="mr-1.5 h-4 w-4" />
            )}
            Upload all &amp; fill Media URLs
            {pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-white/15 px-1.5 py-0.5 text-[11px]">{pendingCount}</span>
            )}
          </Button>
          {!ociConfigured && (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
              <CloudOff className="h-3.5 w-3.5" /> OCI not configured — uploads disabled.
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ item }: { item: QueueItem }) {
  if (item.status === "uploading")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/5 px-2 py-0.5 text-[11px] font-medium text-amber-600">
        <Loader2 className="h-3 w-3 animate-spin" /> Uploading
      </span>
    );
  if (item.status === "done")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
        <Check className="h-3 w-3" /> Uploaded
      </span>
    );
  if (item.status === "failed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/5 px-2 py-0.5 text-[11px] font-medium text-destructive">
        <X className="h-3 w-3" /> Failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <ImageIcon className="h-3 w-3" /> Pending
    </span>
  );
}
