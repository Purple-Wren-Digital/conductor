/*
  Warnings:

  - You are about to drop the column `auth0Id` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[auth0_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "public"."TicketStatus" ADD VALUE 'DRAFT';

-- DropIndex
DROP INDEX "public"."users_auth0Id_key";

-- AlterTable
ALTER TABLE "public"."tickets" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "status" DROP NOT NULL,
ALTER COLUMN "urgency" DROP NOT NULL,
ALTER COLUMN "category" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "auth0Id",
ADD COLUMN     "auth0_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_auth0_id_key" ON "public"."users"("auth0_id");
