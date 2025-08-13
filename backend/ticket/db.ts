import { SQLDatabase } from "encore.dev/storage/sqldb";
import { PrismaClient } from "@prisma/client";

export const ticketDB = new SQLDatabase("ticket"); // ← remove migrations

export const prisma = new PrismaClient({
  datasources: { db: { url: ticketDB.connectionString } },
});
