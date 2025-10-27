/*
  Warnings:

  - You are about to drop the column `category` on the `NotificationPreferences` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userSettingsId,type]` on the table `NotificationPreferences` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."NotificationPreferences_userSettingsId_category_type_key";

-- AlterTable
ALTER TABLE "public"."NotificationPreferences" DROP COLUMN "category";

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_userSettingsId_type_key" ON "public"."NotificationPreferences"("userSettingsId", "type");
