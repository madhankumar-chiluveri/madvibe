"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowUpDown,
  ChevronDown,
  Filter,
  LayoutGrid,
  LayoutList,
  Plus,
  Search,
  Table,
} from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BoardView } from "./board-view";
import {
  createProperty,
  filterAndSortRows,
  getDefaultValueForProperty,
  normalizeProperties,
  supportsOptions,
  updateProperty,
} from "./database-utils";
import { ListView } from "./list-view";
import { TableView } from "./table-view";

interface DatabaseViewProps {
  page: any;
}

type ViewType = "table" | "board" | "list";

const NONE_VALUE = "__none";
const EMPTY_FILTER_VALUE = "__empty";

export function DatabaseView({ page }: DatabaseViewProps) {
  const [viewType, setViewType] = useState<ViewType>("table");
  const [title, setTitle] = useState(page.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPropertyId, setFilterPropertyId] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [sortPropertyId, setSortPropertyId] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [boardGroupByPropertyId, setBoardGroupByPropertyId] = useState<string | null>(null);

  const updatePage = useMutation(api.pages.update);
  const addRow = useMutation(api.databases.addRow);
  const database = useQuery(api.databases.getByPage, { pageId: page._id });
  const rows = useQuery(
    api.databases.listRows,
    database ? { databaseId: database._id } : "skip"
  );
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const properties = useMemo(
    () => (database ? normalizeProperties(database.properties ?? []) : []),
    [database]
  );
  const filterProperty =
    properties.find((property) => property.id === filterPropertyId) ?? null;
  const selectProperties = properties.filter((property) => property.type === "select");
  const visibleRows = useMemo(() => {
    if (rows === undefined) return undefined;
    return filterAndSortRows(rows, properties, {
      searchQuery: deferredSearchQuery,
      filter: {
        propertyId: filterPropertyId,
        value: filterValue,
      },
      sort: {
        propertyId: sortPropertyId,
        direction: sortDirection,
      },
    });
  }, [deferredSearchQuery, filterPropertyId, filterValue, properties, rows, sortDirection, sortPropertyId]);

  useEffect(() => {
    if (filterPropertyId && !properties.some((property) => property.id === filterPropertyId)) {
      setFilterPropertyId(null);
      setFilterValue("");
    }
  }, [filterPropertyId, properties]);

  useEffect(() => {
    if (sortPropertyId && !properties.some((property) => property.id === sortPropertyId)) {
      setSortPropertyId(null);
    }
  }, [properties, sortPropertyId]);

  useEffect(() => {
    if (selectProperties.length === 0) {
      setBoardGroupByPropertyId(null);
      return;
    }

    if (
      !boardGroupByPropertyId ||
      !selectProperties.some((property) => property.id === boardGroupByPropertyId)
    ) {
      setBoardGroupByPropertyId(selectProperties[0].id);
    }
  }, [boardGroupByPropertyId, selectProperties]);

  const handleTitleSave = async () => {
    setEditingTitle(false);
    if (title !== page.title) {
      await updatePage({ id: page._id, title });
    }
  };

  const handleQuickAddRow = async () => {
    if (!database) return;

    setQuickAddLoading(true);
    try {
      const initialData: Record<string, unknown> = {};
      for (const property of properties) {
        initialData[property.id] = getDefaultValueForProperty(property);
      }

      await addRow({
        databaseId: database._id,
        data: initialData,
      });
    } finally {
      setQuickAddLoading(false);
    }
  };

  const viewTabs: { id: ViewType; label: string; icon: React.ReactNode }[] = [
    { id: "table", label: "Table", icon: <Table className="h-3.5 w-3.5" /> },
    { id: "board", label: "Board", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: "list", label: "List", icon: <LayoutList className="h-3.5 w-3.5" /> },
  ];

  const clearControls = () => {
    setSearchQuery("");
    setFilterPropertyId(null);
    setFilterValue("");
    setSortPropertyId(null);
    setSortDirection("asc");
  };

  const hasActiveControls = Boolean(searchQuery || filterPropertyId || sortPropertyId);

  return (
    <div className="database-page min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,#151412_0%,#0f0e0d_100%)] text-zinc-100">
      <div className="max-w-full px-6 pb-3 pt-9 md:px-10">
        <div className="mx-auto max-w-[1440px]">
          {editingTitle ? (
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleTitleSave();
                if (event.key === "Escape") {
                  setTitle(page.title);
                  setEditingTitle(false);
                }
              }}
              className="h-auto border-none bg-transparent p-0 text-5xl font-semibold tracking-[-0.04em] text-white shadow-none focus-visible:ring-0"
              autoFocus
            />
          ) : (
            <h1
              className="mb-4 cursor-text text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-white transition-opacity hover:opacity-80"
              onClick={() => setEditingTitle(true)}
            >
              {page.title || <span className="text-zinc-600">Untitled</span>}
            </h1>
          )}

          {page.maddyTags?.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {page.maddyTags.map((tag: string) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="rounded-[26px] border border-white/8 bg-black/20 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-2 rounded-[20px] border border-white/6 bg-white/[0.03] px-2 py-2">
              {viewTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setViewType(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-[13px] leading-none transition-colors",
                    viewType === tab.id
                      ? "bg-white text-black"
                      : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}

              <div className="flex-1" />

              <div className="relative min-w-[220px] flex-1 md:w-[260px] md:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search rows"
                  className="h-9 rounded-xl border-white/8 bg-white/[0.03] pl-9 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-white/15"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-zinc-500" />
                <Select
                  value={filterPropertyId ?? NONE_VALUE}
                  onValueChange={(value) => {
                    setFilterPropertyId(value === NONE_VALUE ? null : value);
                    setFilterValue("");
                  }}
                >
                  <SelectTrigger className="h-9 min-w-[150px] rounded-xl border-white/8 bg-white/[0.03] text-zinc-100 focus:ring-white/15">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#191816] text-zinc-100">
                    <SelectItem value={NONE_VALUE}>No filter</SelectItem>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filterProperty && (
                supportsOptions(filterProperty.type) ? (
                  <Select
                    value={filterValue || NONE_VALUE}
                    onValueChange={(value) => setFilterValue(value === NONE_VALUE ? "" : value)}
                  >
                    <SelectTrigger className="h-9 min-w-[170px] rounded-xl border-white/8 bg-white/[0.03] text-zinc-100 focus:ring-white/15">
                      <SelectValue placeholder="Filter value" />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#191816] text-zinc-100">
                      <SelectItem value={NONE_VALUE}>Any value</SelectItem>
                      <SelectItem value={EMPTY_FILTER_VALUE}>Empty</SelectItem>
                      {(filterProperty.config?.options ?? []).map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : filterProperty.type === "checkbox" ? (
                  <Select
                    value={filterValue || NONE_VALUE}
                    onValueChange={(value) => setFilterValue(value === NONE_VALUE ? "" : value)}
                  >
                    <SelectTrigger className="h-9 min-w-[150px] rounded-xl border-white/8 bg-white/[0.03] text-zinc-100 focus:ring-white/15">
                      <SelectValue placeholder="Checked state" />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#191816] text-zinc-100">
                      <SelectItem value={NONE_VALUE}>Any value</SelectItem>
                      <SelectItem value="true">Checked</SelectItem>
                      <SelectItem value="false">Unchecked</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={filterValue}
                    onChange={(event) => setFilterValue(event.target.value)}
                    placeholder={`Filter ${filterProperty.name}`}
                    className="h-9 min-w-[170px] rounded-xl border-white/8 bg-white/[0.03] text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-white/15"
                  />
                )
              )}

              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-zinc-500" />
                <Select
                  value={sortPropertyId ?? NONE_VALUE}
                  onValueChange={(value) => setSortPropertyId(value === NONE_VALUE ? null : value)}
                >
                  <SelectTrigger className="h-9 min-w-[150px] rounded-xl border-white/8 bg-white/[0.03] text-zinc-100 focus:ring-white/15">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#191816] text-zinc-100">
                    <SelectItem value={NONE_VALUE}>No sort</SelectItem>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {sortPropertyId && (
                <Select
                  value={sortDirection}
                  onValueChange={(value) => setSortDirection(value as "asc" | "desc")}
                >
                  <SelectTrigger className="h-9 min-w-[120px] rounded-xl border-white/8 bg-white/[0.03] text-zinc-100 focus:ring-white/15">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#191816] text-zinc-100">
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {viewType === "board" && selectProperties.length > 0 && (
                <Select
                  value={boardGroupByPropertyId ?? selectProperties[0].id}
                  onValueChange={setBoardGroupByPropertyId}
                >
                  <SelectTrigger className="h-9 min-w-[160px] rounded-xl border-white/8 bg-white/[0.03] text-zinc-100 focus:ring-white/15">
                    <SelectValue placeholder="Group by" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#191816] text-zinc-100">
                    {selectProperties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        Group by {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {hasActiveControls && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearControls}
                  className="h-9 rounded-xl text-[13px] font-normal text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                >
                  Clear
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                onClick={handleQuickAddRow}
                disabled={!database || quickAddLoading}
                className="h-9 gap-1.5 rounded-xl bg-white px-3 text-[13px] font-medium text-black hover:bg-zinc-200"
              >
                <Plus className="h-3.5 w-3.5" />
                {quickAddLoading ? "Adding..." : "New"}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-14 md:px-10">
        <div className="mx-auto max-w-[1440px]">
          {database === undefined ? (
            <div className="py-8 text-sm text-zinc-500">Loading database...</div>
          ) : database === null ? (
            <CreateDatabase pageId={page._id} />
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between px-1 text-sm text-zinc-500">
                <span>
                  {visibleRows?.length ?? 0}
                  {rows && visibleRows && rows.length !== visibleRows.length ? ` of ${rows.length}` : ""}
                  {" "}rows visible
                </span>
                {database && selectProperties.length > 1 && viewType === "board" && (
                  <span>Board grouping is configurable from the toolbar.</span>
                )}
              </div>

              {viewType === "table" && (
                <TableView
                  database={database}
                  rows={visibleRows}
                  totalRowCount={rows?.length}
                />
              )}
              {viewType === "board" && (
                <BoardView
                  database={database}
                  pageId={page._id}
                  rows={visibleRows}
                  groupByPropertyId={boardGroupByPropertyId}
                />
              )}
              {viewType === "list" && (
                <ListView
                  database={database}
                  pageId={page._id}
                  rows={visibleRows}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateDatabase({ pageId }: { pageId: Id<"pages"> }) {
  const createDatabase = useMutation(api.databases.create);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const title = createProperty("title", "Tool Name");
      const category = updateProperty(createProperty("select", "Category"), {
        config: {
          options: [
            { id: "business-sales", label: "Business & Sales", color: "brown" },
            { id: "code-development", label: "Code & Development", color: "gray" },
            { id: "productivity-workflow", label: "Productivity & Workflow", color: "blue" },
            { id: "research-search", label: "Research & Search", color: "brown" },
          ],
        },
      });
      const tags = updateProperty(createProperty("multi_select", "Sub-Category"), {
        config: {
          options: [
            { id: "agents-automation", label: "Agents & Automation", color: "gray" },
            { id: "chatbots-assistants", label: "Chatbots & Assistants", color: "brown" },
            { id: "data-analytics", label: "Data & Analytics", color: "red" },
            { id: "design-uiux", label: "Design & UI/UX", color: "gray" },
          ],
        },
      });
      const description = createProperty("text", "What It Does");
      const website = createProperty("url", "Official Link");
      const pricing = updateProperty(createProperty("select", "Pricing"), {
        config: {
          options: [
            { id: "free", label: "Free", color: "blue" },
            { id: "freemium", label: "Freemium", color: "gray" },
            { id: "paid", label: "Paid", color: "orange" },
            { id: "custom", label: "Custom", color: "purple" },
          ],
        },
      });

      await createDatabase({
        pageId,
        name: "Database",
        properties: [title, category, tags, description, website, pricing],
      });
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-16 text-center">
      <p className="max-w-md text-sm text-zinc-400">
        No database schema exists on this page yet. Initialize one with a Notion-style starter setup.
      </p>
      <Button
        type="button"
        onClick={handleCreate}
        disabled={creating}
        className="rounded-xl bg-white text-black hover:bg-zinc-200"
      >
        <Plus className="mr-2 h-4 w-4" />
        {creating ? "Creating..." : "Initialize Database"}
      </Button>
    </div>
  );
}
