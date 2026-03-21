"use client";

import { useMemo } from "react";
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  doesPropertyValueMatchOption,
  getDefaultValueForProperty,
  getSelectColorClasses,
  normalizeProperties,
  normalizeValueForProperty,
} from "./database-utils";
import { PropertyCell } from "./property-cell";

interface BoardViewProps {
  database: any;
  pageId: Id<"pages">;
  rows: any[] | undefined;
  groupByPropertyId?: string | null;
}

export function BoardView({ database, rows, groupByPropertyId }: BoardViewProps) {
  const addRow = useMutation(api.databases.addRow);
  const updateRow = useMutation(api.databases.updateRow);

  const properties = normalizeProperties(database.properties ?? []);
  const selectProperties = useMemo(
    () => properties.filter((property) => property.type === "select"),
    [properties]
  );
  const groupProperty =
    selectProperties.find((property) => property.id === groupByPropertyId) ?? selectProperties[0];
  const titleProperty = properties.find((property) => property.type === "title");

  if (!groupProperty) {
    return (
      <div className="rounded-[24px] border border-white/8 bg-black/20 px-6 py-10 text-center text-sm text-zinc-500">
        Add a Select property to use Board view.
      </div>
    );
  }

  const columns = groupProperty.config?.options ?? [];
  const matchesAnyColumn = (value: unknown) =>
    columns.some((column) => doesPropertyValueMatchOption(groupProperty, value, column.id));

  const noGroupRows = rows?.filter((row: any) => !matchesAnyColumn(row.data?.[groupProperty.id]));

  const handleAddCard = async (columnId: string) => {
    const initialData: Record<string, unknown> = {};
    for (const property of properties) {
      initialData[property.id] = getDefaultValueForProperty(property);
    }

    initialData[groupProperty.id] = columnId;

    await addRow({ databaseId: database._id, data: initialData });
  };

  const renderCard = (row: any) => {
    const title = titleProperty ? row.data?.[titleProperty.id] ?? "Untitled" : "Untitled";
    const visibleProperties = properties.filter(
      (property) => property.type !== "title" && property.id !== groupProperty.id
    );

    return (
      <div
        key={row._id}
        className="rounded-[20px] border border-white/8 bg-[#161513] p-3 shadow-[0_12px_30px_rgba(0,0,0,0.24)] transition hover:border-white/12 hover:bg-[#1a1917]"
      >
        <p className="mb-3 text-sm font-medium text-zinc-100">{title || "Untitled"}</p>

        <div className="space-y-2">
          {visibleProperties.slice(0, 4).map((property) => (
            <div key={property.id} className="rounded-xl bg-white/[0.02] p-1">
              <div className="px-2 pb-0.5 pt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                {property.name}
              </div>
              <PropertyCell
                property={property}
                value={row.data?.[property.id]}
                rowCreatedAt={row._creationTime}
                onChange={(nextValue) =>
                  updateRow({
                    id: row._id,
                    data: {
                      ...row.data,
                      [property.id]: normalizeValueForProperty(property, nextValue),
                    },
                  })
                }
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-[420px] gap-4 overflow-x-auto pb-4 pt-2">
      {rows === undefined ? (
        <div className="rounded-[24px] border border-white/8 bg-black/20 px-6 py-10 text-sm text-zinc-500">
          Loading board...
        </div>
      ) : columns.length === 0 ? (
        <div className="rounded-[24px] border border-white/8 bg-black/20 px-6 py-10 text-sm text-zinc-500">
          Add options to <span className="text-zinc-300">{groupProperty.name}</span> to use Board view.
        </div>
      ) : (
        <>
          {(noGroupRows?.length ?? 0) > 0 && (
            <div className="w-[290px] shrink-0 rounded-[24px] border border-white/8 bg-black/20 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="text-sm font-medium text-zinc-300">No group</h3>
                <span className="text-xs text-zinc-500">{noGroupRows?.length ?? 0}</span>
              </div>
              <div className="space-y-3">{noGroupRows?.map((row: any) => renderCard(row))}</div>
            </div>
          )}

          {columns.map((column) => {
            const columnRows =
              rows?.filter((row: any) =>
                doesPropertyValueMatchOption(groupProperty, row.data?.[groupProperty.id], column.id)
              ) ?? [];

            return (
              <div key={column.id} className="w-[290px] shrink-0 rounded-[24px] border border-white/8 bg-black/20 p-3">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                        getSelectColorClasses(column.color)
                      )}
                    >
                      <span className="truncate">{column.label}</span>
                    </span>
                    <span className="text-xs text-zinc-500">{columnRows.length}</span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    onClick={() => handleAddCard(column.id)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="space-y-3 rounded-[18px] bg-[#11100f] p-2">
                  {columnRows.length > 0 ? (
                    columnRows.map(renderCard)
                  ) : (
                    <div className="rounded-[14px] border border-dashed border-white/8 px-3 py-6 text-center text-xs text-zinc-600">
                      No cards in this group.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
