"use client";

import {
  type ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowUpDown,
  Filter,
  LayoutGrid,
  LayoutList,
  Plus,
  Rows3,
  Search,
  Table,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReminderTriggerButton } from "@/components/reminders/reminder-trigger-button";
import { cn } from "@/lib/utils";
import { PageBreadcrumb } from "@/components/editor/breadcrumb";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import { useResolvedWorkspace } from "@/hooks/use-resolved-workspace";
import { BoardView } from "./board-view";
import { DatabaseQuickFilterBar } from "./database-quick-filter-bar";
import { DatabaseQuickSortBar } from "./database-quick-sort-bar";
import {
  buildInitialRowData,
  cloneDatabaseValue,
  createProperty,
  createSnapshotRowData,
  filterAndSortRows,
  getDefaultFilterOperator,
  getDefaultFilterValue,
  getFilterOperatorOptions,
  isFilterConditionActive,
  normalizeProperties,
  updateProperty,
} from "./database-utils";
import { ListView } from "./list-view";
import { TableView } from "./table-view";
import type { FilterCondition, FilterGroup, PropertySchema, SortRule } from "@/types/database";

interface DatabaseViewProps {
  page: any;
}

type ViewType = "table" | "board" | "list";

interface DatabaseSnapshotRow {
  data: Record<string, unknown>;
  sortOrder: number;
  pageId: Id<"pages"> | null;
  isArchived?: boolean;
}

interface DatabaseSnapshot {
  properties: PropertySchema[];
  rows: DatabaseSnapshotRow[];
}

interface DatabaseHistoryEntry {
  before: DatabaseSnapshot;
  after: DatabaseSnapshot;
  label: string;
}

interface DatabaseRowRecord {
  _id: Id<"rows">;
  _creationTime: number;
  data?: Record<string, unknown>;
  sortOrder: number;
  pageId?: Id<"pages"> | null;
  isArchived?: boolean;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const editableSelector = "input, textarea, select, [contenteditable='true']";
  return Boolean(target.closest(editableSelector));
}

function appendHistoryEntry<T>(entries: T[], entry: T) {
  return [...entries.slice(-49), entry];
}

function cloneFilterGroup(group: FilterGroup): FilterGroup {
  return {
    operator: group.operator,
    conditions: group.conditions.map((condition) => ({
      propertyId: condition.propertyId,
      operator: condition.operator,
      value: cloneDatabaseValue(condition.value),
    })),
  };
}

function cloneSortRules(rules: SortRule[]): SortRule[] {
  return rules.map((rule) => ({
    propertyId: rule.propertyId,
    direction: rule.direction,
  }));
}

function areSortRulesEqual(left: SortRule[], right: SortRule[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((rule, index) => {
    const candidate = right[index];
    return rule.propertyId === candidate.propertyId && rule.direction === candidate.direction;
  });
}

function areFilterGroupsEqual(left: FilterGroup, right: FilterGroup) {
  if (left.operator !== right.operator || left.conditions.length !== right.conditions.length) {
    return false;
  }

  return left.conditions.every((condition, index) => {
    const candidate = right.conditions[index];

    return (
      condition.propertyId === candidate.propertyId &&
      condition.operator === candidate.operator &&
      JSON.stringify(condition.value ?? null) === JSON.stringify(candidate.value ?? null)
    );
  });
}

function sanitizeFilterGroup(group: FilterGroup, properties: PropertySchema[]): FilterGroup {
  const nextConditions = group.conditions
    .filter((condition) => properties.some((property) => property.id === condition.propertyId))
    .map((condition) => {
      const property = properties.find((candidate) => candidate.id === condition.propertyId);
      if (!property) {
        return condition;
      }

      const availableOperators = getFilterOperatorOptions(property).map((option) => option.value);
      if (availableOperators.includes(condition.operator)) {
        return condition;
      }

      const nextOperator = getDefaultFilterOperator(property);
      return {
        ...condition,
        operator: nextOperator,
        value: getDefaultFilterValue(property, nextOperator),
      };
    });

  return {
    ...group,
    conditions: nextConditions,
  };
}

function getPersistableFilterGroup(group: FilterGroup, properties: PropertySchema[]): FilterGroup {
  return {
    operator: group.operator,
    conditions: group.conditions
      .filter((condition) => isFilterConditionActive(condition, properties))
      .map((condition) => ({
        propertyId: condition.propertyId,
        operator: condition.operator,
        value: cloneDatabaseValue(condition.value),
      })),
  };
}

function sanitizeSortRules(rules: SortRule[], properties: PropertySchema[]): SortRule[] {
  return rules.filter((rule) => properties.some((property) => property.id === rule.propertyId));
}

function areStringArraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function getOrderedPropertyIds(properties: PropertySchema[], preferredIds: string[] | undefined | null) {
  const propertyIds = properties.map((property) => property.id);
  const seen = new Set<string>();
  const orderedIds: string[] = [];

  for (const propertyId of preferredIds ?? []) {
    if (!propertyIds.includes(propertyId) || seen.has(propertyId)) {
      continue;
    }

    seen.add(propertyId);
    orderedIds.push(propertyId);
  }

  for (const propertyId of propertyIds) {
    if (seen.has(propertyId)) {
      continue;
    }

    seen.add(propertyId);
    orderedIds.push(propertyId);
  }

  return orderedIds;
}

function orderProperties(properties: PropertySchema[], orderedIds: string[]) {
  const propertiesById = new Map(properties.map((property) => [property.id, property]));

  return orderedIds
    .map((propertyId) => propertiesById.get(propertyId) ?? null)
    .filter((property): property is PropertySchema => property !== null);
}

function getNormalizedIdValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  const nextValue = Math.floor(numericValue);
  return nextValue >= 1 ? nextValue : null;
}

