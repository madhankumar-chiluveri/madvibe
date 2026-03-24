"use client";

import { BookOpen, Search } from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { Button } from "@/components/ui/button";

export default function BrainPage() {
  const { setCommandPaletteOpen } = useAppStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-16 text-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40">
        <BookOpen className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">BRAIN</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Your personal knowledge base. Select a page from the sidebar or create a new one to get started.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setCommandPaletteOpen(true)}>
          <Search className="w-4 h-4 mr-1.5" />
          Search pages
        </Button>
      </div>
    </div>
  );
}
