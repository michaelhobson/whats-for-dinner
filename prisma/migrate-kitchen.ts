/**
 * One-time data migration: create the founding Kitchen and assign all existing
 * recipes to it. Run ONCE against the production database after deploying the
 * Phase 2.4 schema changes:
 *
 *   npx tsx prisma/migrate-kitchen.ts
 *
 * WARNING: This script connects to whatever DATABASE_URL is in your .env.
 * Confirm you are targeting the correct database before running.
 *
 * The script is idempotent: if a Kitchen already exists it reuses it, and it
 * only updates recipes whose kitchenId is still null.
 */

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"]! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Reuse existing founding kitchen if already created
  let kitchen = await prisma.kitchen.findFirst({ orderBy: { createdAt: "asc" } });

  if (kitchen) {
    console.log(`Using existing kitchen: "${kitchen.name}" (id: ${kitchen.id})`);
  } else {
    kitchen = await prisma.kitchen.create({ data: { name: "Our Kitchen" } });
    console.log(`Created founding kitchen: "${kitchen.name}" (id: ${kitchen.id})`);
  }

  const result = await prisma.recipe.updateMany({
    where: { kitchenId: null },
    data: { kitchenId: kitchen.id },
  });

  console.log(`Updated ${result.count} recipe(s) → kitchenId=${kitchen.id}`);
  console.log("Migration complete.");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
