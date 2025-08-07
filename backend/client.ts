import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DB } from "../database";

// Create and export the Prisma client instance
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DB.connectionString }),
});

// Re-export types from the generated client
export * from "./generated/client";
