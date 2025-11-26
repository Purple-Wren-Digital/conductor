-- AlterTable
ALTER TABLE "public"."todos" ADD COLUMN     "created_by" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "updated_by" JSONB;
