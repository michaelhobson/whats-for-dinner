import { prisma } from "@/lib/prisma";
import { getAllKitchenIds } from "@/lib/kitchen";

function parseJSON<T>(s: string, fallback: T): T {
  try { return JSON.parse(s); } catch { return fallback; }
}
function csv(s: string): string[] {
  return s.split(",").map((v) => v.trim()).filter(Boolean);
}

export async function GET() {
  const kitchenIds = await getAllKitchenIds();
  if (kitchenIds.length === 0) {
    return new Response("Unauthorized", { status: 401 });
  }

  const recipes = await prisma.recipe.findMany({
    where: { kitchenId: { in: kitchenIds } },
    include: { cookHistory: { orderBy: { cookedAt: "asc" } } },
    orderBy: { name: "asc" },
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    recipes: recipes.map((r) => ({
      name:          r.name,
      mainProtein:   r.mainProtein,
      mainStarch:    r.mainStarch,
      mainVegetable: r.mainVegetable,
      ingredients:   parseJSON(r.ingredients, []),
      directions:    parseJSON(r.directions, []),
      favorite:      r.favorite,
      dishCategory:  r.dishCategory,
      difficulty:    r.difficulty,
      prepTime:      r.prepTime,
      mealType:      csv(r.mealType),
      cuisine:       parseJSON(r.cuisine, []),
      flavorNotes:   csv(r.flavorNotes),
      season:        csv(r.season),
      cookingMethod: csv(r.cookingMethod),
      rating:        r.rating,
      notes:         r.notes,
      cookHistory:   r.cookHistory.map((log) => ({ cookedAt: log.cookedAt.toISOString() })),
    })),
  };

  const date = new Date().toISOString().split("T")[0];
  const filename = `whats-for-dinner-${date}.json`;

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
