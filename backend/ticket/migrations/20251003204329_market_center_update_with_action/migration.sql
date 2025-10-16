/*
  Warnings:

  - Added the required column `action` to the `MarketCenterHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."MarketCenterHistory" ADD COLUMN     "action" TEXT NOT NULL,
ALTER COLUMN "field" DROP NOT NULL,
ALTER COLUMN "previousValue" DROP NOT NULL,
ALTER COLUMN "newValue" DROP NOT NULL;
