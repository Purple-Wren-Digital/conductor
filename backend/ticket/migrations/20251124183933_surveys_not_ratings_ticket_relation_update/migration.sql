/*
  Warnings:

  - You are about to drop the column `ticket_description` on the `ticket_ratings` table. All the data in the column will be lost.
  - You are about to drop the column `ticket_name` on the `ticket_ratings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."market_centers" ADD COLUMN     "teamAverageRating" DECIMAL(3,2);

-- AlterTable
ALTER TABLE "public"."ticket_ratings" DROP COLUMN "ticket_description",
DROP COLUMN "ticket_name",
ALTER COLUMN "market_center_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."tickets" ADD COLUMN     "survey_id" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "averageRating" DECIMAL(3,2);

-- CreateIndex
CREATE INDEX "tickets_survey_id_idx" ON "public"."tickets"("survey_id");

-- AddForeignKey
ALTER TABLE "public"."ticket_ratings" ADD CONSTRAINT "ticket_ratings_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
