import { createRecipe } from "@/app/actions/recipes";
import AddRecipeForm from "./AddRecipeForm";

export const metadata = { title: "Add a Recipe — What's For Dinner?" };

export default function NewRecipePage() {
  return (
    <div className="flex-1 bg-orange-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Add a Recipe</h1>
        <AddRecipeForm serverAction={createRecipe} />
      </div>
    </div>
  );
}
