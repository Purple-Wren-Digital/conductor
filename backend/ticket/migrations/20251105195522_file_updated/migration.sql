/*
  Warnings:

  - You are about to drop the column `mimetype` on the `files` table. All the data in the column will be lost.
  - You are about to drop the column `s3Key` on the `files` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `files` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `files` table. All the data in the column will be lost.
  - Made the column `url` on table `files` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."files" DROP COLUMN "mimetype",
DROP COLUMN "s3Key",
DROP COLUMN "size",
DROP COLUMN "title",
ADD COLUMN     "uploaderName" TEXT,
ALTER COLUMN "url" SET NOT NULL;
