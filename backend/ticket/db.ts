import { SQLDatabase } from "encore.dev/storage/sqldb";
import { PrismaClient } from "@prisma/client";
import { ensurePrismaSchema } from "./ensurePrisma";

export const ticketDB = new SQLDatabase("ticket");

export const ready = ensurePrismaSchema(); // ensure Prisma schema applied in preview

export const prisma = new PrismaClient({
  datasources: { db: { url: ticketDB.connectionString } },
});
