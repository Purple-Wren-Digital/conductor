-- AlterTable: Rename auth0Id to clerk_id (idempotent)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'auth0Id'
    ) THEN
        ALTER TABLE "users" RENAME COLUMN "auth0Id" TO "clerk_id";
        ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_auth0Id_key";
        ALTER TABLE "users" ADD CONSTRAINT "users_clerk_id_key" UNIQUE ("clerk_id");
    END IF;
END $$;
