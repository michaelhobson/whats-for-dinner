"use client";

import { useActionState, useState } from "react";
import { createRecipe } from "@/app/actions/recipes";

// ── Option constants ──────────────────────────────────────────────────────────

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "dessert", "snack"] as const;

const CUISINE_REGIONS = [
  "East Asian",
  "Southeast Asian",
  "South Asian",
  "Middle Eastern",
  "Mediterranean",
  "Eastern European",
  "Western European",
  "Latin American",
  "North American",
  "African",
  "Caribbean",
] as const;

const FLAVOR_NOTES = [
  "rich",
  "sweet",
  "bright",
  "cheesy",
  "creamy",
  "spicy",
  "umami",
  "tangy",
] as const;

const SEASONS = ["spring", "summer", "fall", "winter", "any"] as const;

const COOKING_METHODS: { value: string; label: string }[] = [
  { value: "oven", label: "Oven" },
  { value: "stovetop", label: "Stovetop" },
  { value: "instant-pot", label: "Instant Pot" },
  { value: "slow-cooker", label: "Slow Cooker" },
  { value: "grill", label: "Grill" },
  { value: "no-cook", label: "No Cook" },
  { value: "air-fryer", label: "Air Fryer" },
];

// ── Shared style tokens ───────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition";

const labelCls = "block text-sm font-medium text-gray-700 mb-1";

// ── Component ─────────────────────────────────────────────────────────────────

type Ingredient = { quantity: string; name: string };

