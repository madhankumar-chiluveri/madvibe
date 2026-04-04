"use client";

import { Plus, Trash2 } from "lucide-react";

import type { Id } from "../../../convex/_generated/dataModel";
import { ReminderTriggerButton } from "@/components/reminders/reminder-trigger-button";
import type { PropertySchema } from "@/types/database";
import { normalizeValueForProperty } from "./database-utils";
import { PropertyCell } from "./property-cell";

interface ListViewProps {
  workspaceId: Id<"workspaces">;
  pageId: Id<"pages">;
  databaseId: Id<"databases">;
  databaseName: string;
  properties: PropertySchema[];
  rows: any[] | undefined;
  now?: number;
  editable?: boolean;
  onAddRow: () => Promise<void>;
  onUpdateRow: (rowId: Id<"rows">, data: Record<string, unknown>) => Promise<void>;
  onDeleteRow: (rowId: Id<"rows">) => Promise<void>;
}

export function ListView({
  workspaceId,
  pageId,
  databaseId,
  databaseName,
  properties,
  rows,
  now,
  editable = true,
  onAddRow,
  onUpdateRow,
  onDeleteRow,
}: ListViewProps) {
  const titleProperty = properties.find((property) => property.type === "title");
  const secondaryProperties = properties.filter((property) => property.type !== "title");

  return (
    <div className="space-y-2 pt-2">
      {rows === undefined ? (
        <p className="py-4 text-sm text-zinc-500">Loading...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center text-sm text-zinc-500">
          No items yet.
        </div>
      ) : (
        rows.map((row: any) => (
          <div
            key={row._id}
            className="group rounded-[22px] border border-white/8 bg-black/20 px-3 py-3 transition-colors hover:bg-black/30"
          >
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                {titleProperty ? (
                  <PropertyCell
                    property={titleProperty}
                    value={row.data?.[titleProperty.id]}
                    rowCreatedAt={row._creationTime}
                    rowData={row.data}
                    allProperties={properties}
                    now={now}
                    fullWidth
                    onChange={
                      editable
                        ? (nextValue) =>
                            onUpdateRow(row._id, {
                              ...row.data,
                              [titleProperty.id]: normalizeValueForProperty(titleProperty, nextValue),
                            })
                        : undefined
                    }
                  />
                ) : (
                  <span className="text-sm font-medium text-zinc-100">Row</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <ReminderTriggerButton
                  workspaceId={workspaceId}
                  iconOnly
                  title="Create reminder from item"
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
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 opacity-0 transition hover:bg-red-500/12 hover:text-red-300 group-hover:opacity-100"
                    onClick={() => onDeleteRow(row._id)}
                    aria-label="Delete row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

            {secondaryProperties.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {secondaryProperties.slice(0, 6).map((property) => (
                  <div
                    key={property.id}
                    className="rounded-[18px] border border-white/6 bg-[#151412] p-1.5"
                  >
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
                      fullWidth
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
            )}
          </div>
        ))
      )}

      {editable ? (
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
          onClick={() => onAddRow()}
        >
          <Plus className="h-3.5 w-3.5" />
          New item
        </button>
      ) : null}
    </div>
  );
}
