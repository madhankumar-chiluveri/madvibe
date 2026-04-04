"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Rows3, Trash2 } from "lucide-react";

import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ReminderTriggerButton } from "@/components/reminders/reminder-trigger-button";
import { cn } from "@/lib/utils";
import type { FormulaConfig, PropertySchema, PropertyType, SelectOption } from "@/types/database";
import { DatabaseRowSelectionBar } from "./database-row-selection-bar";
import {
  ACTION_COLUMN_WIDTH,
  MIN_TABLE_WIDTH,
  createProperty,
  getPropertyWidth,
  normalizeValueForProperty,
  updateProperty,
} from "./database-utils";
import { PropertyHeaderMenu } from "./property-header-menu";
import { PropertyCell } from "./property-cell";

const SELECTION_COLUMN_WIDTH = 44;

interface TableViewProps {
  workspaceId: Id<"workspaces">;
  pageId: Id<"pages">;
  databaseId: Id<"databases">;
  databaseName: string;
  properties: PropertySchema[];
  rows: any[] | undefined;
  totalRowCount?: number;
  now?: number;
  editable?: boolean;
  onAddRow: () => Promise<void>;
  onUpdateRow: (rowId: Id<"rows">, data: Record<string, unknown>) => Promise<void>;
  onBatchUpdateRows: (updates: Array<{ rowId: Id<"rows">; data: Record<string, unknown> }>) => Promise<void>;
  onDeleteRow: (rowId: Id<"rows">) => Promise<void>;
  onBatchDeleteRows: (rowIds: Id<"rows">[]) => Promise<void>;
  onUpdateProperties: (updater: (current: PropertySchema[]) => PropertySchema[]) => Promise<void>;
  onMoveProperty: (propertyId: string, direction: "left" | "right") => Promise<void>;
}

