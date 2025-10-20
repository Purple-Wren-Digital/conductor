/*
  Warnings:

  - You are about to drop the column `userSettingsId` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."users_market_center_id_userSettingsId_idx";

-- DropIndex
DROP INDEX "public"."users_userSettingsId_key";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "userSettingsId";

-- CreateIndex
CREATE INDEX "users_market_center_id_idx" ON "public"."users"("market_center_id");
