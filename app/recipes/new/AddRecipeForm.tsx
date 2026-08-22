"use client";

import { useActionState, useState } from "react";
import { RecipeFormState } from "@/app/actions/recipes";
import { CUISINE_REGIONS, regionToStyles, CuisinePairing } from "@/lib/cuisine";
import { ParsedRecipe } from "@/lib/recipe-utils";

// ── Option constants ──────────────────────────────────────────────────────────

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "dessert", "snack"] as const;

const FLAVOR_NOTES = [
  "rich", "sweet", "bright", "cheesy", "creamy", "spicy", "umami", "tangy",
  "smoky", "herby", "nutty", "garlicky",
] as const;

const SEASONS = ["spring", "summer", "fall", "winter", "any"] as const;

const COOKING_METHODS: { value: string; label: string }[] = [
  { value: "oven",         label: "Oven" },
  { value: "stovetop",     label: "Stovetop" },
  { value: "instant-pot",  label: "Instant Pot" },
  { value: "slow-cooker",  label: "Slow Cooker" },
  { value: "grill",        label: "Grill" },
  { value: "no-cook",      label: "No Cook" },
  { value: "air-fryer",    label: "Air Fryer" },
];

const UNIT_OPTIONS = [
  { group: "Weight",  units: ["g", "kg", "oz", "lb"] },
  { group: "Volume",  units: ["ml", "L", "tsp", "tbsp", "cup"] },
  { group: "Count",   units: ["piece", "slice", "clove", "can", "head", "sheet", "bunch"] },
  { group: "Other",   units: ["handful", "pinch", "to taste", "as needed"] },
] as const;

// ── Shared style tokens ───────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition";

const labelCls = "block text-sm font-medium text-gray-700 mb-1";

// ── Types ─────────────────────────────────────────────────────────────────────

type Ingredient = { amount: string; unit: string; name: string };

