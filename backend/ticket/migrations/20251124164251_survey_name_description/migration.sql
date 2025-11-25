/*
  Warnings:

  - Added the required column `ticket_name` to the `ticket_ratings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."ticket_ratings" ADD COLUMN     "ticket_description" TEXT,
ADD COLUMN     "ticket_name" TEXT NOT NULL;
