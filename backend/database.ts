import { SQLDatabase } from "encore.dev/storage/sqldb";

export const DB = new SQLDatabase("conductor", {
  migrations: {
    path: "./prisma/migrations",
    source: "prisma",
  },
});
