import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { parseRecipe, difficultyStyle, ParsedRecipe } from "@/lib/recipe-utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await prisma.recipe.findUnique({ where: { id: Number(id) } });
  return { title: raw ? `${raw.name} — What's For Dinner?` : "Recipe not found" };
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await prisma.recipe.findUnique({ where: { id: Number(id) } });
  if (!raw) notFound();

  const recipe = parseRecipe(raw as Parameters<typeof parseRecipe>[0]);
  const diff = difficultyStyle[recipe.difficulty];

  return (
    <div className="flex-1 bg-orange-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Back link */}
        <Link
          href="/recipes"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-700 hover:text-orange-900 transition-colors mb-8"
        >
          ← All Recipes
        </Link>

        {/* Title */}
        <div className="flex items-start gap-3 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 leading-tight flex-1">
            {recipe.name}
          </h1>
          {recipe.favorite && (
            <span className="text-2xl mt-1 flex-shrink-0" title="Favourite">
              ❤️
            </span>
          )}
        </div>

        {/* Quick-stat chips */}
        <div className="flex flex-wrap gap-2 mb-10">
          {recipe.mealType.map((t) => (
            <Chip key={t} color="purple">
              {t}
            </Chip>
          ))}
          {recipe.cuisine.map((c) => (
            <Chip key={c} color="blue">
              {c}
            </Chip>
          ))}
          {recipe.dishCategory && (
            <Chip color="orange">{recipe.dishCategory}</Chip>
          )}
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${diff.className}`}
          >
            {diff.label}
          </span>
          <Chip color="gray">⏱ {recipe.prepTime} min</Chip>
        </div>

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
            <ul className="space-y-2.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-[7px]" />
                  <span className="text-gray-700">
                    {ing.quantity && (
                      <span className="font-semibold text-gray-900">{ing.quantity} </span>
                    )}
                    {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Tags */}
          <Section title="Details">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <TagRow label="Season" values={recipe.season} />
              <TagRow label="Cooking Method" values={recipe.cookingMethod} />
              <TagRow label="Flavor Notes" values={recipe.flavorNotes} />
            </dl>
          </Section>
        </div>
      </div>
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
    blue: "bg-blue-100 text-blue-700",
    orange: "bg-orange-100 text-orange-700",
    gray: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${colorMap[color]}`}
    >
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
    green: "text-green-600",
  }[accent];
  return (
    <div className={`${bg} rounded-xl px-4 py-3 min-w-[120px]`}>
      <p className={`text-xs uppercase tracking-wide font-semibold mb-1 ${labelColor}`}>
        {label}
      </p>
      <p className="font-medium text-gray-800 capitalize">{value}</p>
    </div>
  );
}

function TagRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">
        {label}
      </dt>
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
