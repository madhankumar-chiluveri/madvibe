"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store/app.store";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  FileText,
  Database,
  LayoutDashboard,
  Clock,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { AppIcon } from "@/components/ui/app-icon";
import { toast } from "sonner";

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, currentWorkspaceId } =
    useAppStore();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const createPage = useMutation(api.pages.create);

  // Search results
  const searchResults = useQuery(
    api.pages.search,
    currentWorkspaceId && search.length > 0
      ? { workspaceId: currentWorkspaceId, query: search }
      : "skip"
  );

  // Recent pages
  const { recentPageIds } = useAppStore();
  const allPages = useQuery(
    api.pages.listAll,
    currentWorkspaceId ? { workspaceId: currentWorkspaceId } : "skip"
  );

  const recentPages =
    allPages?.filter((p: any) => recentPageIds.includes(p._id)).slice(0, 5) ??
    [];

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const close = () => {
    setCommandPaletteOpen(false);
    setSearch("");
  };

  const navigate = (path: string) => {
    router.push(path);
    close();
  };

  const handleCreatePage = async () => {
    if (!currentWorkspaceId) return;
    try {
      const id = await createPage({
        workspaceId: currentWorkspaceId,
        parentId: null,
        type: "document",
        title: search.trim() || "Untitled",
      });
      navigate(`/workspace/${id}`);
    } catch {
      toast.error("Failed to create page");
    }
  };

  const getPageIcon = (type: string) => {
    if (type === "database") return <Database className="w-4 h-4 mr-2 text-muted-foreground" />;
    if (type === "dashboard") return <LayoutDashboard className="w-4 h-4 mr-2 text-muted-foreground" />;
    return <FileText className="w-4 h-4 mr-2 text-muted-foreground" />;
  };

  const displayResults = search.length > 0 ? (searchResults ?? []) : [];

  return (
     <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
       <DialogContent title="Command Panel" hideTitleVisually={true} className="p-0 max-w-xl overflow-hidden rounded-xl shadow-2xl" aria-describedby={undefined}>
         <Command shouldFilter={false} className="rounded-xl">
          <CommandInput
            placeholder="Search or create pages…"
            value={search}
            onValueChange={setSearch}
            className="h-12 text-sm"
          />
          <CommandList className="max-h-[380px]">
            <CommandEmpty>
              {search.length > 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    No pages found for &quot;{search}&quot;
                  </p>
                  <button
                    className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto"
                    onClick={handleCreatePage}
                  >
                    <Plus className="w-4 h-4" />
                    Create &quot;{search}&quot;
                  </button>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Start typing to search…
                </p>
              )}
            </CommandEmpty>

            {/* Search results */}
            {displayResults.length > 0 && (
              <CommandGroup heading="Pages">
                {displayResults.map((page: any) => (
                  <CommandItem
                    key={page._id}
                    onSelect={() => navigate(`/workspace/${page._id}`)}
                    className="cursor-pointer"
                  >
                    {page.icon ? (
                      <span className="mr-2 text-sm">{page.icon}</span>
                    ) : (
                      getPageIcon(page.type)
                    )}
                    <span className="flex-1 truncate">{page.title || "Untitled"}</span>
                    {page.isFavourite && (
                      <AppIcon className="w-3 h-3 rounded-sm ml-2" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Quick actions (when not searching) */}
            {search.length === 0 && (
              <>
                <CommandGroup heading="Quick Actions">
                  <CommandItem onSelect={handleCreatePage} className="cursor-pointer">
                    <Plus className="w-4 h-4 mr-2 text-muted-foreground" />
                    New page
                  </CommandItem>
                  <CommandItem
                    onSelect={() => navigate("/workspace/settings")}
                    className="cursor-pointer"
                  >
                    <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
                    Settings
                    <CommandShortcut>⌘,</CommandShortcut>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => navigate("/workspace/trash")}
                    className="cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2 text-muted-foreground" />
                    Trash
                  </CommandItem>
                </CommandGroup>

                {recentPages.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Recent">
                      {recentPages.map((page: any) => (
                        <CommandItem
                          key={page._id}
                          onSelect={() => navigate(`/workspace/${page._id}`)}
                          className="cursor-pointer"
                        >
                          {page.icon ? (
                            <span className="mr-2 text-sm">{page.icon}</span>
                          ) : (
                            <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                          )}
                          <span className="flex-1 truncate">
                            {page.title || "Untitled"}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </>
            )}

            {/* Create option when searching */}
            {search.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={handleCreatePage} className="cursor-pointer">
                    <Plus className="w-4 h-4 mr-2 text-foreground" />
                    Create &quot;{search}&quot;
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
