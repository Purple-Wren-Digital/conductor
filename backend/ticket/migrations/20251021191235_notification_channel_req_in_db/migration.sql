/*
  Warnings:

  - Made the column `channel` on table `Notification` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Notification" ALTER COLUMN "channel" SET NOT NULL;
