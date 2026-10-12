import { ParsedRecipe, difficultyStyle, ingredientQty } from "@/lib/recipe-utils";

// Shared read-only recipe display, used by both the full recipe detail page
// (which wraps these with edit/delete/rate/notes controls for members) and
// the public share page (which never shows those controls). Keeping this in
// one place means the two pages can't silently drift apart.

export function RecipeHeader({ recipe }: { recipe: ParsedRecipe }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <h1 className="text-3xl font-bold text-gray-900 leading-tight flex-1">
        {recipe.name}
      </h1>
      {recipe.favorite && (
        <span className="text-2xl mt-1 flex-shrink-0" title="Favourite">❤️</span>
      )}
    </div>
  );
}

export function RecipeStatChips({ recipe }: { recipe: ParsedRecipe }) {
  const diff = difficultyStyle[recipe.difficulty];
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {recipe.mealType.map((t) => (
        <Chip key={t} color="purple">{t}</Chip>
      ))}
      {recipe.cuisine.map((p, i) => (
        <Chip key={i} color="blue">{p.region} › {p.style}</Chip>
      ))}
      {recipe.dishCategory && (
        <Chip color="orange">{recipe.dishCategory}</Chip>
      )}
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${diff.className}`}>
        {diff.label}
      </span>
      <Chip color="gray">⏱ {recipe.prepTime} min</Chip>
    </div>
  );
}

export function RecipeBody({ recipe }: { recipe: ParsedRecipe }) {
  return (
    <div className="space-y-10">
      {/* Main components */}
      {(recipe.mainProtein || recipe.mainStarch || recipe.mainVegetable) && (
        <Section title="Main Components">
          <div className="flex flex-wrap gap-3">
            {recipe.mainProtein && (
              <ComponentTile label="Protein" value={recipe.mainProtein} accent="orange" />
            )}
            {recipe.mainStarch && (
              <ComponentTile label="Starch" value={recipe.mainStarch} accent="yellow" />
            )}
            {recipe.mainVegetable && (
              <ComponentTile label="Vegetable" value={recipe.mainVegetable} accent="green" />
            )}
          </div>
        </Section>
      )}

      {/* Ingredients */}
      <Section title="Ingredients">
        {recipe.ingredients.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No ingredients listed.</p>
        ) : (
          <ul className="space-y-2.5">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-baseline gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-[7px]" />
                <span className="text-gray-700">
                  {ingredientQty(ing) && (
                    <span className="font-semibold text-gray-900">{ingredientQty(ing)} </span>
                  )}
                  {ing.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Directions */}
      {recipe.directions.length > 0 && (
        <Section title="Directions">
          <ol className="space-y-4">
            {recipe.directions.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <p className="text-gray-700 leading-relaxed pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Tags */}
      <Section title="Details">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <TagRow label="Season" values={recipe.season} />
          <TagRow label="Cooking Method" values={recipe.cookingMethod} />
          <TagRow label="Flavor Notes" values={recipe.flavorNotes} />
        </dl>
      </Section>
    </div>
  );
}

/* ── Small presentational sub-components ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-orange-100">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Chip({
  color,
  children,
}: {
  color: "purple" | "blue" | "orange" | "gray";
  children: React.ReactNode;
}) {
  const colorMap = {
    purple: "bg-purple-100 text-purple-700",
    blue:   "bg-blue-100 text-blue-700",
    orange: "bg-orange-100 text-orange-700",
    gray:   "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${colorMap[color]}`}>
      {children}
    </span>
  );
}

function ComponentTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "orange" | "yellow" | "green";
}) {
  const bg = { orange: "bg-orange-50", yellow: "bg-yellow-50", green: "bg-green-50" }[accent];
  const labelColor = {
    orange: "text-orange-500",
    yellow: "text-yellow-600",
    green:  "text-green-600",
  }[accent];
  return (
    <div className={`${bg} rounded-xl px-4 py-3 min-w-[120px]`}>
      <p className={`text-xs uppercase tracking-wide font-semibold mb-1 ${labelColor}`}>{label}</p>
      <p className="font-medium text-gray-800 capitalize">{value}</p>
    </div>
  );
}

function TagRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">{label}</dt>
      <dd className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="text-sm px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-700 capitalize"
          >
            {v}
          </span>
        ))}
      </dd>
    </div>
  );
}