function assignIdValuesToExistingRows(
  rows: DatabaseRowRecord[],
  nextProperties: PropertySchema[],
  previousProperties: PropertySchema[]
) {
  const previousById = new Map(previousProperties.map((property) => [property.id, property]));
  const propertyById = new Map(nextProperties.map((property) => [property.id, property]));
  const hydratedRows = rows.map((row) => ({
    ...row,
    data: cloneDatabaseValue(row.data ?? {}),
  }));
  const rowUpdatesById = new Map<string, { rowId: Id<"rows">; data: Record<string, unknown> }>();
  let hydratedProperties = [...nextProperties];

  for (const property of nextProperties) {
    if (property.type !== "id") {
      continue;
    }

    const previousProperty = previousById.get(property.id);
    const isNewIdProperty = previousProperty?.type !== "id";
    let nextIdValue = Math.max(1, getNormalizedIdValue(property.config?.nextId) ?? 1);

    if (isNewIdProperty) {
      nextIdValue = 1;

      hydratedRows.forEach((row) => {
        if (row.data[property.id] !== nextIdValue) {
          row.data[property.id] = nextIdValue;
          rowUpdatesById.set(String(row._id), {
            rowId: row._id,
            data: row.data,
          });
        }

        nextIdValue += 1;
      });
    } else {
      let maxAssignedValue = 0;

      hydratedRows.forEach((row) => {
        const currentIdValue = getNormalizedIdValue(row.data[property.id]);
        if (currentIdValue !== null) {
          maxAssignedValue = Math.max(maxAssignedValue, currentIdValue);
        }
      });

      nextIdValue = Math.max(nextIdValue, maxAssignedValue + 1);

      hydratedRows.forEach((row) => {
        const currentIdValue = getNormalizedIdValue(row.data[property.id]);
        if (currentIdValue !== null) {
          return;
        }

        row.data[property.id] = nextIdValue;
        rowUpdatesById.set(String(row._id), {
          rowId: row._id,
          data: row.data,
        });
        nextIdValue += 1;
      });
    }

    const currentProperty = propertyById.get(property.id);
    if (!currentProperty) {
      continue;
    }

    const currentNextId = getNormalizedIdValue(currentProperty.config?.nextId) ?? 1;
    if (currentNextId !== nextIdValue) {
      hydratedProperties = hydratedProperties.map((candidate) =>
        candidate.id === property.id ? updateProperty(candidate, { config: { nextId: nextIdValue } }) : candidate
      );
    }
  }

  return {
    properties: hydratedProperties,
    rows: hydratedRows,
    rowUpdates: Array.from(rowUpdatesById.values()),
  };
}

function allocateIdValuesForNewRow(
  properties: PropertySchema[],
  initialData: Record<string, unknown>
) {
  let nextData = cloneDatabaseValue(initialData) ?? {};
  let nextProperties = [...properties];

  for (const property of properties) {
    if (property.type !== "id") {
      continue;
    }

    const nextIdValue = Math.max(1, getNormalizedIdValue(property.config?.nextId) ?? 1);
    nextData = {
      ...nextData,
      [property.id]: nextIdValue,
    };
    nextProperties = nextProperties.map((candidate) =>
      candidate.id === property.id ? updateProperty(candidate, { config: { nextId: nextIdValue + 1 } }) : candidate
    );
  }

  return {
    data: nextData,
    properties: nextProperties,
  };
}

