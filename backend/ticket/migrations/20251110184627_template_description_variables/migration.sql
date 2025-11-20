/*
  Warnings:

  - You are about to drop the column `data` on the `NotificationTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `NotificationTemplate` table. All the data in the column will be lost.
  - Added the required column `templateDescription` to the `NotificationTemplate` table without a default value. This is not possible if the table is not empty.
  - Made the column `subject` on table `NotificationTemplate` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."NotificationTemplate" DROP COLUMN "data",
DROP COLUMN "title",
ADD COLUMN     "templateDescription" TEXT NOT NULL,
ADD COLUMN     "variables" JSONB,
ALTER COLUMN "subject" SET NOT NULL;
