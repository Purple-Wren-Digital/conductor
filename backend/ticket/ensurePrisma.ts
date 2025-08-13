import { promisify } from "node:util";
import { execFile } from "node:child_process";
const exec = promisify(execFile);

let ran = false;

// Runs once per process; creates tables in preview envs.
export async function ensurePrismaSchema() {
  if (ran) return;
  ran = true;

  // Only run on previews; set this in Encore Cloud env for PR envs.
  if (!process.env.PR_PREVIEW) return;

  const schemaArg = "--schema=./ticket/schema.prisma";

  try {
    // If you keep migrations in git, use deploy (preferred).
    await exec("npx", ["prisma", "migrate", "deploy", schemaArg], {
      cwd: process.cwd(),
    });
  } catch {
    // Fallback for early development if you don't have migrations yet.
    await exec("npx", ["prisma", "db", "push", schemaArg], {
      cwd: process.cwd(),
    });
  }
}
