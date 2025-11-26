/*
  Warnings:

  - You are about to drop the column `teamAverageRating` on the `market_centers` table. All the data in the column will be lost.
  - You are about to drop the column `assignee_id` on the `ticket_ratings` table. All the data in the column will be lost.
  - You are about to drop the column `creator_id` on the `ticket_ratings` table. All the data in the column will be lost.
  - You are about to drop the column `market_center_id` on the `ticket_ratings` table. All the data in the column will be lost.
  - The `assigneeRating` column on the `ticket_ratings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `marketCenterRating` column on the `ticket_ratings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `overallRating` column on the `ticket_ratings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `averageRating` on the `users` table. All the data in the column will be lost.
  - Added the required column `surveyor_id` to the `ticket_ratings` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."ticket_ratings" DROP CONSTRAINT "ticket_ratings_assignee_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."ticket_ratings" DROP CONSTRAINT "ticket_ratings_creator_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."ticket_ratings" DROP CONSTRAINT "ticket_ratings_market_center_id_fkey";

-- DropIndex
DROP INDEX "public"."ticket_ratings_assignee_id_idx";

-- DropIndex
DROP INDEX "public"."ticket_ratings_creator_id_idx";

-- DropIndex
DROP INDEX "public"."ticket_ratings_market_center_id_idx";

-- AlterTable
ALTER TABLE "public"."market_centers" DROP COLUMN "teamAverageRating";

-- AlterTable
ALTER TABLE "public"."ticket_ratings" DROP COLUMN "assignee_id",
DROP COLUMN "creator_id",
DROP COLUMN "market_center_id",
ADD COLUMN     "surveyor_id" TEXT NOT NULL,
DROP COLUMN "assigneeRating",
ADD COLUMN     "assigneeRating" DECIMAL(3,2),
DROP COLUMN "marketCenterRating",
ADD COLUMN     "marketCenterRating" DECIMAL(3,2),
DROP COLUMN "overallRating",
ADD COLUMN     "overallRating" DECIMAL(3,2);

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "averageRating";

-- CreateIndex
CREATE INDEX "ticket_ratings_surveyor_id_idx" ON "public"."ticket_ratings"("surveyor_id");

-- AddForeignKey
ALTER TABLE "public"."ticket_ratings" ADD CONSTRAINT "ticket_ratings_surveyor_id_fkey" FOREIGN KEY ("surveyor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
