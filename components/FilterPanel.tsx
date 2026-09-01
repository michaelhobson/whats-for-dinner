"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ParsedRecipe } from "@/lib/recipe-utils";
import { CUISINE_REGIONS } from "@/lib/cuisine";
import { DISH_CATEGORIES } from "@/lib/dish-categories";
import {
  Filters,
  MEAL_TYPES,
  FLAVOR_NOTES,
  SEASONS,
  DIFFICULTIES,
  COOKING_METHODS,
  RATING_OPTIONS,
  ALL_CUISINE_STYLES,
  computeCounts,
} from "@/lib/recipe-filters";

// ── Types ─────────────────────────────────────────────────────────────────────

type ArrayFilterKey = keyof Omit<Filters, "protein" | "starch" | "vegetable">;
type TextFilterKey  = "protein" | "starch" | "vegetable";

// ── FilterPanel ───────────────────────────────────────────────────────────────

export function FilterPanel({
  recipes,
  filters,
  onFiltersChange,
}: {
  recipes: ParsedRecipe[];
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
}) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());

  const counts = useMemo(() => computeCounts(recipes), [recipes]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const setArr = (key: ArrayFilterKey, val: string[]) =>
    onFiltersChange({ ...filters, [key]: val });

  const toggleItem = (key: ArrayFilterKey, val: string) => {
    const arr = filters[key] as string[];
    onFiltersChange({
      ...filters,
      [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val],
    });
  };

  const setTxt = (key: TextFilterKey, val: string) =>
    onFiltersChange({ ...filters, [key]: val });

  // Cuisine region helpers — use CUISINE_REGIONS as source of truth
  const getRegionStyles = (region: string): string[] =>
    [...(CUISINE_REGIONS.find((r) => r.region === region)?.styles ?? [])];

  const isRegionAllSelected = (region: string) => {
    const styles = getRegionStyles(region);
    return styles.length > 0 && styles.every((s) => filters.cuisine.includes(s));
  };

  const isRegionAnySelected = (region: string) =>
    getRegionStyles(region).some((s) => filters.cuisine.includes(s));

  const toggleRegionCuisine = (region: string) => {
    const styles = getRegionStyles(region);
    const allSelected = styles.every((s) => filters.cuisine.includes(s));
    onFiltersChange({
      ...filters,
      cuisine: allSelected
        ? filters.cuisine.filter((s) => !styles.includes(s))
        : [...new Set([...filters.cuisine, ...styles])],
    });
  };

  const toggleCategory = (cat: string) =>
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });

  const toggleRegionExpanded = (region: string) =>
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      next.has(region) ? next.delete(region) : next.add(region);
      return next;
    });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">

      {/* Meal Type */}
      <CategoryFilter
        label="Meal Type"
        allOptions={[...MEAL_TYPES]}
        selected={filters.mealType}
        onSelectAll={() => setArr("mealType", [...MEAL_TYPES])}
        onClear={() => setArr("mealType", [])}
        expanded={expandedCategories.has("Meal Type")}
        onToggle={() => toggleCategory("Meal Type")}
      >
        <CheckboxList
          options={[...MEAL_TYPES]}
          selected={filters.mealType}
          onToggle={(v) => toggleItem("mealType", v)}
          counts={counts.mealType}
        />
      </CategoryFilter>

      {/* Cuisine — top-level accordion wrapping region sub-accordions */}
      <CategoryFilter
        label="Cuisine"
        allOptions={ALL_CUISINE_STYLES}
        selected={filters.cuisine}
        onSelectAll={() => setArr("cuisine", [...ALL_CUISINE_STYLES])}
        onClear={() => setArr("cuisine", [])}
        expanded={expandedCategories.has("Cuisine")}
        onToggle={() => toggleCategory("Cuisine")}
      >
        <div className="space-y-1">
          {CUISINE_REGIONS.map(({ region, styles }) => {
            const allSel   = isRegionAllSelected(region);
            const anySel   = isRegionAnySelected(region);
            const selCount = styles.filter((s) => filters.cuisine.includes(s)).length;
            const isExpanded = expandedRegions.has(region);
            return (
              <div key={region} className="rounded-lg border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/60">
                  <IndeterminateCheckbox
                    checked={allSel}
                    indeterminate={anySel && !allSel}
                    onChange={() => toggleRegionCuisine(region)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleRegionExpanded(region)}
                    className="flex-1 flex items-center justify-between text-left"
                  >
                    <span className="text-sm font-medium text-gray-700">{region}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${!allSel && anySel ? "text-orange-500 font-semibold" : "text-gray-400"}`}>
                        {allSel ? "All" : `${selCount} of ${styles.length}`}
                      </span>
                      <span className={`text-[10px] text-gray-400 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}>▶</span>
                    </div>
                  </button>
                </div>
                {isExpanded && (
                  <div className="px-4 pt-2 pb-3 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-2">
                    {styles.map((style) => {
                      const styleCount = counts.cuisine.get(style) ?? 0;
                      const zero = styleCount === 0;
                      return (
                        <label
                          key={style}
                          className={`flex items-center gap-1.5 text-sm cursor-pointer ${zero ? "text-gray-300" : "text-gray-700 hover:text-gray-900"}`}
                        >
                          <input
                            type="checkbox"
                            checked={filters.cuisine.includes(style)}
                            onChange={() => toggleItem("cuisine", style)}
                            className="w-4 h-4 rounded border-gray-300 accent-orange-600 cursor-pointer"
                          />
                          <span>{style}</span>
                          <span className={`text-xs ${zero ? "text-gray-300" : "text-gray-400"}`}>({styleCount})</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CategoryFilter>

      {/* Season */}
      <CategoryFilter
        label="Season"
        allOptions={[...SEASONS]}
        selected={filters.season}
        onSelectAll={() => setArr("season", [...SEASONS])}
        onClear={() => setArr("season", [])}
        expanded={expandedCategories.has("Season")}
        onToggle={() => toggleCategory("Season")}
      >
        <CheckboxList
          options={[...SEASONS]}
          selected={filters.season}
          onToggle={(v) => toggleItem("season", v)}
          counts={counts.season}
        />
      </CategoryFilter>

      {/* Difficulty */}
      <CategoryFilter
        label="Difficulty"
        allOptions={[...DIFFICULTIES]}
        selected={filters.difficulty}
        onSelectAll={() => setArr("difficulty", [...DIFFICULTIES])}
        onClear={() => setArr("difficulty", [])}
        expanded={expandedCategories.has("Difficulty")}
        onToggle={() => toggleCategory("Difficulty")}
      >
        <CheckboxList
          options={[...DIFFICULTIES]}
          selected={filters.difficulty}
          onToggle={(v) => toggleItem("difficulty", v)}
          counts={counts.difficulty}
        />
      </CategoryFilter>

      {/* Cooking Method */}
      <CategoryFilter
        label="Cooking Method"
        allOptions={COOKING_METHODS.map((m) => m.value)}
        selected={filters.cookingMethod}
        onSelectAll={() => setArr("cookingMethod", COOKING_METHODS.map((m) => m.value))}
        onClear={() => setArr("cookingMethod", [])}
        expanded={expandedCategories.has("Cooking Method")}
        onToggle={() => toggleCategory("Cooking Method")}
      >
        <CheckboxList
          options={COOKING_METHODS.map((m) => m.value)}
          labels={COOKING_METHODS.map((m) => m.label)}
          selected={filters.cookingMethod}
          onToggle={(v) => toggleItem("cookingMethod", v)}
          counts={counts.cookingMethod}
        />
      </CategoryFilter>

      {/* Flavor Notes */}
      <CategoryFilter
        label="Flavor Notes"
        allOptions={[...FLAVOR_NOTES]}
        selected={filters.flavorNotes}
        onSelectAll={() => setArr("flavorNotes", [...FLAVOR_NOTES])}
        onClear={() => setArr("flavorNotes", [])}
        expanded={expandedCategories.has("Flavor Notes")}
        onToggle={() => toggleCategory("Flavor Notes")}
      >
        <CheckboxList
          options={[...FLAVOR_NOTES]}
          selected={filters.flavorNotes}
          onToggle={(v) => toggleItem("flavorNotes", v)}
          counts={counts.flavorNotes}
        />
      </CategoryFilter>

      {/* Dish Category */}
      <CategoryFilter
        label="Dish Category"
        allOptions={[...DISH_CATEGORIES]}
        selected={filters.dishCategory}
        onSelectAll={() => setArr("dishCategory", [...DISH_CATEGORIES])}
        onClear={() => setArr("dishCategory", [])}
        expanded={expandedCategories.has("Dish Category")}
        onToggle={() => toggleCategory("Dish Category")}
      >
        <CheckboxList
          options={[...DISH_CATEGORIES]}
          selected={filters.dishCategory}
          onToggle={(v) => toggleItem("dishCategory", v)}
          counts={counts.dishCategory}
        />
      </CategoryFilter>

      {/* Rating — defaults to partial (up + none); empty ≠ all for this filter */}
      <CategoryFilter
        label="Rating"
        allOptions={RATING_OPTIONS.map((r) => r.value)}
        selected={filters.rating}
        onSelectAll={() => setArr("rating", RATING_OPTIONS.map((r) => r.value))}
        onClear={() => setArr("rating", [])}
        expanded={expandedCategories.has("Rating")}
        onToggle={() => toggleCategory("Rating")}
      >
        <CheckboxList
          options={RATING_OPTIONS.map((r) => r.value)}
          labels={RATING_OPTIONS.map((r) => r.label)}
          selected={filters.rating}
          onToggle={(v) => toggleItem("rating", v)}
          counts={counts.rating}
        />
      </CategoryFilter>

      {/* Ingredient / Component text filters — always visible, no accordion */}
      <div className="rounded-lg border border-gray-100 overflow-hidden">
        <div className="px-3 py-2 bg-gray-50/60">
          <p className="text-sm font-medium text-gray-700">Ingredient / Component</p>
        </div>
        <div className="px-3 pt-2 pb-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TextFilter label="Protein contains"  value={filters.protein}   onChange={(v) => setTxt("protein", v)}   placeholder="e.g. chicken" />
          <TextFilter label="Starch contains"   value={filters.starch}    onChange={(v) => setTxt("starch", v)}    placeholder="e.g. pasta" />
          <TextFilter label="Veg contains"      value={filters.vegetable} onChange={(v) => setTxt("vegetable", v)} placeholder="e.g. spinach" />
        </div>
      </div>

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

// Collapsible accordion for a filter category with Select All / Clear controls
function CategoryFilter({
  label,
  allOptions,
  selected,
  onSelectAll,
  onClear,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  allOptions: string[];
  selected: string[];
  onSelectAll: () => void;
  onClear: () => void;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const selCount = selected.length;
  const total    = allOptions.length;
  const summary  = selCount === 0 ? "None" : selCount >= total ? "All" : `${selCount} of ${total}`;
  const isNone   = selCount === 0;

  return (
    <div className="rounded-lg border border-gray-100 overflow-hidden">
      <div className="flex items-center px-3 py-2 bg-gray-50/60">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center justify-between text-left"
        >
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${isNone ? "text-red-400 font-semibold" : "text-gray-400"}`}>{summary}</span>
            <span className={`text-[10px] text-gray-400 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}>▶</span>
          </div>
        </button>
      </div>
      {expanded && (
        <div className="px-3 pt-2 pb-3 border-t border-gray-100">
          <div className="flex justify-end gap-3 mb-2">
            <button
              onClick={onSelectAll}
              disabled={selCount >= total}
              className="text-xs text-gray-400 hover:text-orange-600 transition-colors disabled:opacity-30"
            >
              All
            </button>
            <button
              onClick={onClear}
              disabled={selCount === 0}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30"
            >
              Clear
            </button>
          </div>
          {children}
        </div>
      )}
    </div>
  );
}

function CheckboxList({
  options,
  labels,
  selected,
  onToggle,
  counts,
}: {
  options: string[];
  labels?: string[];
  selected: string[];
  onToggle: (v: string) => void;
  counts?: Map<string, number>;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {options.map((val, i) => {
        const count = counts?.get(val) ?? 0;
        const zero  = counts !== undefined && count === 0;
        return (
          <label
            key={val}
            className={`flex items-center gap-1.5 text-sm cursor-pointer ${zero ? "text-gray-300" : "text-gray-700 hover:text-gray-900"}`}
          >
            <input
              type="checkbox"
              checked={selected.includes(val)}
              onChange={() => onToggle(val)}
              className="w-4 h-4 rounded border-gray-300 accent-orange-600 cursor-pointer"
            />
            <span className="capitalize">{labels?.[i] ?? val}</span>
            {counts !== undefined && (
              <span className={`text-xs ${zero ? "text-gray-300" : "text-gray-400"}`}>({count})</span>
            )}
          </label>
        );
      })}
    </div>
  );
}

// Checkbox that can be in an indeterminate state (partial region selection)
function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 rounded border-gray-300 accent-orange-600 cursor-pointer flex-shrink-0"
    />
  );
}

function TextFilter({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
      />
    </div>
  );
}
