"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckSquare, ChevronDown, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PropertySchema } from "@/types/database";
import { getPropertyIcon, getPropertyOptions, getSelectColorClasses } from "./database-utils";

interface DatabaseRowSelectionBarProps {
  properties: PropertySchema[];
  selectedCount: number;
  onApplyProperty: (property: PropertySchema, value: unknown) => Promise<void>;
  onDeleteSelected: () => Promise<void>;
  onClearSelection: () => void;
}

const BULK_EDITABLE_TYPES = new Set<PropertySchema["type"]>([
  "text",
  "number",
  "select",
  "multi_select",
  "checkbox",
  "date",
  "url",
  "email",
  "phone",
]);

function canBulkEditProperty(property: PropertySchema) {
  return BULK_EDITABLE_TYPES.has(property.type);
}

function getClearedValueForProperty(property: PropertySchema) {
  switch (property.type) {
    case "multi_select":
      return [];
    case "checkbox":
      return false;
    default:
      return null;
  }
}

function BulkPropertyActionButton({
  property,
  selectedCount,
  onApplyProperty,
}: {
  property: PropertySchema;
  selectedCount: number;
  onApplyProperty: (property: PropertySchema, value: unknown) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [selectValue, setSelectValue] = useState("");
  const [multiSelectValues, setMultiSelectValues] = useState<string[]>([]);
  const options = useMemo(() => getPropertyOptions(property), [property]);

  useEffect(() => {
    if (!open) {
      setTextValue("");
      setSelectValue("");
      setMultiSelectValues([]);
    }
  }, [open, property.id]);

  const applyValue = async (value: unknown) => {
    setBusy(true);
    try {
      await onApplyProperty(property, value);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] px-3 text-sm text-foreground transition-colors hover:bg-foreground/[0.06]"
        >
          <span className="text-muted-foreground">{getPropertyIcon(property.type)}</span>
          <span className="truncate">{property.name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,360px)] p-0">
        <div className="border-b border-foreground/8 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Selected rows
          </div>
          <div className="mt-1 text-sm font-medium text-foreground">
            Update {property.name} for {selectedCount} row{selectedCount === 1 ? "" : "s"}
          </div>
        </div>

        <div className="space-y-3 p-4">
          {(property.type === "text" ||
            property.type === "number" ||
            property.type === "url" ||
            property.type === "email" ||
            property.type === "phone") && (
            <>
              <Input
                type={property.type === "number" ? "number" : property.type === "email" ? "email" : property.type === "url" ? "url" : property.type === "phone" ? "tel" : "text"}
                value={textValue}
                onChange={(event) => setTextValue(event.target.value)}
                placeholder={`Set ${property.name}`}
                className="h-10 rounded-xl border-foreground/10 bg-foreground/[0.03] text-foreground placeholder:text-muted-foreground focus-visible:ring-foreground/15"
              />
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void applyValue(getClearedValueForProperty(property))}
                  disabled={busy}
                  className="h-9 rounded-xl text-foreground/80 hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  onClick={() => void applyValue(textValue)}
                  disabled={busy}
                  className="h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Apply
                </Button>
              </div>
            </>
          )}

          {property.type === "select" && (
            <>
              <Select value={selectValue} onValueChange={setSelectValue}>
                <SelectTrigger className="h-10 rounded-xl border-foreground/10 bg-foreground/[0.03] text-foreground focus:ring-foreground/15">
                  <SelectValue placeholder={options.length > 0 ? "Choose an option" : "No options yet"} />
                </SelectTrigger>
                <SelectContent className="border-foreground/10 bg-popover text-foreground">
                  {options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void applyValue(getClearedValueForProperty(property))}
                  disabled={busy}
                  className="h-9 rounded-xl text-foreground/80 hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  onClick={() => void applyValue(selectValue)}
                  disabled={busy || !selectValue}
                  className="h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Apply
                </Button>
              </div>
            </>
          )}

          {property.type === "multi_select" && (
            <>
              <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
                {options.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-foreground/10 px-3 py-6 text-center text-sm text-muted-foreground">
                    No options yet.
                  </div>
                ) : (
                  options.map((option) => {
                    const checked = multiSelectValues.includes(option.id);

                    return (
                      <label
                        key={option.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-foreground/8 bg-foreground/[0.03] px-3 py-2 text-sm text-foreground transition-colors hover:bg-foreground/[0.05]"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            setMultiSelectValues((current) =>
                              event.target.checked
                                ? [...current, option.id]
                                : current.filter((value) => value !== option.id)
                            )
                          }
                          className="h-4 w-4 rounded border-foreground/15 bg-foreground/[0.04] accent-white"
                        />
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                            getSelectColorClasses(option.color)
                          )}
                        >
                          {option.label}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void applyValue([])}
                  disabled={busy}
                  className="h-9 rounded-xl text-foreground/80 hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  onClick={() => void applyValue(multiSelectValues)}
                  disabled={busy || options.length === 0}
                  className="h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Apply
                </Button>
              </div>
            </>
          )}

          {property.type === "checkbox" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void applyValue(true)}
                disabled={busy}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.03] text-sm text-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
              >
                Checked
              </button>
              <button
                type="button"
                onClick={() => void applyValue(false)}
                disabled={busy}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.03] text-sm text-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
              >
                Unchecked
              </button>
            </div>
          )}

          {property.type === "date" && (
            <>
              <Input
                type="date"
                value={textValue}
                onChange={(event) => setTextValue(event.target.value)}
                className="h-10 rounded-xl border-foreground/10 bg-foreground/[0.03] text-foreground focus-visible:ring-foreground/15"
              />
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void applyValue(null)}
                  disabled={busy}
                  className="h-9 rounded-xl text-foreground/80 hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  onClick={() => void applyValue(textValue)}
                  disabled={busy}
                  className="h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Apply
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DatabaseRowSelectionBar({
  properties,
  selectedCount,
  onApplyProperty,
  onDeleteSelected,
  onClearSelection,
}: DatabaseRowSelectionBarProps) {
  const [deleting, setDeleting] = useState(false);
  const editableProperties = useMemo(
    () => properties.filter((property) => canBulkEditProperty(property)),
    [properties]
  );

  const handleDeleteSelected = async () => {
    setDeleting(true);
    try {
      await onDeleteSelected();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-foreground/8 bg-card/80 px-2.5 py-2 shadow-[0_14px_34px_rgba(0,0,0,0.22)] backdrop-blur-sm">
      <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-sky-500/22 bg-sky-500/14 px-3 text-sm font-medium text-sky-100">
        <CheckSquare className="h-4 w-4" />
        {selectedCount} selected
      </div>

      {editableProperties.map((property) => (
        <BulkPropertyActionButton
          key={property.id}
          property={property}
          selectedCount={selectedCount}
          onApplyProperty={onApplyProperty}
        />
      ))}

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => void handleDeleteSelected()}
          disabled={deleting}
          className="inline-flex h-10 items-center justify-center rounded-xl px-3 text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          title="Delete selected rows"
          aria-label="Delete selected rows"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClearSelection}
          className="inline-flex h-10 items-center justify-center rounded-xl px-3 text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
          title="Clear selection"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
