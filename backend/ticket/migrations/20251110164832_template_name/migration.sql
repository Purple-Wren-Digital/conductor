/*
  Warnings:

  - A unique constraint covering the columns `[templateName]` on the table `NotificationTemplate` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `templateName` to the `NotificationTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."NotificationTemplate" ADD COLUMN     "templateName" TEXT NOT NULL,
ALTER COLUMN "subject" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_templateName_key" ON "public"."NotificationTemplate"("templateName");
