/*
  Warnings:

  - A unique constraint covering the columns `[type]` on the table `NotificationPreferences` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."NotificationPreferences_userSettingsId_type_key";

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_type_key" ON "public"."NotificationPreferences"("type");

-- CreateIndex
CREATE INDEX "NotificationPreferences_userSettingsId_type_idx" ON "public"."NotificationPreferences"("userSettingsId", "type");
