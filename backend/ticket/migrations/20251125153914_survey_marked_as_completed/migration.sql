/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `ticket_ratings` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."ticket_ratings" ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "updated_at" DROP NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "ticket_ratings_id_key" ON "public"."ticket_ratings"("id");

-- CreateIndex
CREATE INDEX "ticket_ratings_assignee_id_idx" ON "public"."ticket_ratings"("assignee_id");

-- CreateIndex
CREATE INDEX "ticket_ratings_market_center_id_idx" ON "public"."ticket_ratings"("market_center_id");