type FormAction = (state: RecipeFormState, formData: FormData) => Promise<RecipeFormState>;

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddRecipeForm({
  serverAction,
  initialData,
}: {
  serverAction: FormAction;
  initialData?: ParsedRecipe;
}) {
  const [state, formAction, isPending] = useActionState(serverAction, null);

  const isEdit = initialData != null;

  const [name, setName] = useState(initialData?.name ?? "");
  const [nameError, setNameError] = useState("");

  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    if (initialData?.ingredients?.length) {
      return initialData.ingredients.map((ing) => ({
        amount: ing.amount ?? "",
        unit:   ing.unit ?? "",
        name:   ing.name,
      }));
    }
    return [{ amount: "", unit: "", name: "" }];
  });

  const [directions, setDirections] = useState<string[]>(() => {
    if (initialData?.directions?.length) return initialData.directions;
    return [""];
  });

  // Cuisine picker state
  const [cuisines, setCuisines] = useState<CuisinePairing[]>(initialData?.cuisine ?? []);
  const [pickerOpen, setPickerOpen] = useState((initialData?.cuisine.length ?? 0) === 0);
  const [pickerIndex, setPickerIndex] = useState(0);
  const [pickerRegion, setPickerRegion] = useState<string | null>(null);

  // ── Ingredient helpers ────────────────────────────────────────────────────
  const addIngredient = () =>
    setIngredients((prev) => [...prev, { amount: "", unit: "", name: "" }]);
  const removeIngredient = (i: number) =>
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, field: keyof Ingredient, val: string) =>
    setIngredients((prev) =>
      prev.map((ing, idx) => (idx === i ? { ...ing, [field]: val } : ing))
    );

  // ── Directions helpers ────────────────────────────────────────────────────
  const addDirection = () =>
    setDirections((prev) => [...prev, ""]);
  const removeDirection = (i: number) =>
    setDirections((prev) => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);
  const updateDirection = (i: number, val: string) =>
    setDirections((prev) => prev.map((s, idx) => (idx === i ? val : s)));
  const moveDirection = (i: number, delta: -1 | 1) =>
    setDirections((prev) => {
      const next = [...prev];
      const j = i + delta;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // ── Cuisine helpers ───────────────────────────────────────────────────────
  const pickStyle = (style: string) => {
    if (!pickerRegion) return;
    const pairing: CuisinePairing = { region: pickerRegion, style };
    if (pickerIndex < cuisines.length) {
      setCuisines((prev) => prev.map((c, i) => (i === pickerIndex ? pairing : c)));
    } else {
      setCuisines((prev) => [...prev, pairing]);
    }
    setPickerOpen(false);
    setPickerRegion(null);
  };

  const editCuisine = (i: number) => {
    setPickerIndex(i);
    setPickerRegion(cuisines[i].region);
    setPickerOpen(true);
  };

  const removeCuisine = (i: number) => {
    setCuisines((prev) => prev.filter((_, idx) => idx !== i));
    if (pickerOpen && pickerIndex === i) {
      setPickerOpen(false);
      setPickerRegion(null);
    }
  };

  const openAddPicker = () => {
    setPickerIndex(cuisines.length);
    setPickerRegion(null);
    setPickerOpen(true);
  };

  // ── Form submit ───────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!name.trim()) {
      e.preventDefault();
      setNameError("Please enter a recipe name.");
      (e.currentTarget.elements.namedItem("name") as HTMLInputElement)?.focus();
      return;
    }
    setNameError("");
  };

  const ingredientsJson = JSON.stringify(
    ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({
        name: i.name.trim(),
        ...(i.amount.trim() ? { amount: i.amount.trim() } : {}),
        ...(i.unit ? { unit: i.unit } : {}),
      }))
  );

  const directionsJson = JSON.stringify(
    directions.filter((s) => s.trim()).map((s) => s.trim())
  );

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-5">
      {/* Hidden id for edit mode */}
      {isEdit && <input type="hidden" name="id" value={initialData.id} />}

      {state?.error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* ── Recipe Info ── */}
      <FormSection title="Recipe Info">
        <div className="space-y-4">
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
            {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Main Protein"   name="mainProtein"   placeholder="e.g. chicken" defaultValue={initialData?.mainProtein ?? undefined} />
            <Field label="Main Starch"    name="mainStarch"    placeholder="e.g. pasta"   defaultValue={initialData?.mainStarch ?? undefined} />
            <Field label="Main Vegetable" name="mainVegetable" placeholder="e.g. spinach" defaultValue={initialData?.mainVegetable ?? undefined} />
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
                value={ing.amount}
                onChange={(e) => updateIngredient(i, "amount", e.target.value)}
                className="w-14 flex-shrink-0 rounded-lg border border-gray-300 px-2 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition text-center"
              />
              <select
                value={ing.unit}
                onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                className="w-[100px] flex-shrink-0 rounded-lg border border-gray-300 px-2 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
              >
                <option value="">— unit —</option>
                {UNIT_OPTIONS.map(({ group, units }) => (
                  <optgroup key={group} label={group}>
                    {units.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
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

      {/* ── Directions ── */}
      <FormSection title="Directions">
        <div className="space-y-2">
          {directions.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-6 pt-2.5 text-sm font-semibold text-orange-400 flex-shrink-0 select-none text-center">
                {i + 1}.
              </span>
              <textarea
                value={step}
                onChange={(e) => updateDirection(i, e.target.value)}
                placeholder={`Step ${i + 1}…`}
                rows={2}
                className={`${inputCls} flex-1 min-w-0 resize-none`}
              />
              <div className="flex flex-col gap-0.5 flex-shrink-0 pt-1">
                <button
                  type="button"
                  onClick={() => moveDirection(i, -1)}
                  disabled={i === 0}
                  aria-label="Move step up"
                  className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-xs"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveDirection(i, 1)}
                  disabled={i === directions.length - 1}
                  aria-label="Move step down"
                  className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-xs"
                >
                  ▼
                </button>
              </div>
              {directions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDirection(i)}
                  aria-label="Remove step"
                  className="flex-shrink-0 w-7 h-7 mt-1 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addDirection}
            className="mt-2 text-sm font-medium text-orange-600 hover:text-orange-800 transition-colors"
          >
            + Add Step
          </button>
        </div>
        <input type="hidden" name="directions" value={directionsJson} />
      </FormSection>

      {/* ── Classification ── */}
      <FormSection title="Classification">
        <div className="space-y-5">
          <CheckboxGroup
            label="Meal Type"
            name="mealType"
            options={MEAL_TYPES}
            defaultValues={initialData?.mealType}
          />

          <div>
            <label className={labelCls} htmlFor="dishCategory">
              Dish Category
            </label>
            <input
              id="dishCategory"
              name="dishCategory"
              type="text"
              defaultValue={initialData?.dishCategory ?? undefined}
              placeholder="e.g. pasta, soup, stir-fry, grain bowl, salad"
              className={inputCls}
            />
          </div>

          {/* ── Cuisine picker ── */}
          <div>
            <p className={labelCls}>
              Cuisine{" "}
              <span className="font-normal text-gray-400 text-xs">
                (up to 2 pairings — great for fusion dishes)
              </span>
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {cuisines.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-800 font-medium"
                >
                  {c.region} ▸ {c.style}
                  <button
                    type="button"
                    onClick={() => editCuisine(i)}
                    aria-label="Edit cuisine"
                    className="ml-0.5 text-blue-400 hover:text-blue-700 transition-colors leading-none"
                    title="Edit"
                  >
                    ✏
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCuisine(i)}
                    aria-label="Remove cuisine"
                    className="text-blue-300 hover:text-red-500 transition-colors leading-none"
                    title="Remove"
                  >
                    ×
                  </button>
                </span>
              ))}

              {!pickerOpen && cuisines.length === 1 && (
                <button
                  type="button"
                  onClick={openAddPicker}
                  className="text-sm text-blue-500 hover:text-blue-700 underline decoration-dotted transition-colors"
                >
                  + Add another cuisine (for fusion dishes)
                </button>
              )}
            </div>

            {pickerOpen && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4 space-y-3">
                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">
                  {pickerIndex < cuisines.length
                    ? "Edit cuisine"
                    : cuisines.length === 0
                    ? "Select a cuisine"
                    : "Add second cuisine"}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {CUISINE_REGIONS.map(({ region }) => {
                    const isActive = pickerRegion === region;
                    const isMuted = pickerRegion !== null && !isActive;
                    return (
                      <button
                        key={region}
                        type="button"
                        onClick={() => setPickerRegion(region)}
                        className={`rounded-full border font-medium transition-all ${
                          isActive
                            ? "px-3 py-1.5 text-sm bg-blue-600 text-white border-blue-600 shadow-sm"
                            : isMuted
                            ? "px-2 py-1 text-[11px] bg-white text-gray-400 border-gray-200 hover:border-blue-300 hover:text-gray-600"
                            : "px-3 py-1.5 text-sm bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-700"
                        }`}
                      >
                        {region}
                      </button>
                    );
                  })}
                </div>

                {pickerRegion && (
                  <div className="pt-1 pl-3 border-l-2 border-blue-300">
                    <p className="text-xs text-blue-500 font-semibold mb-2">{pickerRegion}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(regionToStyles[pickerRegion] ?? []).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => pickStyle(style)}
                          className="px-3 py-1 rounded-full text-sm border bg-white text-gray-700 border-gray-300 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => { setPickerOpen(false); setPickerRegion(null); }}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {!pickerOpen && cuisines.length === 0 && (
              <button
                type="button"
                onClick={() => { setPickerOpen(true); setPickerIndex(0); setPickerRegion(null); }}
                className="text-sm text-blue-500 hover:text-blue-700 underline decoration-dotted"
              >
                + Select cuisine
              </button>
            )}

            <input type="hidden" name="cuisineJson" value={JSON.stringify(cuisines)} />
          </div>

          <CheckboxGroup
            label="Season"
            name="season"
            options={SEASONS}
            defaultValues={initialData?.season}
          />
        </div>
      </FormSection>

      {/* ── Cooking Details ── */}
      <FormSection title="Cooking Details">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor="difficulty">Difficulty</label>
              <select
                id="difficulty"
                name="difficulty"
                defaultValue={initialData?.difficulty ?? "medium"}
                className={`${inputCls} bg-white`}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="prepTime">Estimated Time</label>
              <div className="flex items-center gap-2">
                <input
                  id="prepTime"
                  name="prepTime"
                  type="number"
                  min={1}
                  max={480}
                  defaultValue={initialData?.prepTime ?? 30}
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
            defaultValues={initialData?.cookingMethod}
          />
        </div>
      </FormSection>

      {/* ── Flavor & More ── */}
      <FormSection title="Flavor & More">
        <div className="space-y-5">
          <CheckboxGroup
            label="Flavor Notes"
            name="flavorNotes"
            options={FLAVOR_NOTES}
            defaultValues={initialData?.flavorNotes}
          />

          <div>
            <p className={labelCls}>Favourite</p>
            <label className="inline-flex items-center gap-3 cursor-pointer select-none">
              <div className="relative w-10 h-6 flex-shrink-0">
                <input
                  type="checkbox"
                  name="favorite"
                  defaultChecked={initialData?.favorite ?? false}
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
          {isPending ? "Saving…" : isEdit ? "Save Changes" : "Save Recipe"}
        </button>
      </div>
    </form>
  );
}

// ── Presentational sub-components ────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
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
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
      />
    </div>
  );
}

function CheckboxGroup({
  label,
  name,
  options,
  labels,
  defaultValues,
}: {
  label: string;
  name: string;
  options: readonly string[];
  labels?: string[];
  defaultValues?: string[];
}) {
  return (
    <div>
      <p className="block text-sm font-medium text-gray-700 mb-1">{label}</p>
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
              defaultChecked={defaultValues?.includes(value)}
              className="w-4 h-4 rounded border-gray-300 accent-orange-600 cursor-pointer"
            />
            <span className="capitalize">{labels?.[i] ?? value}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
