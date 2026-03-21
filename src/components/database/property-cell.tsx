"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronDown, FileText, Link2, Mail, Phone } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { PropertySchema } from "@/types/database";
import {
  getPropertyOption,
  getPropertyOptionList,
  getSelectColorClasses,
  normalizeValueForProperty,
} from "./database-utils";

interface PropertyCellProps {
  property: PropertySchema;
  value: unknown;
  onChange: (value: unknown) => void;
  fullWidth?: boolean;
  rowCreatedAt?: number;
}

function toDateInputValue(rawValue: unknown) {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return "";
  }

  const date = new Date(Number(rawValue));
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().split("T")[0];
}

function formatDateValue(rawValue: unknown) {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return "";
  }

  const date = new Date(Number(rawValue));
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTimeValue(rawValue: unknown) {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return "";
  }

  const date = new Date(Number(rawValue));
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function PropertyCell({
  property,
  value,
  onChange,
  fullWidth = false,
  rowCreatedAt,
}: PropertyCellProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value ?? "");
  const fieldWidthClass = fullWidth ? "w-full" : "min-w-[140px] max-w-[280px]";
  const displayWidthClass = fullWidth ? "w-full" : "max-w-[280px]";
  const wrapDisplay = property.config?.wrap ? "whitespace-normal break-words" : "truncate";

  useEffect(() => {
    if (!editing) {
      setLocalValue(value ?? "");
    }
  }, [value, editing]);

  const formattedDate = useMemo(() => formatDateValue(value), [value]);
  const createdTimeValue = useMemo(
    () => formatDateTimeValue(rowCreatedAt ?? value),
    [rowCreatedAt, value]
  );

  const commitTextLike = () => {
    setEditing(false);
    onChange(normalizeValueForProperty(property, localValue));
  };

  const commitDate = () => {
    setEditing(false);
    onChange(normalizeValueForProperty(property, localValue));
  };

  switch (property.type) {
    case "title":
    case "text":
    case "email":
    case "phone":
    case "url": {
      const href =
        property.type === "email"
          ? value
            ? `mailto:${String(value)}`
            : null
          : property.type === "phone"
            ? value
              ? `tel:${String(value)}`
              : null
            : property.type === "url"
              ? value
                ? String(value)
                : null
              : null;

      const prefixIcon =
        property.type === "title" && property.config?.showPageIcon ? (
          <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        ) : property.type === "email" ? (
          <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        ) : property.type === "phone" ? (
          <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        ) : property.type === "url" ? (
          <Link2 className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        ) : null;

      return editing ? (
        <input
          value={String(localValue ?? "")}
          onChange={(event) => setLocalValue(event.target.value)}
          onBlur={commitTextLike}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitTextLike();
            if (event.key === "Escape") {
              setLocalValue(value ?? "");
              setEditing(false);
            }
          }}
          className={cn(
            "my-1 h-8 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 text-[13px] text-zinc-100 shadow-sm outline-none ring-0 focus:border-white/15 focus:ring-1 focus:ring-white/10",
            fieldWidthClass
          )}
          autoFocus
          placeholder={
            property.type === "url"
              ? "https://"
              : property.type === "email"
                ? "name@example.com"
                : property.type === "phone"
                  ? "+1 555 000 0000"
                  : undefined
          }
        />
      ) : (
        <button
          type="button"
          className={cn(
            "flex min-h-[38px] items-center rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-white/[0.05]",
            displayWidthClass
          )}
          onClick={() => {
            setLocalValue(value ?? "");
            setEditing(true);
          }}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            {prefixIcon}
            {href && value ? (
              <a
                href={href}
                target={property.type === "url" ? "_blank" : undefined}
                rel={property.type === "url" ? "noopener noreferrer" : undefined}
                className={cn(
                  "max-w-full text-zinc-100 underline decoration-zinc-600 underline-offset-2",
                  wrapDisplay
                )}
                onClick={(event) => event.stopPropagation()}
              >
                {String(value)}
              </a>
            ) : (
              <span
                className={cn(
                  "max-w-full",
                  wrapDisplay,
                  property.type === "title" ? "font-medium text-zinc-100" : "text-zinc-200",
                  !value && "font-normal text-zinc-500"
                )}
              >
                {value ? String(value) : property.type === "title" ? "Untitled" : "Empty"}
              </span>
            )}
          </div>
        </button>
      );
    }

    case "number":
      return editing ? (
        <input
          type="number"
          value={String(localValue ?? "")}
          onChange={(event) => setLocalValue(event.target.value)}
          onBlur={commitTextLike}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitTextLike();
            if (event.key === "Escape") {
              setLocalValue(value ?? "");
              setEditing(false);
            }
          }}
          className={cn(
            "my-1 h-8 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 text-right text-[13px] text-zinc-100 shadow-sm outline-none ring-0 focus:border-white/15 focus:ring-1 focus:ring-white/10",
            fieldWidthClass
          )}
          autoFocus
        />
      ) : (
        <button
          type="button"
          className={cn(
            "flex min-h-[38px] items-center justify-end rounded-lg px-2.5 py-1.5 text-right text-[13px] transition-colors hover:bg-white/[0.05]",
            displayWidthClass
          )}
          onClick={() => {
            setLocalValue(value ?? "");
            setEditing(true);
          }}
        >
          {value === null || value === undefined || value === "" ? (
            <span className="text-zinc-500">Empty</span>
          ) : (
            <span className="text-zinc-100">{Number(value).toLocaleString()}</span>
          )}
        </button>
      );

    case "select": {
      const selected = getPropertyOption(property, value);

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-h-[38px] items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.05]",
                displayWidthClass
              )}
            >
              {selected ? (
                <span
                  className={cn(
                    "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                    getSelectColorClasses(selected.color)
                  )}
                >
                  <span className="truncate">{selected.label}</span>
                </span>
              ) : (
                <span className="text-[13px] text-zinc-500">Empty</span>
              )}
              <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-600" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-[220px] border-white/10 bg-[#191816] text-zinc-100"
          >
            <DropdownMenuItem
              className="focus:bg-white/[0.06]"
              onSelect={() => onChange(null)}
            >
              Clear
            </DropdownMenuItem>

            {(property.config?.options ?? []).length === 0 ? (
              <DropdownMenuItem disabled className="opacity-50">
                No options yet
              </DropdownMenuItem>
            ) : (
              (property.config?.options ?? []).map((option) => (
                <DropdownMenuItem
                  key={option.id}
                  className="focus:bg-white/[0.06]"
                  onSelect={() => onChange(option.id)}
                >
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                      getSelectColorClasses(option.color)
                    )}
                  >
                    {option.label}
                  </span>
                  {selected?.id === option.id && <Check className="ml-auto h-4 w-4 text-zinc-300" />}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    case "multi_select": {
      const selectedOptions = getPropertyOptionList(property, value);
      const selectedIds = new Set(selectedOptions.map((option) => option.id));

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-h-[38px] items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.05]",
                displayWidthClass
              )}
            >
              {selectedOptions.length > 0 ? (
                <div className="flex min-w-0 flex-wrap gap-1">
                  {selectedOptions.map((option) => (
                    <span
                      key={option.id}
                      className={cn(
                        "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                        getSelectColorClasses(option.color)
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[13px] text-zinc-500">Empty</span>
              )}
              <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-600" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-[240px] border-white/10 bg-[#191816] text-zinc-100"
          >
            {(property.config?.options ?? []).length === 0 ? (
              <DropdownMenuItem disabled className="opacity-50">
                No options yet
              </DropdownMenuItem>
            ) : (
              (property.config?.options ?? []).map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.id}
                  checked={selectedIds.has(option.id)}
                  className="focus:bg-white/[0.06]"
                  onSelect={(event: Event) => event.preventDefault()}
                  onCheckedChange={(checked: boolean) => {
                    const next = new Set(selectedIds);
                    if (checked) {
                      next.add(option.id);
                    } else {
                      next.delete(option.id);
                    }

                    onChange(Array.from(next));
                  }}
                >
                  <span
                    className={cn(
                      "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                      getSelectColorClasses(option.color)
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                  </span>
                </DropdownMenuCheckboxItem>
              ))
            )}

            <DropdownMenuItem
              className="focus:bg-white/[0.06]"
              onSelect={() => onChange([])}
            >
              Clear all
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    case "checkbox":
      return (
        <label className={cn("flex min-h-[38px] items-center px-2.5", displayWidthClass)}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-white/15 bg-white/[0.04] accent-white"
          />
        </label>
      );

    case "date":
      return editing ? (
        <input
          type="date"
          value={String(localValue ?? "")}
          onChange={(event) => setLocalValue(event.target.value)}
          onBlur={commitDate}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitDate();
            if (event.key === "Escape") {
              setLocalValue(toDateInputValue(value));
              setEditing(false);
            }
          }}
          className={cn(
            "my-1 h-8 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 text-[13px] text-zinc-100 shadow-sm outline-none ring-0 focus:border-white/15 focus:ring-1 focus:ring-white/10",
            fieldWidthClass
          )}
          autoFocus
        />
      ) : (
        <button
          type="button"
          className={cn(
            "flex min-h-[38px] items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-white/[0.05]",
            displayWidthClass
          )}
          onClick={() => {
            setLocalValue(toDateInputValue(value));
            setEditing(true);
          }}
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          {formattedDate ? (
            <span className="text-zinc-100">{formattedDate}</span>
          ) : (
            <span className="text-zinc-500">Empty</span>
          )}
        </button>
      );

    case "created_time":
      return (
        <div
          className={cn(
            "flex min-h-[38px] items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px]",
            displayWidthClass
          )}
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          {createdTimeValue ? (
            <span className="text-zinc-300">{createdTimeValue}</span>
          ) : (
            <span className="text-zinc-500">Empty</span>
          )}
        </div>
      );

    default:
      return (
        <button
          type="button"
          className={cn(
            "flex min-h-[38px] items-center rounded-lg px-2.5 py-1.5 text-left text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.05]",
            displayWidthClass
          )}
          onClick={() => {
            setLocalValue(value ?? "");
            setEditing(true);
          }}
        >
          <span className={cn("max-w-full", wrapDisplay, !value && "text-zinc-500")}>
            {String(value ?? "") || "Empty"}
          </span>
        </button>
      );
  }
}
