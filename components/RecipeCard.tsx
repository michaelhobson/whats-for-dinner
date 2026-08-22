import Link from "next/link";
import { ParsedRecipe, difficultyStyle } from "@/lib/recipe-utils";

export default function RecipeCard({ recipe }: { recipe: ParsedRecipe }) {
  const diff = difficultyStyle[recipe.difficulty];

  return (
    <Link href={`/recipes/${recipe.id}`} className="group block h-full">
      <article className="bg-white rounded-2xl border border-orange-100 shadow-sm h-full flex flex-col gap-3 p-5 transition-all duration-150 group-hover:shadow-md group-hover:-translate-y-0.5">
        {/* Meal type chips + favorite */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {recipe.mealType.map((t) => (
              <span
                key={t}
                className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 capitalize font-medium"
              >
                {t}
              </span>
            ))}
          </div>
          {recipe.favorite && (
            <span title="Favourite" className="text-lg leading-none select-none">
              ❤️
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="font-semibold text-gray-900 text-lg leading-snug group-hover:text-orange-700 transition-colors">
          {recipe.name}
        </h3>

        {/* Main components */}
        {(recipe.mainProtein || recipe.mainStarch || recipe.mainVegetable) && (
          <p className="text-sm text-gray-500 capitalize">
            {[recipe.mainProtein, recipe.mainStarch, recipe.mainVegetable]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}

        {/* Cuisine */}
        <div className="flex flex-wrap gap-1">
          {recipe.cuisine.map((p, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium"
            >
              {p.style}
            </span>
          ))}
        </div>

        {/* Spacer so bottom row sticks to bottom */}
        <div className="flex-1" />

        {/* Flavor notes */}
        {recipe.flavorNotes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.flavorNotes.slice(0, 4).map((note) => (
              <span
                key={note}
                className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 capitalize"
              >
                {note}
              </span>
            ))}
          </div>
        )}

        {/* Prep time + difficulty */}
        <div className="flex items-center gap-3 text-sm pt-1 border-t border-gray-50">
          <span className="text-gray-500">⏱ {recipe.prepTime} min</span>
          <span
            className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold ${diff.className}`}
          >
            {diff.label}
          </span>
        </div>
      </article>
    </Link>
  );
}
