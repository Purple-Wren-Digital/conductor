/*
  Warnings:

  - You are about to drop the column `text` on the `NotificationPreferences` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."NotificationPreferences" DROP COLUMN "text",
ADD COLUMN     "sms" BOOLEAN NOT NULL DEFAULT false;
