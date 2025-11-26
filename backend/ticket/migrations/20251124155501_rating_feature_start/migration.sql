/*
  Warnings:

  - You are about to drop the column `metadata` on the `comments` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `comments` table. All the data in the column will be lost.
  - You are about to drop the column `email_message_id` on the `tickets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."comments" DROP COLUMN "metadata",
DROP COLUMN "source";

-- AlterTable
ALTER TABLE "public"."tickets" DROP COLUMN "email_message_id";

-- DropEnum
DROP TYPE "public"."CommentSource";

-- CreateTable
CREATE TABLE "public"."ticket_ratings" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "ticket_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "market_center_id" TEXT NOT NULL,
    "assigneeRating" DECIMAL(3,2),
    "marketCenterRating" DECIMAL(3,2),
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_ratings_ticket_id_key" ON "public"."ticket_ratings"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_ratings_creator_id_idx" ON "public"."ticket_ratings"("creator_id");

-- CreateIndex
CREATE INDEX "ticket_ratings_assignee_id_idx" ON "public"."ticket_ratings"("assignee_id");

-- CreateIndex
CREATE INDEX "ticket_ratings_market_center_id_idx" ON "public"."ticket_ratings"("market_center_id");