export default function AddRecipeForm() {
  const [state, formAction, isPending] = useActionState(createRecipe, null);

  // Controlled only for the fields that need client logic
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { quantity: "", name: "" },
  ]);
  const [cuisines, setCuisines] = useState<string[]>([]);

  // Ingredient helpers
  const addIngredient = () =>
    setIngredients((prev) => [...prev, { quantity: "", name: "" }]);
  const removeIngredient = (i: number) =>
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, field: keyof Ingredient, val: string) =>
    setIngredients((prev) =>
      prev.map((ing, idx) => (idx === i ? { ...ing, [field]: val } : ing))
    );

  // Cuisine toggle — max 2
  const toggleCuisine = (region: string) => {
    setCuisines((prev) =>
      prev.includes(region)
        ? prev.filter((c) => c !== region)
        : prev.length < 2
        ? [...prev, region]
        : prev
    );
  };

  // Client-side name validation before submit
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!name.trim()) {
      e.preventDefault();
      setNameError("Please enter a recipe name.");
      (e.currentTarget.elements.namedItem("name") as HTMLInputElement)?.focus();
      return;
    }
    setNameError("");
  };

  // Serialised ingredients for the hidden input
  const ingredientsJson = JSON.stringify(
    ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({
        name: i.name.trim(),
        ...(i.quantity.trim() ? { quantity: i.quantity.trim() } : {}),
      }))
  );

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-5">
      {/* Server-action error fallback */}
      {state?.error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* ── Recipe Info ── */}
      <FormSection title="Recipe Info">
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls} htmlFor="name">
              Recipe Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError("");
              }}
              placeholder="e.g. Pasta Carbonara"
              className={inputCls}
            />
            {nameError && (
              <p className="mt-1 text-sm text-red-600">{nameError}</p>
            )}
          </div>

          {/* Main components */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Main Protein" name="mainProtein" placeholder="e.g. chicken" />
            <Field label="Main Starch" name="mainStarch" placeholder="e.g. pasta" />
            <Field label="Main Vegetable" name="mainVegetable" placeholder="e.g. spinach" />
          </div>
        </div>
      </FormSection>

      {/* ── Ingredients ── */}
      <FormSection title="Ingredients">
        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Qty"
                value={ing.quantity}
                onChange={(e) => updateIngredient(i, "quantity", e.target.value)}
                className={`${inputCls} w-28 flex-shrink-0`}
              />
              <input
                type="text"
                placeholder="Ingredient name"
                value={ing.name}
                onChange={(e) => updateIngredient(i, "name", e.target.value)}
                className={`${inputCls} flex-1 min-w-0`}
              />
              {ingredients.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
                  aria-label="Remove ingredient"
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addIngredient}
            className="mt-2 text-sm font-medium text-orange-600 hover:text-orange-800 transition-colors"
          >
            + Add Ingredient
          </button>
        </div>
        <input type="hidden" name="ingredients" value={ingredientsJson} />
      </FormSection>

      {/* ── Classification ── */}
      <FormSection title="Classification">
        <div className="space-y-5">
          <CheckboxGroup label="Meal Type" name="mealType" options={MEAL_TYPES} />

          <div>
            <label className={labelCls} htmlFor="dishCategory">
              Dish Category
            </label>
            <input
              id="dishCategory"
              name="dishCategory"
              type="text"
              placeholder="e.g. pasta, soup, stir-fry, grain bowl, salad"
              className={inputCls}
            />
          </div>

          {/* Cuisine — max 2 pill-toggles */}
          <div>
            <p className={labelCls}>
              Cuisine{" "}
              <span className="font-normal text-gray-400 text-xs">
                (pick up to 2 regions)
              </span>
            </p>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {CUISINE_REGIONS.map((region) => {
                const checked = cuisines.includes(region);
                const disabled = !checked && cuisines.length >= 2;
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => toggleCuisine(region)}
                    disabled={disabled}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      checked
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : disabled
                        ? "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-700"
                    }`}
                  >
                    {region}
                  </button>
                );
              })}
            </div>
            {/* Hidden inputs carry the selection into FormData */}
            {cuisines.map((c) => (
              <input key={c} type="hidden" name="cuisine" value={c} />
            ))}
          </div>

          <CheckboxGroup label="Season" name="season" options={SEASONS} />
        </div>
      </FormSection>

      {/* ── Cooking Details ── */}
      <FormSection title="Cooking Details">
        <div className="space-y-5">
          {/* Difficulty + Prep Time side-by-side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor="difficulty">
                Difficulty
              </label>
              <select
                id="difficulty"
                name="difficulty"
                defaultValue="medium"
                className={`${inputCls} bg-white`}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="prepTime">
                Estimated Time
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="prepTime"
                  name="prepTime"
                  type="number"
                  min={1}
                  max={480}
                  defaultValue={30}
                  className={`${inputCls} w-20`}
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">min</span>
              </div>
            </div>
          </div>

          <CheckboxGroup
            label="Cooking Method"
            name="cookingMethod"
            options={COOKING_METHODS.map((m) => m.value)}
            labels={COOKING_METHODS.map((m) => m.label)}
          />
        </div>
      </FormSection>

      {/* ── Flavor & More ── */}
      <FormSection title="Flavor & More">
        <div className="space-y-5">
          <CheckboxGroup label="Flavor Notes" name="flavorNotes" options={FLAVOR_NOTES} />

          {/* Favourite toggle */}
          <div>
            <p className={labelCls}>Favourite</p>
            <label className="inline-flex items-center gap-3 cursor-pointer select-none">
              <div className="relative w-10 h-6 flex-shrink-0">
                <input
                  type="checkbox"
                  name="favorite"
                  className="sr-only peer"
                />
                <div className="absolute inset-0 bg-gray-200 rounded-full transition-colors peer-checked:bg-orange-500" />
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
              </div>
              <span className="text-sm text-gray-700">Mark as favourite ❤️</span>
            </label>
          </div>
        </div>
      </FormSection>

      {/* ── Submit ── */}
      <div className="flex justify-end pt-2 pb-6">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-orange-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving…" : "Save Recipe"}
        </button>
      </div>
    </form>
  );
}

// ── Presentational sub-components ────────────────────────────────────────────

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
      <div className="px-6 py-3 bg-orange-50 border-b border-orange-100">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-orange-600">
          {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={labelCls} htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  );
}

function CheckboxGroup({
  label,
  name,
  options,
  labels,
}: {
  label: string;
  name: string;
  options: readonly string[];
  labels?: string[];
}) {
  return (
    <div>
      <p className={labelCls}>{label}</p>
      <div className="flex flex-wrap gap-x-5 gap-y-2.5 mt-1.5">
        {options.map((value, i) => (
          <label
            key={value}
            className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900"
          >
            <input
              type="checkbox"
              name={name}
              value={value}
              className="w-4 h-4 rounded border-gray-300 accent-orange-600 cursor-pointer"
            />
            <span className="capitalize">{labels?.[i] ?? value}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
