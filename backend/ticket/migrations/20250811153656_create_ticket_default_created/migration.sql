-- AlterEnum
ALTER TYPE "public"."TicketStatus" ADD VALUE 'CREATED';

-- AlterTable
ALTER TABLE "public"."comments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "public"."tickets" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text,
ALTER COLUMN "status" SET DEFAULT 'CREATED';

-- AlterTable
ALTER TABLE "public"."users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