function ToolbarIconButton({
  active,
  count,
  label,
  onClick,
  children,
  className,
  disabled,
}: {
  active?: boolean;
  count?: number;
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
        active
          ? "border-sky-500/30 bg-sky-500/14 text-sky-100"
          : "border-white/8 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-white",
        disabled && "cursor-not-allowed border-white/6 bg-white/[0.02] text-zinc-700 hover:bg-white/[0.02] hover:text-zinc-700",
        className
      )}
    >
      {children}
      {count && count > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full border border-sky-400/25 bg-sky-500 px-1.5 text-center text-[10px] font-semibold leading-5 text-white shadow-[0_6px_14px_rgba(14,165,233,0.28)]">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function ActiveControlChip({
  label,
  onClick,
  onRemove,
  tone = "neutral",
  removable = true,
  icon,
}: {
  label: string;
  onClick?: () => void;
  onRemove?: () => void;
  tone?: "neutral" | "accent" | "muted";
  removable?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border text-xs transition-colors",
        tone === "accent" && "border-sky-500/25 bg-sky-500/14 text-sky-100",
        tone === "neutral" && "border-white/10 bg-white/[0.05] text-zinc-300",
        tone === "muted" && "border-white/8 bg-white/[0.03] text-zinc-400"
      )}
    >
      <button
        type="button"
        onClick={onClick ?? onRemove}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors hover:text-white"
      >
        {icon}
        <span className="truncate">{label}</span>
      </button>
      {removable && onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="pr-2 text-zinc-500 transition-colors hover:text-white"
          aria-label={`Remove ${label}`}
          title={`Remove ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}

export function DatabaseView({ page }: DatabaseViewProps) {
  const { currentWorkspace } = useResolvedWorkspace();
  const [viewType, setViewType] = useState<ViewType>("table");
  const [title, setTitle] = useState(page.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortsOpen, setSortsOpen] = useState(false);
  const [groupByOpen, setGroupByOpen] = useState(false);
  const [filterGroup, setFilterGroup] = useState<FilterGroup>({
    operator: "and",
    conditions: [],
  });
  const [savedFilterGroup, setSavedFilterGroup] = useState<FilterGroup>({
    operator: "and",
    conditions: [],
  });
  const [savedSortRules, setSavedSortRules] = useState<SortRule[]>([]);
  const [sortRules, setSortRules] = useState<SortRule[]>([]);
  const [boardGroupByPropertyId, setBoardGroupByPropertyId] = useState<string | null>(null);
  const [orderedPropertyIds, setOrderedPropertyIds] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<DatabaseHistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<DatabaseHistoryEntry[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [formulaNow, setFormulaNow] = useState(() => Date.now());
  const [viewStateHydrated, setViewStateHydrated] = useState(false);
  const ensuringDefaultViewDatabaseIdRef = useRef<string | null>(null);
  const canEditWorkspace = (currentWorkspace?.role ?? "owner") !== "viewer";

  const updatePage = useMutation(api.pages.update);
  const addRowMutation = useMutation(api.databases.addRow);
  const updateRowMutation = useMutation(api.databases.updateRow);
  const deleteRowMutation = useMutation(api.databases.deleteRow);
  const updatePropertiesMutation = useMutation(api.databases.updateProperties);
  const replaceRowsMutation = useMutation(api.databases.replaceRows);
  const ensureDefaultViewMutation = useMutation(api.databases.ensureDefaultView);
  const updateViewMutation = useMutation(api.databases.updateView);

  const database = useQuery(api.databases.getByPage, { pageId: page._id });
  const views = useQuery(
    api.databases.listViews,
    database ? { databaseId: database._id } : "skip"
  );
  const rows = useQuery(
    api.databases.listRows,
    database ? { databaseId: database._id } : "skip"
  );
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const properties = useMemo(
    () => (database ? normalizeProperties(database.properties ?? []) : []),
    [database]
  );
  const activeView = useMemo(() => {
    if (!database || views === undefined) {
      return null;
    }

    if (views.length === 0) {
      return null;
    }

    if (database.defaultViewId) {
      const defaultView = views.find((view) => view._id === database.defaultViewId);
      if (defaultView) {
        return defaultView;
      }
    }

    return views[0] ?? null;
  }, [database, views]);
  const orderedProperties = useMemo(() => {
    const nextOrderedIds = getOrderedPropertyIds(properties, orderedPropertyIds);
    return orderProperties(properties, nextOrderedIds);
  }, [orderedPropertyIds, properties]);
  const selectProperties = orderedProperties.filter((property) => property.type === "select");
  const visibleRows = useMemo(() => {
    if (rows === undefined) return undefined;

    return filterAndSortRows(rows, properties, {
      searchQuery: deferredSearchQuery,
      filters: filterGroup,
      sorts: sortRules,
      now: formulaNow,
    });
  }, [deferredSearchQuery, filterGroup, formulaNow, properties, rows, sortRules]);

  useEffect(() => {
    const interval = window.setInterval(() => setFormulaNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setTitle(page.title);
  }, [page.title]);

  useEffect(() => {
    if (!database || views === undefined) {
      return;
    }

    const shouldEnsureDefaultView =
      views.length === 0 ||
      !database.defaultViewId ||
      !views.some((view) => view._id === database.defaultViewId);

    if (!shouldEnsureDefaultView) {
      return;
    }

    const databaseId = String(database._id);
    if (ensuringDefaultViewDatabaseIdRef.current === databaseId) {
      return;
    }

    ensuringDefaultViewDatabaseIdRef.current = databaseId;
    void ensureDefaultViewMutation({ databaseId: database._id })
      .catch((error) => {
        console.error(error);
        toast.error("Could not prepare the saved database view.");
      })
      .finally(() => {
        if (ensuringDefaultViewDatabaseIdRef.current === databaseId) {
          ensuringDefaultViewDatabaseIdRef.current = null;
        }
      });
  }, [database, ensureDefaultViewMutation, views]);

  useEffect(() => {
    const emptyFilterGroup: FilterGroup = {
      operator: "and",
      conditions: [],
    };

    setFilterGroup(emptyFilterGroup);
    setSavedFilterGroup(emptyFilterGroup);
    setSavedSortRules([]);
    setSortRules([]);
    setSearchQuery("");
    setSearchOpen(false);
    setFiltersOpen(false);
    setSortsOpen(false);
    setGroupByOpen(false);
    setBoardGroupByPropertyId(null);
    setOrderedPropertyIds([]);
    setUndoStack([]);
    setRedoStack([]);
    setViewStateHydrated(false);
  }, [database?._id]);

  useEffect(() => {
    if (views === undefined) {
      return;
    }

    const emptyFilterGroup: FilterGroup = {
      operator: "and",
      conditions: [],
    };

    if (!activeView) {
      if (!viewStateHydrated) {
        const defaultPropertyOrder = getOrderedPropertyIds(properties, properties.map((property) => property.id));
        setViewType("table");
        setFilterGroup(emptyFilterGroup);
        setSavedFilterGroup(emptyFilterGroup);
        setSortRules([]);
        setSavedSortRules([]);
        setBoardGroupByPropertyId(null);
        setOrderedPropertyIds(defaultPropertyOrder);
      }
      return;
    }

    const nextFilterGroup = sanitizeFilterGroup(
      (activeView.filters as FilterGroup | null | undefined) ?? emptyFilterGroup,
      properties
    );
    const nextSortRules = sanitizeSortRules(
      Array.isArray(activeView.sorts) ? (activeView.sorts as SortRule[]) : [],
      properties
    );
    const nextViewType =
      activeView.type === "board" || activeView.type === "list" ? activeView.type : "table";
    const nextGroupByPropertyId =
      activeView.groupBy && properties.some((property) => property.id === activeView.groupBy)
        ? activeView.groupBy
        : null;
    const nextOrderedPropertyIds = getOrderedPropertyIds(properties, activeView.visibleProperties ?? []);

    setViewType(nextViewType);
    setFilterGroup(cloneFilterGroup(nextFilterGroup));
    setSavedFilterGroup(cloneFilterGroup(nextFilterGroup));
    setSortRules(cloneSortRules(nextSortRules));
    setSavedSortRules(cloneSortRules(nextSortRules));
    setBoardGroupByPropertyId(nextGroupByPropertyId);
    setOrderedPropertyIds(nextOrderedPropertyIds);
    setViewStateHydrated(true);
  }, [activeView?._id, properties, viewStateHydrated, views]);

  useEffect(() => {
    setFilterGroup((current) => {
      const next = sanitizeFilterGroup(current, properties);
      return areFilterGroupsEqual(current, next) ? current : next;
    });
  }, [properties]);

  useEffect(() => {
    setSavedFilterGroup((current) => {
      const next = sanitizeFilterGroup(current, properties);
      return areFilterGroupsEqual(current, next) ? current : next;
    });
  }, [properties]);

  useEffect(() => {
    setSortRules((current) => {
      const next = sanitizeSortRules(current, properties);
      return areSortRulesEqual(current, next) ? current : next;
    });
  }, [properties]);

  useEffect(() => {
    setSavedSortRules((current) => {
      const next = sanitizeSortRules(current, properties);
      return areSortRulesEqual(current, next) ? current : next;
    });
  }, [properties]);

  useEffect(() => {
    setOrderedPropertyIds((current) => {
      const preferredIds = current.length > 0 ? current : properties.map((property) => property.id);
      const next = getOrderedPropertyIds(properties, preferredIds);
      return areStringArraysEqual(current, next) ? current : next;
    });
  }, [properties]);

  useEffect(() => {
    if (selectProperties.length === 0) {
      if (boardGroupByPropertyId !== null) {
        setBoardGroupByPropertyId(null);
      }
      return;
    }

    const nextGroupByPropertyId = selectProperties[0].id;

    if (
      !boardGroupByPropertyId ||
      !selectProperties.some((property) => property.id === boardGroupByPropertyId)
    ) {
      if (boardGroupByPropertyId !== nextGroupByPropertyId) {
        setBoardGroupByPropertyId(nextGroupByPropertyId);
      }
    }
  }, [boardGroupByPropertyId, selectProperties]);

  useEffect(() => {
    if (viewType !== "board" && groupByOpen) {
      setGroupByOpen(false);
    }
  }, [groupByOpen, viewType]);

  const createSnapshot = useCallback(
    (
      sourceRows:
        | Array<{
            _creationTime: number;
            data?: Record<string, unknown>;
            sortOrder: number;
            pageId?: Id<"pages"> | null;
            isArchived?: boolean;
          }>
        | undefined = rows,
      sourceProperties = properties
    ): DatabaseSnapshot | null => {
      if (sourceRows === undefined) {
        return null;
      }

      return {
        properties: cloneDatabaseValue(normalizeProperties(sourceProperties)),
        rows: sourceRows.map((row: any) => ({
          data: createSnapshotRowData(row.data, sourceProperties, row._creationTime),
          sortOrder: row.sortOrder,
          pageId: row.pageId ?? null,
          isArchived: row.isArchived ?? false,
        })),
      };
    },
    [properties, rows]
  );

  const applySnapshot = useCallback(
    async (snapshot: DatabaseSnapshot) => {
      if (!database) return;

      await updatePropertiesMutation({
        id: database._id,
        properties: snapshot.properties,
      });

      await replaceRowsMutation({
        databaseId: database._id,
        rows: snapshot.rows.map((row) => ({
          data: row.data,
          sortOrder: row.sortOrder,
          pageId: row.pageId ?? null,
          isArchived: row.isArchived ?? false,
        })),
      });
    },
    [database, replaceRowsMutation, updatePropertiesMutation]
  );

  const pushHistoryEntry = useCallback((entry: DatabaseHistoryEntry) => {
    setUndoStack((current) => appendHistoryEntry(current, entry));
    setRedoStack([]);
  }, []);

  const handleTitleSave = async () => {
    setEditingTitle(false);
    if (!canEditWorkspace) {
      setTitle(page.title);
      return;
    }

    if (title !== page.title) {
      await updatePage({ id: page._id, title });
    }
  };

  const handleAddRow = useCallback(
    async (initialData?: Record<string, unknown>) => {
      if (!canEditWorkspace) return;
      if (!database || rows === undefined) return;

      const before = createSnapshot();
      if (!before) return;

      const baseData = {
        ...buildInitialRowData(properties, formulaNow),
        ...(cloneDatabaseValue(initialData) ?? {}),
      };
      const { data: nextData, properties: nextProperties } = allocateIdValuesForNewRow(
        properties,
        baseData
      );
      const didAdvanceIdCounters = properties.some(
        (property, index) => nextProperties[index] !== property
      );
      const nextSortOrder = before.rows.reduce(
        (max, row) => Math.max(max, row.sortOrder),
        0
      ) + 1000;

      await addRowMutation({
        databaseId: database._id,
        data: nextData,
      });

      if (didAdvanceIdCounters) {
        await updatePropertiesMutation({
          id: database._id,
          properties: nextProperties,
        });
      }

      const after = createSnapshot(
        [
          ...rows,
          {
            _creationTime: formulaNow,
            pageId: null,
            data: nextData,
            sortOrder: nextSortOrder,
            isArchived: false,
          },
        ],
        nextProperties
      );

      if (after) {
        pushHistoryEntry({
          before,
          after,
          label: "Add row",
        });
      }
    },
    [
      addRowMutation,
      createSnapshot,
      canEditWorkspace,
      database,
      formulaNow,
      properties,
      pushHistoryEntry,
      rows,
      updatePropertiesMutation,
    ]
  );

  const handleUpdateRow = useCallback(
    async (rowId: Id<"rows">, data: Record<string, unknown>) => {
      if (!canEditWorkspace) return;
      if (rows === undefined) return;

      const before = createSnapshot();
      if (!before) return;

      const nextData = cloneDatabaseValue(data) ?? {};
      await updateRowMutation({
        id: rowId,
        data: nextData,
      });

      const after = createSnapshot(
        rows.map((row: any) =>
          row._id === rowId
            ? {
                ...row,
                data: nextData,
              }
            : row
        ),
        properties
      );

      if (after) {
        pushHistoryEntry({
          before,
          after,
          label: "Update row",
        });
      }
    },
    [canEditWorkspace, createSnapshot, properties, pushHistoryEntry, rows, updateRowMutation]
  );

  const handleDeleteRow = useCallback(
    async (rowId: Id<"rows">) => {
      if (!canEditWorkspace) return;
      if (rows === undefined) return;

      const before = createSnapshot();
      if (!before) return;

      await deleteRowMutation({ id: rowId });

      const after = createSnapshot(
        rows.filter((row: any) => row._id !== rowId),
        properties
      );

      if (after) {
        pushHistoryEntry({
          before,
          after,
          label: "Delete row",
        });
      }
    },
    [canEditWorkspace, createSnapshot, deleteRowMutation, properties, pushHistoryEntry, rows]
  );

  const handleBatchUpdateRows = useCallback(
    async (updates: Array<{ rowId: Id<"rows">; data: Record<string, unknown> }>) => {
      if (!canEditWorkspace) return;
      if (rows === undefined || updates.length === 0) return;

      const before = createSnapshot();
      if (!before) return;

      const normalizedUpdates = updates.map((update) => ({
        rowId: update.rowId,
        data: cloneDatabaseValue(update.data) ?? {},
      }));
      const updatesById = new Map(
        normalizedUpdates.map((update) => [String(update.rowId), update.data])
      );

      await Promise.all(
        normalizedUpdates.map((update) =>
          updateRowMutation({
            id: update.rowId,
            data: update.data,
          })
        )
      );

      const after = createSnapshot(
        rows.map((row: any) =>
          updatesById.has(String(row._id))
            ? {
                ...row,
                data: updatesById.get(String(row._id)),
              }
            : row
        ),
        properties
      );

      if (after) {
        pushHistoryEntry({
          before,
          after,
          label: normalizedUpdates.length === 1 ? "Update row" : "Update selected rows",
        });
      }
    },
    [canEditWorkspace, createSnapshot, properties, pushHistoryEntry, rows, updateRowMutation]
  );

  const handleBatchDeleteRows = useCallback(
    async (rowIds: Id<"rows">[]) => {
      if (!canEditWorkspace) return;
      if (rows === undefined || rowIds.length === 0) return;

      const before = createSnapshot();
      if (!before) return;

      const rowIdSet = new Set(rowIds.map((rowId) => String(rowId)));
      await Promise.all(
        rowIds.map((rowId) =>
          deleteRowMutation({
            id: rowId,
          })
        )
      );

      const after = createSnapshot(
        rows.filter((row: any) => !rowIdSet.has(String(row._id))),
        properties
      );

      if (after) {
        pushHistoryEntry({
          before,
          after,
          label: rowIds.length === 1 ? "Delete row" : "Delete selected rows",
        });
      }
    },
    [canEditWorkspace, createSnapshot, deleteRowMutation, properties, pushHistoryEntry, rows]
  );

  const handleUpdateProperties = useCallback(
    async (updater: (current: PropertySchema[]) => PropertySchema[]) => {
      if (!canEditWorkspace) return;
      if (!database || rows === undefined) return;

      const before = createSnapshot();
      if (!before) return;

      const baseNextProperties = normalizeProperties(updater(properties));
      const syncedState = assignIdValuesToExistingRows(
        rows as DatabaseRowRecord[],
        baseNextProperties,
        properties
      );
      const nextProperties = syncedState.properties;
      await updatePropertiesMutation({
        id: database._id,
        properties: nextProperties,
      });

      if (syncedState.rowUpdates.length > 0) {
        await Promise.all(
          syncedState.rowUpdates.map((rowUpdate) =>
            updateRowMutation({
              id: rowUpdate.rowId,
              data: rowUpdate.data,
            })
          )
        );
      }

      const after = createSnapshot(syncedState.rows, nextProperties);

      if (after) {
        pushHistoryEntry({
          before,
          after,
          label: "Update properties",
        });
      }
    },
    [
      createSnapshot,
      canEditWorkspace,
      database,
      properties,
      pushHistoryEntry,
      rows,
      updatePropertiesMutation,
      updateRowMutation,
    ]
  );

  const persistView = useCallback(
    async (
      updates: Partial<{
        type: ViewType;
        filters: FilterGroup | null;
        sorts: SortRule[];
        groupBy: string | null;
        visibleProperties: string[];
      }>
    ) => {
      if (!activeView || !canEditWorkspace) {
        return;
      }

      await updateViewMutation({
        id: activeView._id,
        ...(updates.type !== undefined ? { type: updates.type } : {}),
        ...(updates.filters !== undefined ? { filters: updates.filters } : {}),
        ...(updates.sorts !== undefined ? { sorts: updates.sorts } : {}),
        ...(updates.groupBy !== undefined ? { groupBy: updates.groupBy } : {}),
        ...(updates.visibleProperties !== undefined
          ? { visibleProperties: updates.visibleProperties }
          : {}),
      });
    },
    [activeView, canEditWorkspace, updateViewMutation]
  );

  const handleViewTypeChange = useCallback(
    async (nextViewType: ViewType) => {
      if (nextViewType === viewType) {
        return;
      }

      setViewType(nextViewType);

      try {
        await persistView({ type: nextViewType });
      } catch (error) {
        console.error(error);
        toast.error("Could not save the selected view.");
      }
    },
    [persistView, viewType]
  );

  const handleBoardGroupByChange = useCallback(
    async (propertyId: string | null) => {
      setBoardGroupByPropertyId(propertyId);

      try {
        await persistView({ groupBy: propertyId });
      } catch (error) {
        console.error(error);
        toast.error("Could not save the board grouping.");
      }
    },
    [persistView]
  );

  const handleMoveProperty = useCallback(
    async (propertyId: string, direction: "left" | "right") => {
      const sourcePropertyIds = getOrderedPropertyIds(properties, orderedPropertyIds);
      const sourceIndex = sourcePropertyIds.indexOf(propertyId);
      if (sourceIndex === -1) {
        return;
      }

      const targetIndex = direction === "left" ? sourceIndex - 1 : sourceIndex + 1;
      if (targetIndex < 0 || targetIndex >= sourcePropertyIds.length) {
        return;
      }

      const nextPropertyIds = [...sourcePropertyIds];
      const [movedPropertyId] = nextPropertyIds.splice(sourceIndex, 1);
      nextPropertyIds.splice(targetIndex, 0, movedPropertyId);

      setOrderedPropertyIds(nextPropertyIds);

      try {
        await persistView({ visibleProperties: nextPropertyIds });
      } catch (error) {
        console.error(error);
        toast.error("Could not save the column order.");
      }
    },
    [orderedPropertyIds, persistView, properties]
  );

  const handleQuickAddRow = async () => {
    if (!canEditWorkspace) return;
    setQuickAddLoading(true);
    try {
      await handleAddRow();
    } finally {
      setQuickAddLoading(false);
    }
  };

  const handleUndo = useCallback(async () => {
    if (!canEditWorkspace) return;
    const entry = undoStack[undoStack.length - 1];
    if (!entry || historyBusy) return;

    setHistoryBusy(true);
    try {
      await applySnapshot(entry.before);
      setUndoStack((current) => current.slice(0, -1));
      setRedoStack((current) => appendHistoryEntry(current, entry));
    } catch (error) {
      console.error(error);
      toast.error(`Could not undo ${entry.label.toLowerCase()}.`);
    } finally {
      setHistoryBusy(false);
    }
  }, [applySnapshot, canEditWorkspace, historyBusy, undoStack]);

  const handleRedo = useCallback(async () => {
    if (!canEditWorkspace) return;
    const entry = redoStack[redoStack.length - 1];
    if (!entry || historyBusy) return;

    setHistoryBusy(true);
    try {
      await applySnapshot(entry.after);
      setRedoStack((current) => current.slice(0, -1));
      setUndoStack((current) => appendHistoryEntry(current, entry));
    } catch (error) {
      console.error(error);
      toast.error(`Could not redo ${entry.label.toLowerCase()}.`);
    } finally {
      setHistoryBusy(false);
    }
  }, [applySnapshot, canEditWorkspace, historyBusy, redoStack]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "z" && event.shiftKey) {
        event.preventDefault();
        void handleRedo();
        return;
      }

      if (key === "z") {
        event.preventDefault();
        void handleUndo();
        return;
      }

      if (key === "y") {
        event.preventDefault();
        void handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRedo, handleUndo]);

  const viewTabs: { id: ViewType; label: string; icon: ReactNode }[] = [
    { id: "table", label: "Table", icon: <Table className="h-3.5 w-3.5" /> },
    { id: "board", label: "Board", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: "list", label: "List", icon: <LayoutList className="h-3.5 w-3.5" /> },
  ];

  const activeFilters = useMemo(
    () =>
      filterGroup.conditions
        .map((condition, index) => ({ condition, index }))
        .filter(({ condition }) => isFilterConditionActive(condition, properties)),
    [filterGroup.conditions, properties]
  );
  const activeSorts = useMemo(
    () =>
      sortRules
        .map((rule, index) => ({ rule, index }))
        .filter(({ rule }) => properties.some((property) => property.id === rule.propertyId)),
    [properties, sortRules]
  );
  const hasPendingFilterChanges = useMemo(
    () => !areFilterGroupsEqual(filterGroup, savedFilterGroup),
    [filterGroup, savedFilterGroup]
  );
  const hasPendingSortChanges = useMemo(
    () => !areSortRulesEqual(sortRules, savedSortRules),
    [savedSortRules, sortRules]
  );

  const clearFilterConditions = () => {
    setFilterGroup((current) =>
      current.conditions.length === 0 ? current : { ...current, conditions: [] }
    );
  };

  const clearSortRules = () => {
    setSortRules((current) => (current.length === 0 ? current : []));
  };

  const clearControls = () => {
    setSearchOpen(false);
    setSearchQuery("");
    clearFilterConditions();
    clearSortRules();
  };

  const updateQuickFilterGroup = (updater: (current: FilterGroup) => FilterGroup) => {
    setFilterGroup((current) => updater(current));
  };
  const updateQuickSortRules = (updater: (current: SortRule[]) => SortRule[]) => {
    setSortRules((current) => updater(current));
  };

  const handleResetFilters = () => {
    const nextFilterGroup = cloneFilterGroup(savedFilterGroup);
    setFilterGroup(nextFilterGroup);
    setFiltersOpen(nextFilterGroup.conditions.length > 0);
    toast.success(
      nextFilterGroup.conditions.length > 0
        ? "Filters reset to the saved view."
        : "Quick filters cleared."
    );
  };

  const handleSaveFilters = async () => {
    if (!canEditWorkspace) return;
    const nextFilterGroup = getPersistableFilterGroup(filterGroup, properties);
    setFilterGroup(nextFilterGroup);
    setSavedFilterGroup(cloneFilterGroup(nextFilterGroup));
    setFiltersOpen(nextFilterGroup.conditions.length > 0);

    try {
      await persistView({ filters: nextFilterGroup });
      toast.success(
        nextFilterGroup.conditions.length > 0
          ? "Quick filters saved for this view."
          : "Filter changes saved for this view."
      );
    } catch (error) {
      console.error(error);
      toast.error("Could not save the filters for this view.");
    }
  };
  const handleResetSorts = () => {
    const nextSortRules = cloneSortRules(savedSortRules);
    setSortRules(nextSortRules);
    setSortsOpen(nextSortRules.length > 0);
    toast.success(
      nextSortRules.length > 0
        ? "Sorts reset to the saved view."
        : "Quick sorts cleared."
    );
  };
  const handleSaveSorts = async () => {
    if (!canEditWorkspace) return;
    const nextSortRules = cloneSortRules(sanitizeSortRules(sortRules, properties));
    setSortRules(nextSortRules);
    setSavedSortRules(cloneSortRules(nextSortRules));
    setSortsOpen(nextSortRules.length > 0);

    try {
      await persistView({ sorts: nextSortRules });
      toast.success(
        nextSortRules.length > 0
          ? "Quick sorts saved for this view."
          : "Sort changes saved for this view."
      );
    } catch (error) {
      console.error(error);
      toast.error("Could not save the sorts for this view.");
    }
  };

  const hasActiveControls = Boolean(
    searchQuery.trim() ||
      activeFilters.length ||
      activeSorts.length ||
      hasPendingFilterChanges ||
      hasPendingSortChanges
  );
  const activeBoardGroupProperty =
    viewType === "board"
      ? selectProperties.find((property) => property.id === boardGroupByPropertyId) ?? selectProperties[0] ?? null
      : null;
  const activePanel: "group" | null = groupByOpen ? "group" : null;
  const showSearchInput = searchOpen || Boolean(searchQuery.trim());

  const toggleSearchPanel = () => {
    setSearchOpen((current) => {
      const next = !current;
      if (next) {
        setFiltersOpen(false);
        setSortsOpen(false);
        setGroupByOpen(false);
      }
      return next;
    });
  };

  const toggleFiltersPanel = () => {
    setFiltersOpen((current) => {
      const next = current ? filterGroup.conditions.length > 0 || hasPendingFilterChanges : true;
      if (next) {
        setSearchOpen(false);
        setSortsOpen(false);
        setGroupByOpen(false);
      }
      return next;
    });
  };

  const toggleSortsPanel = () => {
    setSortsOpen((current) => {
      const next = current ? sortRules.length > 0 || hasPendingSortChanges : true;
      if (next) {
        setSearchOpen(false);
        setFiltersOpen(false);
        setGroupByOpen(false);
      }
      return next;
    });
  };

  const openGroupByPanel = () => {
    setGroupByOpen(true);
    setSearchOpen(false);
    setFiltersOpen(false);
    setSortsOpen(false);
  };

  const toggleGroupByPanel = () => {
    setGroupByOpen((current) => {
      const next = !current;
      if (next) {
        setSearchOpen(false);
        setFiltersOpen(false);
        setSortsOpen(false);
      }
      return next;
    });
  };

  const renderToolbarPanel = () => {
    if (activePanel === "group") {
      return (
        <div className="w-full max-w-[620px] rounded-[18px] border border-white/8 bg-[#12110f]/95 p-3 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          {selectProperties.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-400">
              Add a Select property to enable board grouping.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {selectProperties.map((property) => {
                const isActive = property.id === activeBoardGroupProperty?.id;

                return (
                  <button
                    key={property.id}
                    type="button"
                    onClick={() => {
                      void handleBoardGroupByChange(property.id);
                    }}
                    className={cn(
                      "rounded-[18px] border px-4 py-3 text-left transition-colors",
                      isActive
                        ? "border-sky-500/30 bg-sky-500/12 text-sky-100"
                        : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    <div className="text-sm font-medium">{property.name}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {property.config?.options?.length ?? 0} column
                      {(property.config?.options?.length ?? 0) === 1 ? "" : "s"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="database-page min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,#151412_0%,#0f0e0d_100%)] text-zinc-100">
      <WorkspaceTopBar
        className="border-white/8 bg-[#0f0e0d]/80"
        breadcrumbContent={
          <PageBreadcrumb
            pageId={page._id}
            pageTitle={title}
            pageIcon={page.icon}
          />
        }
      />

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
              className={cn(
                "mb-4 text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-white transition-opacity",
                canEditWorkspace ? "cursor-text hover:opacity-80" : "cursor-default"
              )}
              onClick={() => {
                if (!canEditWorkspace) return;
                setEditingTitle(true);
              }}
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
              <div className="flex items-center gap-1 rounded-xl border border-white/8 bg-white/[0.02] p-1">
                {viewTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      void handleViewTypeChange(tab.id);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] leading-none transition-colors",
                      viewType === tab.id
                        ? "bg-white text-black"
                        : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    )}
                    title={`${tab.label} view`}
                    aria-label={`${tab.label} view`}
                  >
                    <span className="flex h-4 w-4 items-center justify-center">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                {!canEditWorkspace ? (
                  <span className="mr-1 inline-flex h-9 items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
                    View only
                  </span>
                ) : null}
                <ToolbarIconButton
                  active={filtersOpen || activeFilters.length > 0 || hasPendingFilterChanges}
                  count={activeFilters.length}
                  label="Filter rows"
                  onClick={toggleFiltersPanel}
                  disabled={!database}
                >
                  <Filter className="h-4 w-4" />
                </ToolbarIconButton>
                <ToolbarIconButton
                  active={sortsOpen || activeSorts.length > 0 || hasPendingSortChanges}
                  count={activeSorts.length}
                  label="Sort rows"
                  onClick={toggleSortsPanel}
                  disabled={!database}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </ToolbarIconButton>
                <ToolbarIconButton
                  active={showSearchInput}
                  label="Search rows"
                  onClick={toggleSearchPanel}
                  disabled={!database}
                >
                  <Search className="h-4 w-4" />
                </ToolbarIconButton>
                {showSearchInput && (
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Type to search..."
                    autoFocus={searchOpen && !searchQuery.trim()}
                    className="h-9 w-[180px] rounded-xl border-white/8 bg-white/[0.03] text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-white/15 md:w-[240px]"
                  />
                )}
                {viewType === "board" && (
                  <ToolbarIconButton
                    active={groupByOpen || Boolean(activeBoardGroupProperty)}
                    label="Group board columns"
                    onClick={toggleGroupByPanel}
                    disabled={!database || selectProperties.length === 0}
                  >
                    <Rows3 className="h-4 w-4" />
                  </ToolbarIconButton>
                )}
                {hasActiveControls && (
                  <ToolbarIconButton
                    label="Clear search, filters, and sorts"
                    onClick={clearControls}
                    className="text-zinc-500 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </ToolbarIconButton>
                )}

                <div className="mx-1 h-8 w-px bg-white/8" />

                <ReminderTriggerButton
                  workspaceId={page.workspaceId}
                  iconOnly
                  label="Create reminder for this database"
                  title="Create reminder for this database"
                  className="h-9 w-9 rounded-xl border border-white/8 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                  initialValues={{
                    title: page.title ? `Review ${page.title}` : "Review database",
                    pageId: page._id,
                    databaseId: database?._id ?? null,
                    sourceLabel: page.title || "Database",
                    sourceUrl: `/workspace/${page._id}`,
                  }}
                />

                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleQuickAddRow()}
                  disabled={!database || quickAddLoading || !canEditWorkspace}
                  className="h-9 gap-1.5 rounded-xl bg-white px-3 text-[13px] font-medium text-black hover:bg-zinc-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {quickAddLoading ? "Adding..." : "New row"}
                </Button>
              </div>
            </div>

            <DatabaseQuickFilterBar
              className="mt-2"
              properties={properties}
              filterGroup={filterGroup}
              open={filtersOpen}
              hasPendingChanges={canEditWorkspace ? hasPendingFilterChanges : false}
              onOpenChange={setFiltersOpen}
              onChange={updateQuickFilterGroup}
              onReset={handleResetFilters}
              onSave={() => {
                void handleSaveFilters();
              }}
            />

            <DatabaseQuickSortBar
              className="mt-2"
              properties={properties}
              sortRules={sortRules}
              open={sortsOpen}
              hasPendingChanges={canEditWorkspace ? hasPendingSortChanges : false}
              onOpenChange={setSortsOpen}
              onChange={updateQuickSortRules}
              onReset={handleResetSorts}
              onSave={() => {
                void handleSaveSorts();
              }}
            />

            {activeBoardGroupProperty && (
              <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
                <ActiveControlChip
                  tone="muted"
                  label={`Group: ${activeBoardGroupProperty.name}`}
                  onClick={openGroupByPanel}
                  removable={false}
                  icon={<Rows3 className="h-3 w-3 text-zinc-500" />}
                />
              </div>
            )}

            {activePanel && (
              <div className="mt-2 px-1">
                {renderToolbarPanel()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 pb-14 md:px-10">
        <div className="mx-auto max-w-[1440px]">
          {database === undefined ? (
            <div className="py-8 text-sm text-zinc-500">Loading database...</div>
          ) : database === null ? (
            <CreateDatabase pageId={page._id} editable={canEditWorkspace} />
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
                  workspaceId={page.workspaceId}
                  pageId={page._id}
                  databaseId={database._id}
                  databaseName={page.title || database.name}
                  properties={orderedProperties}
                  rows={visibleRows}
                  totalRowCount={rows?.length}
                  now={formulaNow}
                  editable={canEditWorkspace}
                  onAddRow={() => handleAddRow()}
                  onUpdateRow={handleUpdateRow}
                  onBatchUpdateRows={handleBatchUpdateRows}
                  onDeleteRow={handleDeleteRow}
                  onBatchDeleteRows={handleBatchDeleteRows}
                  onUpdateProperties={handleUpdateProperties}
                  onMoveProperty={handleMoveProperty}
                />
              )}
              {viewType === "board" && (
                <BoardView
                  workspaceId={page.workspaceId}
                  pageId={page._id}
                  databaseId={database._id}
                  databaseName={page.title || database.name}
                  properties={orderedProperties}
                  rows={visibleRows}
                  groupByPropertyId={boardGroupByPropertyId}
                  now={formulaNow}
                  editable={canEditWorkspace}
                  onAddRow={handleAddRow}
                  onUpdateRow={handleUpdateRow}
                />
              )}
              {viewType === "list" && (
                <ListView
                  workspaceId={page.workspaceId}
                  pageId={page._id}
                  databaseId={database._id}
                  databaseName={page.title || database.name}
                  properties={orderedProperties}
                  rows={visibleRows}
                  now={formulaNow}
                  editable={canEditWorkspace}
                  onAddRow={() => handleAddRow()}
                  onUpdateRow={handleUpdateRow}
                  onDeleteRow={handleDeleteRow}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateDatabase({
  pageId,
  editable = true,
}: {
  pageId: Id<"pages">;
  editable?: boolean;
}) {
  const createDatabase = useMutation(api.databases.create);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!editable) return;
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
      {editable ? (
        <Button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating}
          className="rounded-xl bg-white text-black hover:bg-zinc-200"
        >
          <Plus className="mr-2 h-4 w-4" />
          {creating ? "Creating..." : "Initialize Database"}
        </Button>
      ) : (
        <p className="text-sm text-zinc-500">
          You have view-only access to this workspace, so only editors can create the database schema.
        </p>
      )}
    </div>
  );
}
