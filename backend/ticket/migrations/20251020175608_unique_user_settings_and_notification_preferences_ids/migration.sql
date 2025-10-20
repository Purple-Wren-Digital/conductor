/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `NotificationPreferences` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `UserSettings` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."NotificationPreferences_type_key";

-- DropIndex
DROP INDEX "public"."NotificationPreferences_userSettingsId_type_idx";

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_id_key" ON "public"."NotificationPreferences"("id");

-- CreateIndex
CREATE INDEX "NotificationPreferences_userSettingsId_idx" ON "public"."NotificationPreferences"("userSettingsId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_id_key" ON "public"."UserSettings"("id");
