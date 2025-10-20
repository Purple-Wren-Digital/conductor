/*
  Warnings:

  - You are about to drop the column `ticket_id` on the `UserSettings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userSettingsId,category,type]` on the table `NotificationPreferences` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `UserSettings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userSettingsId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `UserSettings` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."NotificationChannel" AS ENUM ('EMAIL', 'PUSH', 'IN_APP', 'TEXT');

-- DropForeignKey
ALTER TABLE "public"."UserSettings" DROP CONSTRAINT "UserSettings_ticket_id_fkey";

-- DropIndex
DROP INDEX "public"."UserSettings_ticket_id_idx";

-- DropIndex
DROP INDEX "public"."users_market_center_id_idx";

-- AlterTable
ALTER TABLE "public"."UserSettings" DROP COLUMN "ticket_id",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "userSettingsId" TEXT;

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "public"."NotificationChannel",
    "category" "public"."NotificationCategory" NOT NULL,
    "priority" "public"."Urgency",
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_userSettingsId_category_type_key" ON "public"."NotificationPreferences"("userSettingsId", "category", "type");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "public"."UserSettings"("userId");

-- CreateIndex
CREATE INDEX "UserSettings_userId_idx" ON "public"."UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_userSettingsId_key" ON "public"."users"("userSettingsId");

-- CreateIndex
CREATE INDEX "users_market_center_id_userSettingsId_idx" ON "public"."users"("market_center_id", "userSettingsId");

-- AddForeignKey
ALTER TABLE "public"."UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
