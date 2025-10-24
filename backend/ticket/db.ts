import { SQLDatabase } from "encore.dev/storage/sqldb";
import { PrismaClient } from "@prisma/client";

export const ticketDB = new SQLDatabase("ticket", {
  migrations: {
    path: "./migrations",
    source: "prisma",
  },
});

export const prisma = new PrismaClient({
  datasources: { db: { url: ticketDB.connectionString } },
});
