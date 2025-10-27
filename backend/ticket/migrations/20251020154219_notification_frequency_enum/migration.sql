/*
  Warnings:

  - Added the required column `frequency` to the `NotificationPreferences` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."NotificationFrequency" AS ENUM ('NONE', 'INSTANT', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- AlterTable
ALTER TABLE "public"."NotificationPreferences" DROP COLUMN "frequency",
ADD COLUMN     "frequency" "public"."NotificationFrequency" NOT NULL;
