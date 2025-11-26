/*
  Warnings:

  - Made the column `market_center_id` on table `ticket_ratings` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."ticket_ratings" ALTER COLUMN "market_center_id" SET NOT NULL,
ALTER COLUMN "assigneeRating" SET DATA TYPE TEXT,
ALTER COLUMN "marketCenterRating" SET DATA TYPE TEXT,
ALTER COLUMN "overallRating" SET DATA TYPE TEXT;
