"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2, FileText, TableProperties, Archive } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app.store";
import { BlockNoteEditor } from "@blocknote/core";
import { sanitizeForConvex } from "@/lib/utils";

// Simple CSV to Database schema parser
function parseCsvToDatabase(csvText: string) {
  if (!csvText.trim()) return null;
  
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return null;
  
  // Custom simple line splitter to handle basic quotes
  const parseLine = (line: string) => {
    const row = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && line[i+1] === '"') {
        cur += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(cur);
        cur = "";
      } else {
        cur += char;
      }
    }
    row.push(cur);
    return row.map((cell) => cell.trim().replace(/\n/g, " "));
  };

  const headers = parseLine(lines[0]);
  
  // Create properties mapping
  const properties = headers.map((header, index) => {
    let id = header.toLowerCase().replace(/[^a-z0-9]/g, "_");
    if (!id || id === "_") id = `col_${index}`;
    return { id, name: header || `Column ${index + 1}`, type: "text" };
  });

  // Make the first property a "title" type by default
  if (properties.length > 0) {
    properties[0].type = "title";
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const rawRow = parseLine(lines[i]);
    const rowData: Record<string, any> = {};
    properties.forEach((prop, index) => {
      rowData[prop.id] = rawRow[index] !== undefined ? rawRow[index] : null;
    });
    rows.push(rowData);
  }

  return { properties, rows };
}



interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: Id<"workspaces"> | null;
}

export function ImportModal({ open, onClose, workspaceId }: ImportModalProps) {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createPage = useMutation(api.pages.create);
  const replaceAllBlocks = useMutation(api.blocks.replaceAll);
  const importCsvMutation = useMutation(api.databases.importCsv);
  const router = useRouter();



  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspaceId) return;
    
    // Clear the input value immediately so the same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";

    setIsImporting(true);


    try {
      const text = await file.text();
      let markdownToParse = text;

      // Ensure proper extension mapping
      const isCsv = file.name.toLowerCase().endsWith(".csv");
      const isMd = file.name.toLowerCase().endsWith(".md") || file.name.toLowerCase().endsWith(".markdown");

      if (!isCsv && !isMd) {
        toast.error("Unsupported file type. Please upload a .md or .csv file.");
        setIsImporting(false);
        return;
      }

      if (isCsv) {
        let title = file.name.replace(/\.(csv)$/i, "");
        title = title.replace(/(?:\s|-|_)*[a-f0-9]{32}$/i, "").trim() || "Imported Database";

        const parsed = parseCsvToDatabase(text);
        if (!parsed) {
          toast.error("Could not extract any data from the CSV file.");
          setIsImporting(false);
          return;
        }

        const pageId = await importCsvMutation({
          workspaceId,
          name: title,
          properties: parsed.properties,
          rows: parsed.rows
        });

        toast.success("Database imported successfully!");
        router.push(`/workspace/${pageId}`);
        onClose();
        setIsImporting(false);
        return;
      }

      // Generate page title from file name
      let title = file.name.replace(/\.(md|markdown)$/i, "");
      title = title.replace(/(?:\s|-|_)*[a-f0-9]{32}$/i, "").trim() || "Imported Document";

      // Parse markdown to native blocks using headless BlockNote
      const editor = BlockNoteEditor.create();
      const blocks = await editor.tryParseMarkdownToBlocks(markdownToParse);

      if (!blocks || blocks.length === 0) {
        toast.error("Could not extract any content from the file.");
        setIsImporting(false);
        return;
      }

      // 1. Create a new document page
      const pageId = await createPage({
        workspaceId,
        parentId: null,
        type: "document",
        title,
      });

      // 2. Replace the initial empty block with the parsed blocks
      await replaceAllBlocks({
        pageId,
        blocks: [
          {
            type: "document",
            content: sanitizeForConvex(blocks),
            sortOrder: 1000,
            properties: {},
          }
        ] as any, 
      });

      toast.success("Import successful!");
      
      // Auto-navigate to the newly imported page
      router.push(`/workspace/${pageId}`);
      onClose();

    } catch (error) {
      console.error("Import failed:", error);
      toast.error("Failed to import the file.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && !isImporting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Import your knowledge from external files. We currently support Markdown and CSV data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          <input
            type="file"
            accept=".md,.markdown,.csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          
          <button
            onClick={() => !isImporting && fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isImporting ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <FileUp className="w-8 h-8 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {isImporting ? "Importing..." : "Click to select a file"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Markdown (.md) or CSV (.csv)
              </p>
            </div>
          </button>
          
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="flex flex-col gap-1 p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-semibold">Markdown</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Import hierarchical text, links, and formatting blocks.</p>
            </div>
            
            <div className="flex flex-col gap-1 p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2">
                <TableProperties className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-semibold">CSV Data</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Import spreadsheets natively as standalone Databases.</p>
            </div>


          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose} disabled={isImporting}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
