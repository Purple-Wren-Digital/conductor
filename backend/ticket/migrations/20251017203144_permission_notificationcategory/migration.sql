/*
  Warnings:

  - The `frequency` column on the `NotificationPreferences` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
ALTER TYPE "public"."NotificationCategory" ADD VALUE 'PERMISSIONS';

-- AlterTable
ALTER TABLE "public"."NotificationPreferences" DROP COLUMN "frequency",
ADD COLUMN     "frequency" TEXT;

-- DropEnum
DROP TYPE "public"."NotificationFrequency";
