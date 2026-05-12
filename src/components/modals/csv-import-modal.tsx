"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  FileUp,
  Hash,
  Link,
  Loader2,
  Mail,
  Phone,
  Table2,
  Tag,
  Type,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { PropertyType } from "@/types/database";
import {
  analyzeCSV,
  buildProperties,
  buildRowData,
  buildSelectOptions,
  type CsvParseResult,
  type InferredColumn,
} from "@/lib/csv-schema-inference";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Type metadata ─────────────────────────────────────────────────────────────

const SUPPORTED_TYPES: Array<{ value: PropertyType; label: string }> = [
  { value: "title", label: "Title" },
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "phone", label: "Phone" },
  { value: "select", label: "Select" },
  { value: "multi_select", label: "Multi-select" },
];

const TYPE_ICONS: Partial<Record<PropertyType, React.ElementType>> = {
  title: Type,
  text: AlignLeft,
  number: Hash,
  checkbox: CheckSquare,
  date: Calendar,
  email: Mail,
  url: Link,
  phone: Phone,
  select: Tag,
  multi_select: Tag,
};

// ── Component ─────────────────────────────────────────────────────────────────

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: Id<"workspaces">;
  parentId: Id<"pages"> | null;
}

export function CsvImportModal({
  open,
  onClose,
  workspaceId,
  parentId,
}: CsvImportModalProps) {
  const [parsed, setParsed] = useState<CsvParseResult | null>(null);
  const [columns, setColumns] = useState<InferredColumn[]>([]);
  const [dbName, setDbName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importCsvMutation = useMutation(api.databases.importCsv);
  const router = useRouter();

  function reset() {
    setParsed(null);
    setColumns([]);
    setDbName("");
    setIsDragging(false);
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    if (!isImporting) {
      reset();
      onClose();
    }
  }

  function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Select a .csv file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10 MB limit");
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const result = analyzeCSV(text);
      if (!result) {
        toast.error("Could not parse CSV — ensure the file has a header row and at least one data row");
        return;
      }
      const name = file.name
        .replace(/\.csv$/i, "")
        .replace(/[_-]+/g, " ")
        .trim() || "Imported Database";
      setParsed(result);
      setColumns(result.columns);
      setDbName(name);
    };
    reader.readAsText(file);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  function updateColumnType(colIndex: number, newType: PropertyType) {
    setColumns(prev =>
      prev.map((col, i) => {
        if (i !== colIndex) return col;
        const updated: InferredColumn = { ...col, currentType: newType };
        if (newType === "select" || newType === "multi_select") {
          const values = (parsed?.rawRows ?? []).slice(0, 200).map(row => row[i] ?? "");
          updated.selectOptions = buildSelectOptions(values, newType);
        } else {
          updated.selectOptions = undefined;
        }
        return updated;
      })
    );
  }

  async function handleImport() {
    if (!parsed || columns.length === 0) return;
    setIsImporting(true);
    try {
      const properties = buildProperties(columns);
      const rows = parsed.rawRows.map(rawRow => buildRowData(rawRow, columns));

      const pageId = await importCsvMutation({
        workspaceId,
        parentId,
        name: dbName.trim() || "Imported Database",
        properties,
        rows,
      });

      toast.success(`Imported ${parsed.totalRows.toLocaleString()} rows`);
      reset();
      onClose();
      router.push(`/workspace/${pageId}`);
    } catch (err) {
      console.error(err);
      toast.error("Import failed — please try again");
      setIsImporting(false);
    }
  }

  const previewRows = parsed?.rawRows.slice(0, 5) ?? [];

  return (
    <Dialog open={open} onOpenChange={val => !val && handleClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col border-white/10 bg-[#161513] p-0 text-zinc-100 sm:rounded-[28px]">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-white/10 px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle className="text-xl text-zinc-100">Import from CSV</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Column types are detected automatically. Override any type before importing.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {!parsed ? (
            // ── Drop zone ──────────────────────────────────────────────────────
            <div
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-14 transition-colors",
                isDragging
                  ? "border-blue-500/60 bg-blue-500/5"
                  : "border-white/15 hover:border-white/30 hover:bg-white/[0.02]"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragging(false)}
            >
              <FileUp className="h-10 w-10 text-zinc-500" />
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-200">
                  Drop CSV file here or click to browse
                </p>
                <p className="mt-1 text-xs text-zinc-500">Supports .csv · max 10 MB</p>
              </div>
            </div>
          ) : (
            <>
              {/* Database name + row count */}
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-zinc-400">Database name</label>
                  <Input
                    value={dbName}
                    onChange={e => setDbName(e.target.value)}
                    className="h-9 rounded-xl border-white/10 bg-white/[0.04] text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-white/15"
                    placeholder="Database name"
                  />
                </div>
                <p className="mb-1 whitespace-nowrap text-sm text-zinc-400">
                  {parsed.totalRows.toLocaleString()} rows · {columns.length} columns
                </p>
              </div>

              {/* Column type table */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500">
                  Detected columns
                </p>
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03]">
                        <th className="w-[38%] px-4 py-2.5 text-left text-xs font-medium text-zinc-400">
                          Column
                        </th>
                        <th className="w-[22%] px-4 py-2.5 text-left text-xs font-medium text-zinc-400">
                          Type
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-400">
                          Sample values
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {columns.map((col, i) => {
                        const Icon = TYPE_ICONS[col.currentType] ?? AlignLeft;
                        return (
                          <tr
                            key={col.id}
                            className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]"
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <Icon className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" />
                                <span className="truncate text-zinc-200">{col.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <Select
                                value={col.currentType}
                                onValueChange={val => updateColumnType(i, val as PropertyType)}
                              >
                                <SelectTrigger className="h-7 w-full rounded-lg border-white/10 bg-white/[0.04] px-2 text-xs text-zinc-200 focus:ring-white/15">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-white/10 bg-[#1e1d1b] text-zinc-200">
                                  {SUPPORTED_TYPES.map(t => (
                                    <SelectItem
                                      key={t.value}
                                      value={t.value}
                                      className="text-xs"
                                    >
                                      {t.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="max-w-0 px-4 py-2.5 text-xs text-zinc-400">
                              <span className="block truncate">
                                {col.sampleValues.length > 0 ? (
                                  col.sampleValues.map(v => `"${v}"`).join(", ")
                                ) : (
                                  <span className="italic text-zinc-600">empty</span>
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Data preview */}
              {previewRows.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500">
                    Preview ({Math.min(5, previewRows.length)} of {parsed.totalRows} rows)
                  </p>
                  <div className="overflow-x-auto rounded-2xl border border-white/10">
                    <table className="w-full min-w-max text-xs">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.03]">
                          {columns.map(col => (
                            <th
                              key={col.id}
                              className="max-w-[160px] px-3 py-2 text-left font-medium text-zinc-400"
                            >
                              <span className="block truncate">{col.name}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, ri) => (
                          <tr
                            key={ri}
                            className="border-b border-white/[0.06] last:border-0"
                          >
                            {columns.map((col, ci) => (
                              <td
                                key={col.id}
                                className="max-w-[160px] px-3 py-2 text-zinc-300"
                              >
                                <span className="block max-w-[160px] truncate">
                                  {row[ci] !== undefined && row[ci] !== "" ? (
                                    row[ci]
                                  ) : (
                                    <span className="text-zinc-600">—</span>
                                  )}
                                </span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-between border-t border-white/10 px-6 py-4">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isImporting}
            className="text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
          >
            Cancel
          </Button>

          {parsed ? (
            <div className="flex items-center gap-3">
              <button
                className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                onClick={() => { setParsed(null); setColumns([]); setDbName(""); }}
              >
                Choose different file
              </button>
              <Button
                onClick={handleImport}
                disabled={isImporting || columns.length === 0}
                className="rounded-xl bg-white text-black hover:bg-zinc-200"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Table2 className="mr-2 h-4 w-4" />
                    Import database
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
