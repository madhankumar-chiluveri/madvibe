"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Filter, Plus, RotateCcw, Save, Trash2 } from "lucide-react";

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
import type { FilterCondition, FilterGroup, PropertySchema } from "@/types/database";
import {
  filterOperatorNeedsValue,
  getDefaultFilterOperator,
  getDefaultFilterValue,
  getFilterOperatorOptions,
  getFormulaConfig,
  getPropertyIcon,
  getPropertyOptions,
  supportsOptions,
} from "./database-utils";

const NONE_VALUE = "__none";

interface DatabaseQuickFilterBarProps {
  className?: string;
  properties: PropertySchema[];
  filterGroup: FilterGroup;
  open: boolean;
  hasPendingChanges: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (updater: (current: FilterGroup) => FilterGroup) => void;
  onReset: () => void;
  onSave: () => void;
}

function FilterValueEditor({
  property,
  condition,
  onValueChange,
}: {
  property: PropertySchema;
  condition: FilterCondition;
  onValueChange: (value: string) => void;
}) {
  if (!filterOperatorNeedsValue(condition.operator)) {
    return null;
  }

  if (property.type === "checkbox") {
    return (
      <Select value={String(condition.value ?? "true")} onValueChange={onValueChange}>
        <SelectTrigger className="h-10 w-full rounded-xl border-foreground/10 bg-foreground/[0.03] text-foreground focus:ring-foreground/15">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-foreground/10 bg-popover text-foreground">
          <SelectItem value="true">Checked</SelectItem>
          <SelectItem value="false">Unchecked</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (supportsOptions(property.type)) {
    const options = getPropertyOptions(property);

    return (
      <Select
        value={String(condition.value || NONE_VALUE)}
        onValueChange={(value) => onValueChange(value === NONE_VALUE ? "" : value)}
      >
        <SelectTrigger className="h-10 w-full rounded-xl border-foreground/10 bg-foreground/[0.03] text-foreground focus:ring-foreground/15">
          <SelectValue placeholder="Select value" />
        </SelectTrigger>
        <SelectContent className="border-foreground/10 bg-popover text-foreground">
          <SelectItem value={NONE_VALUE}>
            {options.length > 0 ? "Select value" : "No options yet"}
          </SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const formulaType = property.type === "formula" ? getFormulaConfig(property).resultType : undefined;
  const isDateLike =
    property.type === "date" ||
    property.type === "created_time" ||
    formulaType === "date";
  const isNumberLike = property.type === "number" || formulaType === "number";

  return (
    <Input
      type={isDateLike ? "date" : isNumberLike ? "number" : "text"}
      value={String(condition.value ?? "")}
      onChange={(event) => onValueChange(event.target.value)}
      placeholder={isDateLike ? "Pick a date" : isNumberLike ? "Enter a number" : "Type a value"}
      className="h-10 rounded-xl border-foreground/10 bg-foreground/[0.03] text-foreground placeholder:text-muted-foreground focus-visible:ring-foreground/15"
    />
  );
}

function formatFilterValueLabel(property: PropertySchema, condition: FilterCondition) {
  if (!filterOperatorNeedsValue(condition.operator)) {
    return "";
  }

  if (property.type === "checkbox") {
    return condition.value === "true" || condition.value === true ? "Checked" : "Unchecked";
  }

  if (supportsOptions(property.type)) {
    return (
      getPropertyOptions(property).find((option) => option.id === condition.value)?.label ??
      String(condition.value ?? "")
    );
  }

  const isDateLike =
    property.type === "date" ||
    property.type === "created_time" ||
    (property.type === "formula" && getFormulaConfig(property).resultType === "date");

  if (isDateLike && condition.value) {
    const timestamp = new Date(String(condition.value)).getTime();
    if (!Number.isNaN(timestamp)) {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(timestamp));
    }
  }

  return String(condition.value ?? "");
}

function buildFilterChipLabel(property: PropertySchema, condition: FilterCondition) {
  const operatorLabel =
    getFilterOperatorOptions(property).find((option) => option.value === condition.operator)?.label ??
    condition.operator;
  const valueLabel = formatFilterValueLabel(property, condition);

  return {
    operatorLabel,
    valueLabel,
    text: valueLabel ? `${property.name} ${operatorLabel} ${valueLabel}` : `${property.name} ${operatorLabel}`,
  };
}

export function DatabaseQuickFilterBar({
  className,
  properties,
  filterGroup,
  open,
  hasPendingChanges,
  onOpenChange,
  onChange,
  onReset,
  onSave,
}: DatabaseQuickFilterBarProps) {
  const [addFilterOpen, setAddFilterOpen] = useState(false);
  const [logicOpen, setLogicOpen] = useState(false);
  const [editingFilterIndex, setEditingFilterIndex] = useState<number | null>(null);

  const showBar = open || filterGroup.conditions.length > 0 || hasPendingChanges;

  useEffect(() => {
    if (!showBar) {
      setAddFilterOpen(false);
      setLogicOpen(false);
      setEditingFilterIndex(null);
    }
  }, [showBar]);

  useEffect(() => {
    if (editingFilterIndex !== null && editingFilterIndex >= filterGroup.conditions.length) {
      setEditingFilterIndex(null);
    }
  }, [editingFilterIndex, filterGroup.conditions.length]);

  const updateCondition = (index: number, updater: (current: FilterCondition) => FilterCondition) => {
    onChange((current) => ({
      ...current,
      conditions: current.conditions.map((condition, conditionIndex) =>
        conditionIndex === index ? updater(condition) : condition
      ),
    }));
  };

  const removeCondition = (index: number) => {
    onChange((current) => ({
      ...current,
      conditions: current.conditions.filter((_, conditionIndex) => conditionIndex !== index),
    }));
    setEditingFilterIndex((current) => {
      if (current === null) return current;
      if (current === index) return null;
      return current > index ? current - 1 : current;
    });
  };

  const addConditionForProperty = (propertyId: string) => {
    const property = properties.find((candidate) => candidate.id === propertyId);
    if (!property) return;

    const nextOperator = getDefaultFilterOperator(property);
    const nextIndex = filterGroup.conditions.length;

    onChange((current) => ({
      ...current,
      conditions: [
        ...current.conditions,
        {
          propertyId,
          operator: nextOperator,
          value: getDefaultFilterValue(property, nextOperator),
        },
      ],
    }));

    onOpenChange(true);
    setAddFilterOpen(false);
    setEditingFilterIndex(nextIndex);
  };

  const setFilterOperator = (operator: FilterGroup["operator"]) => {
    onChange((current) => (current.operator === operator ? current : { ...current, operator }));
    setLogicOpen(false);
  };

  if (!showBar) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-[18px] border border-foreground/8 bg-card/80 px-2.5 py-2 shadow-[0_14px_34px_rgba(0,0,0,0.22)] backdrop-blur-sm",
        className
      )}
    >
      {filterGroup.conditions.length > 1 ? (
        <Popover open={logicOpen} onOpenChange={setLogicOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] px-3 text-sm text-foreground/80 transition-colors hover:bg-foreground/[0.07] hover:text-foreground"
            >
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{filterGroup.operator === "and" ? "All filters" : "Any filter"}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[280px] p-2">
            <button
              type="button"
              onClick={() => setFilterOperator("and")}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.05]",
                filterGroup.operator === "and" && "bg-foreground/[0.06]"
              )}
            >
              <span className="mt-0.5 flex h-4 w-4 items-center justify-center text-muted-foreground">
                {filterGroup.operator === "and" ? <Check className="h-3.5 w-3.5 text-sky-300" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">Match all filters</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Rows must satisfy every quick filter.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterOperator("or")}
              className={cn(
                "mt-1 flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.05]",
                filterGroup.operator === "or" && "bg-foreground/[0.06]"
              )}
            >
              <span className="mt-0.5 flex h-4 w-4 items-center justify-center text-muted-foreground">
                {filterGroup.operator === "or" ? <Check className="h-3.5 w-3.5 text-sky-300" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">Match any filter</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Rows can satisfy just one quick filter.
                </span>
              </span>
            </button>
          </PopoverContent>
        </Popover>
      ) : null}

      {filterGroup.conditions.length === 0 ? (
        <div className="flex min-h-10 items-center px-1 text-sm text-muted-foreground">
          Quick filters stay local to this view until you save them.
        </div>
      ) : (
        filterGroup.conditions.map((condition, index) => {
          const property = properties.find((candidate) => candidate.id === condition.propertyId);
          if (!property) {
            return null;
          }

          const label = buildFilterChipLabel(property, condition);
          const isValuePending = filterOperatorNeedsValue(condition.operator) && !label.valueLabel;

          return (
            <Popover
              key={`${condition.propertyId}-${index}`}
              open={editingFilterIndex === index}
              onOpenChange={(nextOpen) => setEditingFilterIndex(nextOpen ? index : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-10 max-w-full items-center gap-2 rounded-xl border px-3 text-sm transition-colors",
                    isValuePending
                      ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
                      : "border-sky-500/25 bg-sky-500/12 text-sky-100 hover:bg-sky-500/16"
                  )}
                >
                  <span className="text-current/85">{getPropertyIcon(property.type)}</span>
                  <span className="truncate">{label.text}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-current/70" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(92vw,360px)] p-0">
                <div className="border-b border-foreground/8 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Quick filter
                  </div>
                  <div className="mt-1 text-sm font-medium text-foreground">Edit filter</div>
                </div>

                <div className="space-y-3 p-4">
                  <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Property
                    </div>
                    <Select
                      value={condition.propertyId}
                      onValueChange={(propertyId) => {
                        const nextProperty = properties.find((candidate) => candidate.id === propertyId);
                        if (!nextProperty) return;

                        const nextOperator = getDefaultFilterOperator(nextProperty);
                        updateCondition(index, () => ({
                          propertyId,
                          operator: nextOperator,
                          value: getDefaultFilterValue(nextProperty, nextOperator),
                        }));
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-foreground/10 bg-foreground/[0.03] text-foreground focus:ring-foreground/15">
                        <SelectValue placeholder="Property" />
                      </SelectTrigger>
                      <SelectContent className="border-foreground/10 bg-popover text-foreground">
                        {properties.map((candidate) => (
                          <SelectItem key={candidate.id} value={candidate.id}>
                            {candidate.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Condition
                    </div>
                    <Select
                      value={condition.operator}
                      onValueChange={(value) => {
                        const nextOperator = value as FilterCondition["operator"];
                        updateCondition(index, (current) => ({
                          ...current,
                          operator: nextOperator,
                          value: getDefaultFilterValue(property, nextOperator),
                        }));
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-foreground/10 bg-foreground/[0.03] text-foreground focus:ring-foreground/15">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-foreground/10 bg-popover text-foreground">
                        {getFilterOperatorOptions(property).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Value
                    </div>
                    {filterOperatorNeedsValue(condition.operator) ? (
                      <FilterValueEditor
                        property={property}
                        condition={condition}
                        onValueChange={(value) =>
                          updateCondition(index, (current) => ({
                            ...current,
                            value,
                          }))
                        }
                      />
                    ) : (
                      <div className="flex h-10 items-center rounded-xl border border-foreground/10 bg-foreground/[0.03] px-3 text-sm text-muted-foreground">
                        This condition does not need a value.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-foreground/8 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => removeCondition(index)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm text-red-300 transition-colors hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete filter
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingFilterIndex(null)}
                    className="h-9 rounded-xl text-foreground/80 hover:bg-foreground/[0.06] hover:text-foreground"
                  >
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          );
        })
      )}

      <Popover open={addFilterOpen} onOpenChange={setAddFilterOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-foreground/12 bg-foreground/[0.02] px-3 text-sm text-foreground/80 transition-colors hover:border-foreground/20 hover:bg-foreground/[0.05] hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Filter
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[280px] p-2">
          <div className="px-2 pb-2 pt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Add a quick filter
          </div>
          <div className="max-h-[280px] space-y-1 overflow-y-auto pr-1">
            {properties.map((property) => (
              <button
                key={property.id}
                type="button"
                onClick={() => addConditionForProperty(property.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
              >
                <span className="text-muted-foreground">{getPropertyIcon(property.type)}</span>
                <span className="min-w-0 flex-1 truncate">{property.name}</span>
                <span className="text-xs text-muted-foreground">{property.type.replace("_", " ")}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onReset}
          disabled={!hasPendingChanges}
          className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!hasPendingChanges}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/14 px-3 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:border-foreground/10 disabled:bg-foreground/[0.04] disabled:text-muted-foreground"
        >
          <Save className="h-3.5 w-3.5" />
          Save view
        </button>
      </div>
    </div>
  );
}
