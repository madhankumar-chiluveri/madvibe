"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { Plus, Rows3, Trash2 } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PropertySchema, PropertyType, SelectOption } from "@/types/database";
import {
  ACTION_COLUMN_WIDTH,
  MIN_TABLE_WIDTH,
  createProperty,
  getDefaultValueForProperty,
  getPropertyWidth,
  normalizeProperties,
  normalizeValueForProperty,
  updateProperty,
} from "./database-utils";
import { PropertyHeaderMenu } from "./property-header-menu";
import { PropertyCell } from "./property-cell";

interface TableViewProps {
  database: any;
  rows: any[] | undefined;
  totalRowCount?: number;
}

export function TableView({ database, rows, totalRowCount }: TableViewProps) {
  const addRow = useMutation(api.databases.addRow);
  const updateRow = useMutation(api.databases.updateRow);
  const deleteRow = useMutation(api.databases.deleteRow);
  const updatePropertiesMutation = useMutation(api.databases.updateProperties);

  const [newRowLoading, setNewRowLoading] = useState(false);
  const [newPropertyLoading, setNewPropertyLoading] = useState(false);

  const properties = useMemo(
    () => normalizeProperties(database.properties ?? []),
    [database.properties]
  );

  const tableMinWidth = useMemo(() => {
    const dataColumnsWidth = properties.reduce(
      (total, property) => total + getPropertyWidth(property),
      0
    );
    return Math.max(dataColumnsWidth + ACTION_COLUMN_WIDTH, MIN_TABLE_WIDTH);
  }, [properties]);

  const frozenState = useMemo(() => {
    let currentOffset = 0;
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

  const persistProperties = async (
    updater: (current: PropertySchema[]) => PropertySchema[]
  ) => {
    const nextProperties = normalizeProperties(updater(properties));

    await updatePropertiesMutation({
      id: database._id,
      properties: nextProperties,
    });
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
    setNewRowLoading(true);
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
      setNewRowLoading(false);
    }
  };

  const handleCellChange = async (rowId: Id<"rows">, property: PropertySchema, value: unknown) => {
    const row = rows?.find((item: any) => item._id === rowId);
    if (!row) return;

    await updateRow({
      id: rowId,
      data: {
        ...row.data,
        [property.id]: normalizeValueForProperty(property, value),
      },
    });
  };

  const rowCount = rows?.length ?? 0;
  const rowCountLabel =
    totalRowCount !== undefined && totalRowCount !== rowCount
      ? `${rowCount} of ${totalRowCount} rows`
      : `${rowCount} rows`;

  return (
    <div className="database-shell overflow-hidden rounded-[24px] border border-white/8 bg-[#12110f] shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between border-b border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-zinc-300">
          <Rows3 className="h-4 w-4 text-zinc-500" />
          <span>{rowCountLabel}</span>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={newPropertyLoading}
          className="rounded-xl border border-white/8 bg-white/[0.03] text-zinc-100 hover:bg-white/[0.08] hover:text-white"
          onClick={() => insertPropertyAt(properties.length)}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {newPropertyLoading ? "Adding..." : "New property"}
        </Button>
      </div>

      <div className="notion-table-scroll min-h-[420px] max-h-[calc(100vh-250px)] w-full overflow-auto">
        <table
          className="notion-database-table w-full table-fixed border-collapse text-[13px] text-zinc-100"
          style={{ minWidth: tableMinWidth }}
        >
          <colgroup>
            {properties.map((property) => (
              <col key={property.id} style={{ width: getPropertyWidth(property) }} />
            ))}
            <col style={{ width: ACTION_COLUMN_WIDTH }} />
          </colgroup>

          <thead className="sticky top-0 z-30 bg-[#12110f]/95 backdrop-blur-md">
            <tr className="h-11 border-b border-white/8">
              {properties.map((property) => {
                const isFrozen = Boolean(property.config?.frozen);
                const left = frozenState.offsets[property.id];

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
                      onInsertLeft={() => insertPropertyAt(properties.findIndex((item) => item.id === property.id))}
                      onInsertRight={() =>
                        insertPropertyAt(properties.findIndex((item) => item.id === property.id) + 1)
                      }
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
                    />
                  </th>
                );
              })}

              <th className="sticky right-0 z-40 border-l border-white/6 bg-[#171614] px-0 py-0 shadow-[-1px_0_0_0_rgba(255,255,255,0.06)]" />
            </tr>
          </thead>

          <tbody>
            {rows === undefined ? (
              <tr>
                <td colSpan={properties.length + 1} className="h-12 px-4 text-sm text-zinc-500">
                  Loading rows...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={properties.length + 1}
                  className="px-4 py-16 text-center text-sm text-zinc-500"
                >
                  No rows yet. Add your first entry to start building the database.
                </td>
              </tr>
            ) : (
              rows.map((row: any) => (
                <tr
                  key={row._id}
                  className="group border-b border-white/6 bg-[#12110f] transition-colors hover:bg-[#1a1916]"
                >
                  {properties.map((property) => {
                    const isFrozen = Boolean(property.config?.frozen);
                    const left = frozenState.offsets[property.id];

                    return (
                      <td
                        key={property.id}
                        style={isFrozen ? { left } : undefined}
                        className={cn(
                          "border-r border-white/6 px-1 py-0 align-middle",
                          isFrozen && "sticky z-20 bg-[#12110f] group-hover:bg-[#1a1916]",
                          isFrozen &&
                            property.id === frozenState.lastFrozenId &&
                            "shadow-[1px_0_0_0_rgba(255,255,255,0.06),14px_0_28px_rgba(0,0,0,0.18)]"
                        )}
                      >
                        <PropertyCell
                          property={property}
                          value={row.data?.[property.id]}
                          rowCreatedAt={row._creationTime}
                          fullWidth
                          onChange={(nextValue) => handleCellChange(row._id, property, nextValue)}
                        />
                      </td>
                    );
                  })}

                  <td className="sticky right-0 z-20 border-l border-white/6 bg-[#12110f] px-0 py-0 align-middle shadow-[-1px_0_0_0_rgba(255,255,255,0.06)] group-hover:bg-[#1a1916]">
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 opacity-0 transition-all hover:bg-red-500/12 hover:text-red-300 group-hover:opacity-100"
                        onClick={() => deleteRow({ id: row._id })}
                        title="Delete row"
                        aria-label="Delete row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          <tfoot>
            <tr className="h-11 border-t border-white/8 bg-[#151412]">
              <td colSpan={properties.length + 1} className="px-2 py-0">
                <button
                  type="button"
                  className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-[13px] text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
                  onClick={handleAddRow}
                  disabled={newRowLoading}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {newRowLoading ? "Adding row..." : "New row"}
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