export function TableView({
  workspaceId,
  pageId,
  databaseId,
  databaseName,
  properties,
  rows,
  totalRowCount,
  now,
  editable = true,
  onAddRow,
  onUpdateRow,
  onBatchUpdateRows,
  onDeleteRow,
  onBatchDeleteRows,
  onUpdateProperties,
  onMoveProperty,
}: TableViewProps) {
  const [newRowLoading, setNewRowLoading] = useState(false);
  const [newPropertyLoading, setNewPropertyLoading] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const titleProperty = properties.find((property) => property.type === "title");
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const tableMinWidth = useMemo(() => {
    const dataColumnsWidth = properties.reduce(
      (total, property) => total + getPropertyWidth(property),
      0
    );
    return Math.max(
      dataColumnsWidth + ACTION_COLUMN_WIDTH + SELECTION_COLUMN_WIDTH,
      MIN_TABLE_WIDTH + SELECTION_COLUMN_WIDTH
    );
  }, [properties]);

  const frozenState = useMemo(() => {
    let currentOffset = SELECTION_COLUMN_WIDTH;
    const offsets: Record<string, number> = {};
    const frozenIds: string[] = [];

    for (const property of properties) {
      if (!property.config?.frozen) continue;
      offsets[property.id] = currentOffset;
      currentOffset += getPropertyWidth(property);
      frozenIds.push(property.id);
    }

    return {
      offsets,
      lastFrozenId: frozenIds[frozenIds.length - 1] ?? null,
    };
  }, [properties]);

  useEffect(() => {
    if (!rows) {
      return;
    }

    const visibleRowIdSet = new Set(rows.map((row: any) => String(row._id)));
    setSelectedRowIds((current) => {
      const next = new Set(
        Array.from(current).filter((rowId) => visibleRowIdSet.has(rowId))
      );
      return next.size === current.size ? current : next;
    });
  }, [rows]);

  const persistProperties = async (
    updater: (current: PropertySchema[]) => PropertySchema[]
  ) => {
    if (!editable) return;
    await onUpdateProperties(updater);
  };

  const getUniquePropertyName = (type: PropertyType, current: PropertySchema[]) => {
    const baseName = type === "text" ? "Property" : createProperty(type).name;
    const existingNames = new Set(current.map((property) => property.name.toLowerCase()));

    if (!existingNames.has(baseName.toLowerCase())) {
      return baseName;
    }

    let index = 2;
    let candidate = `${baseName} ${index}`;
    while (existingNames.has(candidate.toLowerCase())) {
      index += 1;
      candidate = `${baseName} ${index}`;
    }

    return candidate;
  };

  const insertPropertyAt = async (index: number) => {
    if (!editable) return;
    setNewPropertyLoading(true);
    try {
      await persistProperties((current) => {
        const property = createProperty("text", getUniquePropertyName("text", current));
        return [...current.slice(0, index), property, ...current.slice(index)];
      });
    } finally {
      setNewPropertyLoading(false);
    }
  };

  const handleAddRow = async () => {
    if (!editable) return;
    setNewRowLoading(true);
    try {
      await onAddRow();
    } finally {
      setNewRowLoading(false);
    }
  };

  const handleCellChange = async (rowId: Id<"rows">, property: PropertySchema, value: unknown) => {
    if (!editable) return;
    const row = rows?.find((item: any) => item._id === rowId);
    if (!row) return;

    await onUpdateRow(rowId, {
      ...row.data,
      [property.id]: normalizeValueForProperty(property, value),
    });
  };

  const selectedRows = useMemo(
    () => rows?.filter((row: any) => selectedRowIds.has(String(row._id))) ?? [],
    [rows, selectedRowIds]
  );
  const selectedCount = selectedRows.length;
  const allRowsSelected = Boolean(rows && rows.length > 0 && selectedCount === rows.length);

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }

    selectAllRef.current.indeterminate = selectedCount > 0 && !allRowsSelected;
  }, [allRowsSelected, selectedCount]);

  const toggleRowSelection = (rowId: Id<"rows">, checked: boolean) => {
    if (!editable) return;
    setSelectedRowIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(String(rowId));
      } else {
        next.delete(String(rowId));
      }
      return next;
    });
  };

  const toggleAllVisibleRows = (checked: boolean) => {
    if (!editable) return;
    setSelectedRowIds(() => {
      if (!checked || !rows) {
        return new Set();
      }

      return new Set(rows.map((row: any) => String(row._id)));
    });
  };

  const handleApplyPropertyToSelectedRows = async (property: PropertySchema, value: unknown) => {
    if (!editable) return;
    if (selectedRows.length === 0) {
      return;
    }

    await onBatchUpdateRows(
      selectedRows.map((row: any) => ({
        rowId: row._id,
        data: {
          ...row.data,
          [property.id]: normalizeValueForProperty(property, value),
        },
      }))
    );
  };

  const handleDeleteSelectedRows = async () => {
    if (!editable) return;
    if (selectedRows.length === 0) {
      return;
    }

    await onBatchDeleteRows(selectedRows.map((row: any) => row._id));
    setSelectedRowIds(new Set());
  };

  const rowCount = rows?.length ?? 0;
  const rowCountLabel =
    totalRowCount !== undefined && totalRowCount !== rowCount
      ? `${rowCount} of ${totalRowCount} rows`
      : `${rowCount} rows`;

  return (
    <div className="database-shell overflow-hidden rounded-[24px] border border-white/8 bg-[#12110f] shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
      <div className="border-b border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] px-4 py-3">
        {editable && selectedCount > 0 ? (
          <DatabaseRowSelectionBar
            properties={properties}
            selectedCount={selectedCount}
            onApplyProperty={handleApplyPropertyToSelectedRows}
            onDeleteSelected={handleDeleteSelectedRows}
            onClearSelection={() => setSelectedRowIds(new Set())}
          />
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Rows3 className="h-4 w-4 text-zinc-500" />
              <span>{rowCountLabel}</span>
            </div>

            {editable ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={newPropertyLoading}
                className="rounded-xl border border-white/8 bg-white/[0.03] text-zinc-100 hover:bg-white/[0.08] hover:text-white"
                onClick={() => void insertPropertyAt(properties.length)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {newPropertyLoading ? "Adding..." : "New property"}
              </Button>
            ) : (
              <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                View only
              </span>
            )}
          </div>
        )}
      </div>

      <div className="notion-table-scroll min-h-[420px] w-full overflow-x-auto">
        <table
          className="notion-database-table w-full table-fixed border-collapse text-[13px] text-zinc-100"
          style={{ minWidth: tableMinWidth }}
        >
          <colgroup>
            <col style={{ width: SELECTION_COLUMN_WIDTH }} />
            {properties.map((property) => (
              <col key={property.id} style={{ width: getPropertyWidth(property) }} />
            ))}
            <col style={{ width: ACTION_COLUMN_WIDTH }} />
          </colgroup>

          <thead className="sticky top-0 z-30 bg-[#12110f]/95 backdrop-blur-md">
            <tr className="h-11 border-b border-white/8">
              <th className="sticky left-0 z-50 border-r border-white/6 bg-[#171614] px-0 py-0 align-middle shadow-[1px_0_0_0_rgba(255,255,255,0.06)]">
                {editable ? (
                  <label className="flex h-11 items-center justify-center">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allRowsSelected}
                      onChange={(event) => toggleAllVisibleRows(event.target.checked)}
                      className="h-4 w-4 rounded border-white/15 bg-white/[0.04] accent-white"
                      aria-label="Select all rows"
                    />
                  </label>
                ) : (
                  <div className="h-11" />
                )}
              </th>
              {properties.map((property) => {
                const isFrozen = Boolean(property.config?.frozen);
                const left = frozenState.offsets[property.id];
                const propertyIndex = properties.findIndex((candidate) => candidate.id === property.id);

                return (
                  <th
                    key={property.id}
                    style={isFrozen ? { left } : undefined}
                    className={cn(
                      "border-r border-white/6 bg-[#171614] px-2.5 py-0 text-left align-middle font-medium text-zinc-300",
                      isFrozen && "sticky z-40",
                      isFrozen &&
                        property.id === frozenState.lastFrozenId &&
                        "shadow-[1px_0_0_0_rgba(255,255,255,0.06),14px_0_28px_rgba(0,0,0,0.18)]"
                    )}
                  >
                    {editable ? (
                      <PropertyHeaderMenu
                        property={property}
                        onRename={(name) =>
                          persistProperties((current) =>
                            current.map((candidate) =>
                              candidate.id === property.id ? updateProperty(candidate, { name }) : candidate
                            )
                          )
                        }
                        onTypeChange={(type) =>
                          persistProperties((current) =>
                            current.map((candidate) =>
                              candidate.id === property.id
                                ? updateProperty(candidate, {
                                    type,
                                    config:
                                      type === "title"
                                        ? { frozen: true, showPageIcon: true }
                                        : undefined,
                                  })
                                : candidate
                            )
                          )
                        }
                        onInsertLeft={() => void insertPropertyAt(properties.findIndex((item) => item.id === property.id))}
                        onInsertRight={() =>
                          void insertPropertyAt(properties.findIndex((item) => item.id === property.id) + 1)
                        }
                        onMoveLeft={() => void onMoveProperty(property.id, "left")}
                        onMoveRight={() => void onMoveProperty(property.id, "right")}
                        canMoveLeft={propertyIndex > 0}
                        canMoveRight={propertyIndex < properties.length - 1}
                        onDelete={() =>
                          persistProperties((current) =>
                            current.filter((candidate) => candidate.id !== property.id)
                          )
                        }
                        onToggleWrap={(enabled) =>
                          persistProperties((current) =>
                            current.map((candidate) =>
                              candidate.id === property.id
                                ? updateProperty(candidate, { config: { wrap: enabled } })
                                : candidate
                            )
                          )
                        }
                        onToggleFreeze={(enabled) =>
                          persistProperties((current) =>
                            current.map((candidate) =>
                              candidate.id === property.id
                                ? updateProperty(candidate, { config: { frozen: enabled } })
                                : candidate
                            )
                          )
                        }
                        onToggleShowPageIcon={(enabled) =>
                          persistProperties((current) =>
                            current.map((candidate) =>
                              candidate.id === property.id
                                ? updateProperty(candidate, { config: { showPageIcon: enabled } })
                                : candidate
                            )
                          )
                        }
                        onSaveOptions={(options: SelectOption[]) =>
                          persistProperties((current) =>
                            current.map((candidate) =>
                              candidate.id === property.id
                                ? updateProperty(candidate, { config: { options } })
                                : candidate
                            )
                          )
                        }
                        onSaveFormula={(formula: FormulaConfig) =>
                          persistProperties((current) =>
                            current.map((candidate) =>
                              candidate.id === property.id
                                ? updateProperty(candidate, { config: { formula } })
                                : candidate
                            )
                          )
                        }
                      />
                    ) : (
                      <div className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left">
                        <span className="truncate">{property.name || "Untitled"}</span>
                      </div>
                    )}
                  </th>
                );
              })}

              <th className="sticky right-0 z-40 border-l border-white/6 bg-[#171614] px-0 py-0 shadow-[-1px_0_0_0_rgba(255,255,255,0.06)]" />
            </tr>
          </thead>

          <tbody>
            {rows === undefined ? (
              <tr>
                <td colSpan={properties.length + 2} className="h-12 px-4 text-sm text-zinc-500">
                  Loading rows...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={properties.length + 2}
                  className="px-4 py-16 text-center text-sm text-zinc-500"
                >
                  No rows yet. Add your first entry to start building the database.
                </td>
              </tr>
            ) : (
              rows.map((row: any) => {
                const isSelected = selectedRowIds.has(String(row._id));

                return (
                <tr
                  key={row._id}
                  className={cn(
                    "group border-b border-white/6 transition-colors",
                    isSelected
                      ? "bg-sky-500/[0.09] hover:bg-sky-500/[0.12]"
                      : "bg-[#12110f] hover:bg-[#1a1916]"
                  )}
                >
                  <td
                    className={cn(
                      "sticky left-0 z-30 border-r border-white/6 px-0 py-0 align-middle shadow-[1px_0_0_0_rgba(255,255,255,0.06)]",
                      isSelected ? "bg-sky-950/55 group-hover:bg-sky-950/65" : "bg-[#12110f] group-hover:bg-[#1a1916]"
                    )}
                  >
                    {editable ? (
                      <label className="flex min-h-[38px] items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(event) => toggleRowSelection(row._id, event.target.checked)}
                          className="h-4 w-4 rounded border-white/15 bg-white/[0.04] accent-white"
                          aria-label={`Select row ${titleProperty ? String(row.data?.[titleProperty.id] ?? "Untitled row") : String(row._id)}`}
                        />
                      </label>
                    ) : (
                      <div className="min-h-[38px]" />
                    )}
                  </td>
                  {properties.map((property) => {
                    const isFrozen = Boolean(property.config?.frozen);
                    const left = frozenState.offsets[property.id];

                    return (
                      <td
                        key={property.id}
                        style={isFrozen ? { left } : undefined}
                        className={cn(
                          "border-r border-white/6 px-1 py-0 align-middle",
                          isFrozen &&
                            "sticky z-20",
                          isFrozen &&
                            (isSelected
                              ? "bg-sky-950/55 group-hover:bg-sky-950/65"
                              : "bg-[#12110f] group-hover:bg-[#1a1916]"),
                          isFrozen &&
                            property.id === frozenState.lastFrozenId &&
                            "shadow-[1px_0_0_0_rgba(255,255,255,0.06),14px_0_28px_rgba(0,0,0,0.18)]"
                        )}
                      >
                        <PropertyCell
                          property={property}
                          value={row.data?.[property.id]}
                          rowCreatedAt={row._creationTime}
                          rowData={row.data}
                          allProperties={properties}
                          now={now}
                          fullWidth
                          onChange={
                            editable
                              ? (nextValue) => handleCellChange(row._id, property, nextValue)
                              : undefined
                          }
                        />
                      </td>
                    );
                  })}

                  <td className={cn(
                    "sticky right-0 z-20 border-l border-white/6 px-0 py-0 align-middle shadow-[-1px_0_0_0_rgba(255,255,255,0.06)]",
                    isSelected ? "bg-sky-950/55 group-hover:bg-sky-950/65" : "bg-[#12110f] group-hover:bg-[#1a1916]"
                  )}>
                    <div className="flex items-center justify-center gap-1">
                      <ReminderTriggerButton
                        workspaceId={workspaceId}
                        iconOnly
                        title="Create reminder from row"
                        className="opacity-0 group-hover:opacity-100"
                        initialValues={{
                          title: `Follow up: ${
                            titleProperty ? String(row.data?.[titleProperty.id] ?? "Untitled row") : "Untitled row"
                          }`,
                          pageId,
                          databaseId,
                          rowId: row._id,
                          sourceLabel: `${databaseName} / ${
                            titleProperty ? String(row.data?.[titleProperty.id] ?? "Untitled row") : "Untitled row"
                          }`,
                          sourceUrl: `/workspace/${pageId}`,
                        }}
                      />
                      {editable ? (
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 opacity-0 transition-all hover:bg-red-500/12 hover:text-red-300 group-hover:opacity-100"
                          onClick={() => onDeleteRow(row._id)}
                          title="Delete row"
                          aria-label="Delete row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )})
            )}
          </tbody>

          <tfoot>
            <tr className="h-11 border-t border-white/8 bg-[#151412]">
              <td colSpan={properties.length + 2} className="px-2 py-0">
                {editable ? (
                  <button
                    type="button"
                    className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-[13px] text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
                    onClick={() => void handleAddRow()}
                    disabled={newRowLoading}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {newRowLoading ? "Adding row..." : "New row"}
                  </button>
                ) : (
                  <div className="flex h-9 items-center px-3 text-[13px] text-zinc-500">
                    View-only access. Editors can add rows and update properties.
                  </div>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
