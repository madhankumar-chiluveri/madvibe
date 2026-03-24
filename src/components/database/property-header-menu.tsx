"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  Plus,
  Settings2,
  Sigma,
  Trash2,
  WrapText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FormulaConfig, PropertySchema, PropertyType, SelectOption } from "@/types/database";
import {
  PROPERTY_TYPE_META,
  SELECT_OPTION_COLORS,
  getFormulaConfig,
  getPropertyIcon,
  getSelectColorClasses,
  getSelectColorDotClass,
  supportsOptions,
} from "./database-utils";

interface PropertyHeaderMenuProps {
  property: PropertySchema;
  onRename: (name: string) => void;
  onTypeChange: (type: PropertyType) => void;
  onInsertLeft: () => void;
  onInsertRight: () => void;
  onDelete: () => void;
  onToggleWrap: (enabled: boolean) => void;
  onToggleFreeze: (enabled: boolean) => void;
  onToggleShowPageIcon: (enabled: boolean) => void;
  onSaveOptions: (options: SelectOption[]) => void;
  onSaveFormula: (formula: FormulaConfig) => void;
}

export function PropertyHeaderMenu({
  property,
  onRename,
  onTypeChange,
  onInsertLeft,
  onInsertRight,
  onDelete,
  onToggleWrap,
  onToggleFreeze,
  onToggleShowPageIcon,
  onSaveOptions,
  onSaveFormula,
}: PropertyHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [name, setName] = useState(property.name);

  useEffect(() => {
    setName(property.name);
  }, [property.name]);

  const currentOptions = property.config?.options ?? [];
  const currentFormula = getFormulaConfig(property);

  const commitName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== property.name) {
      onRename(trimmed);
    } else {
      setName(property.name);
    }
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group/header flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-white/[0.06]"
          >
            <span className="text-[hsl(var(--muted-foreground))]">{getPropertyIcon(property.type)}</span>
            <span className="truncate">{property.name || "Untitled"}</span>
            <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/70 opacity-0 transition-opacity group-hover/header:opacity-100 data-[state=open]:opacity-100" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-[300px] border-white/10 bg-[#191816] text-zinc-100 shadow-2xl"
        >
          <DropdownMenuLabel className="pb-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                {getPropertyIcon(property.type)}
                Property
              </div>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={commitName}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === "Enter") {
                    commitName();
                    setOpen(false);
                  }
                  if (event.key === "Escape") {
                    setName(property.name);
                    setOpen(false);
                  }
                }}
                className="h-9 border-white/10 bg-white/[0.03] text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-white/15"
              />
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-white/8" />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="focus:bg-white/[0.06] data-[state=open]:bg-white/[0.06]">
              <Settings2 className="h-4 w-4 text-zinc-400" />
              Type
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-[340px] w-[240px] overflow-y-auto border-white/10 bg-[#1b1a18] text-zinc-100">
              {PROPERTY_TYPE_META.map((typeMeta) => {
                const disabled =
                  !typeMeta.supported ||
                  (typeMeta.value === "title" && property.type !== "title") ||
                  (property.type === "title" && typeMeta.value !== "title");

                return (
                  <DropdownMenuItem
                    key={typeMeta.value}
                    disabled={disabled}
                    className="focus:bg-white/[0.06] data-[disabled]:opacity-40"
                    onSelect={() => {
                      if (disabled || typeMeta.value === property.type) return;
                      onTypeChange(typeMeta.value);
                    }}
                  >
                    <span className="text-zinc-400">{getPropertyIcon(typeMeta.value)}</span>
                    <span>{typeMeta.label}</span>
                    {property.type === typeMeta.value && <Check className="ml-auto h-4 w-4 text-zinc-300" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {supportsOptions(property.type) && (
            <DropdownMenuItem
              className="focus:bg-white/[0.06]"
              onSelect={() => {
                setOptionsOpen(true);
                setOpen(false);
              }}
            >
              <ListIcon />
              Manage options
            </DropdownMenuItem>
          )}

          {property.type === "formula" && (
            <DropdownMenuItem
              className="focus:bg-white/[0.06]"
              onSelect={() => {
                setFormulaOpen(true);
                setOpen(false);
              }}
            >
              <Sigma className="h-4 w-4 text-zinc-400" />
              Edit formula
            </DropdownMenuItem>
          )}

          {property.type === "title" && (
            <DropdownMenuCheckboxItem
              checked={Boolean(property.config?.showPageIcon)}
              className="focus:bg-white/[0.06]"
              onCheckedChange={(checked: boolean) => onToggleShowPageIcon(Boolean(checked))}
            >
              Show page icon
            </DropdownMenuCheckboxItem>
          )}

          <DropdownMenuCheckboxItem
            checked={Boolean(property.config?.wrap)}
            className="focus:bg-white/[0.06]"
            onCheckedChange={(checked: boolean) => onToggleWrap(Boolean(checked))}
          >
            <WrapText className="mr-2 h-4 w-4 text-zinc-400" />
            Wrap content
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={Boolean(property.config?.frozen)}
            className="focus:bg-white/[0.06]"
            onCheckedChange={(checked: boolean) => onToggleFreeze(Boolean(checked))}
          >
            Freeze column
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator className="bg-white/8" />

          <DropdownMenuItem className="focus:bg-white/[0.06]" onSelect={onInsertLeft}>
            <Plus className="h-4 w-4 text-zinc-400" />
            Insert left
          </DropdownMenuItem>

          <DropdownMenuItem className="focus:bg-white/[0.06]" onSelect={onInsertRight}>
            <Plus className="h-4 w-4 text-zinc-400" />
            Insert right
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-white/8" />

          <DropdownMenuItem
            disabled={property.type === "title"}
            className="text-red-300 focus:bg-red-500/10 focus:text-red-200 data-[disabled]:opacity-40"
            onSelect={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete property
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PropertyOptionsDialog
        propertyName={property.name}
        open={optionsOpen}
        options={currentOptions}
        onOpenChange={setOptionsOpen}
        onSave={onSaveOptions}
      />

      <PropertyFormulaDialog
        propertyName={property.name}
        open={formulaOpen}
        formula={currentFormula}
        onOpenChange={setFormulaOpen}
        onSave={onSaveFormula}
      />
    </>
  );
}

function ListIcon() {
  return <div className="h-4 w-4 rounded-sm border border-zinc-600 bg-white/[0.03]" />;
}

interface PropertyOptionsDialogProps {
  propertyName: string;
  open: boolean;
  options: SelectOption[];
  onOpenChange: (open: boolean) => void;
  onSave: (options: SelectOption[]) => void;
}

function PropertyOptionsDialog({
  propertyName,
  open,
  options,
  onOpenChange,
  onSave,
}: PropertyOptionsDialogProps) {
  const [draftOptions, setDraftOptions] = useState<SelectOption[]>(options);

  useEffect(() => {
    setDraftOptions(options);
  }, [options, open]);

  const handleOptionChange = (optionId: string, updates: Partial<SelectOption>) => {
    setDraftOptions((current) =>
      current.map((option) => (option.id === optionId ? { ...option, ...updates } : option))
    );
  };

  const handleSave = () => {
    const nextOptions = draftOptions
      .map((option) => ({
        ...option,
        label: option.label.trim() || "Option",
      }))
      .filter((option, index, all) => all.findIndex((candidate) => candidate.id === option.id) === index);

    onSave(nextOptions);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Property options"
        className="max-w-2xl border-white/10 bg-[#141311] text-zinc-100 sm:rounded-2xl"
      >
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Manage options</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Update the selectable values for {propertyName || "this property"}.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {draftOptions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
              No options yet.
            </div>
          ) : (
            draftOptions.map((option) => (
              <div
                key={option.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex items-center gap-3">
                  <Input
                    value={option.label}
                    onChange={(event) =>
                      handleOptionChange(option.id, { label: event.target.value })
                    }
                    className="h-9 border-white/10 bg-[#181715] text-zinc-100"
                    placeholder="Option label"
                  />

                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-red-500/15 bg-red-500/8 px-3 text-sm text-red-200 transition hover:bg-red-500/14"
                    onClick={() =>
                      setDraftOptions((current) =>
                        current.filter((candidate) => candidate.id !== option.id)
                      )
                    }
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {SELECT_OPTION_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleOptionChange(option.id, { color })}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        getSelectColorClasses(color),
                        option.color === color
                          ? "ring-1 ring-white/35"
                          : "opacity-70 hover:opacity-100"
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full", getSelectColorDotClass(color))} />
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="justify-start rounded-xl text-zinc-200 hover:bg-white/[0.06] hover:text-white"
            onClick={() =>
              setDraftOptions((current) => [
                ...current,
                {
                  id: crypto.randomUUID(),
                  label: "New option",
                  color: "gray",
                },
              ])
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add option
          </Button>

          <Button
            type="button"
            className="rounded-xl bg-white text-black hover:bg-zinc-200"
            onClick={handleSave}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PropertyFormulaDialogProps {
  propertyName: string;
  open: boolean;
  formula: FormulaConfig;
  onOpenChange: (open: boolean) => void;
  onSave: (formula: FormulaConfig) => void;
}

const FORMULA_PRESETS: Array<{
  label: string;
  description: string;
  formula: FormulaConfig;
}> = [
  {
    label: "Renews in",
    description: 'Shows a live countdown and flips to Active when the date is due.',
    formula: {
      expression: 'RENEWS_IN(PROP("Renewal Date"))',
      resultType: "text",
      displayStyle: "auto",
    },
  },
  {
    label: "Status from date",
    description: "Turns a date-driven field into a colored status cell.",
    formula: {
      expression: 'IF(DAYS_UNTIL(PROP("Renewal Date")) <= 0, "Active", "Pending")',
      resultType: "text",
      displayStyle: "badge",
    },
  },
  {
    label: "Numeric total",
    description: "Multiplies two numeric properties like a spreadsheet.",
    formula: {
      expression: 'NUMBER(PROP("Seats")) * NUMBER(PROP("Price"))',
      resultType: "number",
      displayStyle: "plain",
    },
  },
];

function PropertyFormulaDialog({
  propertyName,
  open,
  formula,
  onOpenChange,
  onSave,
}: PropertyFormulaDialogProps) {
  const [draftFormula, setDraftFormula] = useState<FormulaConfig>(formula);

  useEffect(() => {
    setDraftFormula(formula);
  }, [formula, open]);

  const handleSave = () => {
    onSave({
      expression: draftFormula.expression?.trim() ?? "",
      resultType: draftFormula.resultType ?? "text",
      displayStyle: draftFormula.displayStyle ?? "auto",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Edit formula"
        className="grid max-h-[min(88vh,760px)] max-w-3xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-white/10 bg-[#141311] p-0 text-zinc-100 sm:rounded-2xl"
      >
        <DialogHeader className="shrink-0 border-b border-white/10 px-5 py-4 pr-14">
          <DialogTitle className="text-zinc-100">Configure formula</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Build a computed field for {propertyName || "this property"} using other columns.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-5 py-4">
          <div className="space-y-3.5">
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Expression
            </div>
            <Textarea
              value={draftFormula.expression ?? ""}
              onChange={(event) =>
                setDraftFormula((current) => ({
                  ...current,
                  expression: event.target.value,
                }))
              }
              placeholder='Example: RENEWS_IN(PROP("Claude Renewal"))'
              className="min-h-[112px] max-h-[24vh] resize-y border-white/10 bg-[#181715] text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-white/15 sm:min-h-[124px]"
            />
          </div>

          <div className="grid gap-2.5 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                Result type
              </div>
              <Select
                value={draftFormula.resultType ?? "text"}
                onValueChange={(value) =>
                  setDraftFormula((current) => ({
                    ...current,
                    resultType: value as FormulaConfig["resultType"],
                  }))
                }
              >
                <SelectTrigger className="h-10 border-white/10 bg-[#181715] text-zinc-100 focus:ring-white/15">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#191816] text-zinc-100">
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                Display
              </div>
              <Select
                value={draftFormula.displayStyle ?? "auto"}
                onValueChange={(value) =>
                  setDraftFormula((current) => ({
                    ...current,
                    displayStyle: value as FormulaConfig["displayStyle"],
                  }))
                }
              >
                <SelectTrigger className="h-10 border-white/10 bg-[#181715] text-zinc-100 focus:ring-white/15">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#191816] text-zinc-100">
                  <SelectItem value="auto">Auto badge</SelectItem>
                  <SelectItem value="plain">Plain text</SelectItem>
                  <SelectItem value="badge">Always badge</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Quick templates
            </div>
            <div className="grid content-start gap-2.5 md:grid-cols-3">
              {FORMULA_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setDraftFormula(preset.formula)}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.05]"
                >
                  <div className="text-sm font-medium text-zinc-100">{preset.label}</div>
                  <div className="mt-1 text-xs leading-5 text-zinc-400">{preset.description}</div>
                  <code className="mt-3 block rounded-xl bg-black/20 px-2.5 py-2 text-[11px] text-zinc-300">
                    {preset.formula.expression}
                  </code>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-sm text-zinc-300">
            <div className="font-medium text-zinc-100">Supported helpers</div>
            <div className="mt-2 leading-6 text-zinc-400">
              Use <code>PROP("Column Name")</code> to reference another field.
              Functions available: <code>IF</code>, <code>NOW</code>, <code>TODAY</code>,
              <code>RENEWS_IN</code>, <code>DAYS_UNTIL</code>, <code>DATE_DIFF</code>,
              <code>DATE_ADD</code>, <code>NUMBER</code>, <code>TEXT</code>, <code>ROUND</code>,
              <code>MIN</code>, <code>MAX</code>, <code>ABS</code>, <code>LOWER</code>,
              <code>UPPER</code>, and <code>IS_EMPTY</code>.
            </div>
          </div>
        </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-white/10 px-5 py-3 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl text-zinc-300 hover:bg-white/[0.06] hover:text-white"
            onClick={() =>
              setDraftFormula({
                expression: "",
                resultType: "text",
                displayStyle: "auto",
              })
            }
          >
            Clear
          </Button>

          <Button
            type="button"
            className="rounded-xl bg-white text-black hover:bg-zinc-200"
            onClick={handleSave}
          >
            Save formula
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
