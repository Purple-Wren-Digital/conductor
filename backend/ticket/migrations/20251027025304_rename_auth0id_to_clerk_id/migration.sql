-- AlterTable: Rename auth0Id to clerk_id
ALTER TABLE "users" RENAME COLUMN "auth0Id" TO "clerk_id";

-- Drop old unique constraint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_auth0Id_key";

-- Add new unique constraint  
ALTER TABLE "users" ADD CONSTRAINT "users_clerk_id_key" UNIQUE ("clerk_id");
