import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function makeClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Key is versioned so that running `prisma generate` after a schema change
// forces a fresh client instance on the next HMR reload, without needing a
// full dev-server restart.
const KEY = "__prisma_v5__";
const globalForPrisma = globalThis as unknown as { [KEY]: PrismaClient };

export const prisma = globalForPrisma[KEY] ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma[KEY] = prisma;
