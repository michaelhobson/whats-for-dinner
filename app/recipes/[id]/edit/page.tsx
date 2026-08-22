import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseRecipe } from "@/lib/recipe-utils";
import { updateRecipe } from "@/app/actions/recipes";
import AddRecipeForm from "@/app/recipes/new/AddRecipeForm";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await prisma.recipe.findUnique({ where: { id: Number(id) } });
  return { title: raw ? `Edit ${raw.name} — What's For Dinner?` : "Recipe not found" };
}

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await prisma.recipe.findUnique({ where: { id: Number(id) } });
  if (!raw) notFound();

  const recipe = parseRecipe(raw as Parameters<typeof parseRecipe>[0]);

  return (
    <div className="flex-1 bg-orange-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Recipe</h1>
        <p className="text-sm text-gray-500 mb-8">{recipe.name}</p>
        <AddRecipeForm serverAction={updateRecipe} initialData={recipe} />
      </div>
    </div>
  );
}
