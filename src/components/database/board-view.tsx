"use client";

import { Plus } from "lucide-react";

import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ReminderTriggerButton } from "@/components/reminders/reminder-trigger-button";
import { cn } from "@/lib/utils";
import type { PropertySchema } from "@/types/database";
import {
  buildInitialRowData,
  doesPropertyValueMatchOption,
  getSelectColorClasses,
  normalizeValueForProperty,
} from "./database-utils";
import { PropertyCell } from "./property-cell";

interface BoardViewProps {
  workspaceId: Id<"workspaces">;
  pageId: Id<"pages">;
  databaseId: Id<"databases">;
  databaseName: string;
  properties: PropertySchema[];
  rows: any[] | undefined;
  groupByPropertyId?: string | null;
  now?: number;
  editable?: boolean;
  onAddRow: (initialData?: Record<string, unknown>) => Promise<void>;
  onUpdateRow: (rowId: Id<"rows">, data: Record<string, unknown>) => Promise<void>;
}

export function BoardView({
  workspaceId,
  pageId,
  databaseId,
  databaseName,
  properties,
  rows,
  groupByPropertyId,
  now,
  editable = true,
  onAddRow,
  onUpdateRow,
}: BoardViewProps) {
  const selectProperties = properties.filter((property) => property.type === "select");
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
    if (!editable) return;
    const initialData = buildInitialRowData(properties);
    initialData[groupProperty.id] = columnId;
    await onAddRow(initialData);
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
        <div className="mb-3 flex items-center gap-2">
          <p className="min-w-0 flex-1 text-sm font-medium text-zinc-100">{title || "Untitled"}</p>
          <ReminderTriggerButton
            workspaceId={workspaceId}
            iconOnly
            title="Create reminder from card"
            initialValues={{
              title: `Follow up: ${String(title || "Untitled row")}`,
              pageId,
              databaseId,
              rowId: row._id,
              sourceLabel: `${databaseName} / ${String(title || "Untitled row")}`,
              sourceUrl: `/workspace/${pageId}`,
            }}
          />
        </div>

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
                rowData={row.data}
                allProperties={properties}
                now={now}
                onChange={
                  editable
                    ? (nextValue) =>
                        onUpdateRow(row._id, {
                          ...row.data,
                          [property.id]: normalizeValueForProperty(property, nextValue),
                        })
                    : undefined
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

                  {editable ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                      onClick={() => void handleAddCard(column.id)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
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
