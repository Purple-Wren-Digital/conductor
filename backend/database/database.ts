import { SQLDatabase } from "encore.dev/storage/sqldb";

// One physical database for the whole app.
// Do NOT set a migrations path here when you want per-service Prisma migrations.
export const DB = new SQLDatabase("conductor-db");
