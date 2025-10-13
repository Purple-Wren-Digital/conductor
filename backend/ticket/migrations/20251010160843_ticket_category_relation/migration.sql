/*
  Warnings:

  - You are about to drop the column `category` on the `tickets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."tickets" DROP COLUMN "category",
ADD COLUMN     "category_id" TEXT;

-- CreateIndex
CREATE INDEX "tickets_category_id_idx" ON "public"."tickets"("category_id");

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."ticket_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
