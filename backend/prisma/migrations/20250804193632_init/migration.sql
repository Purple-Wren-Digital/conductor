/*
  Warnings:

  - The values [USER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `description` on the `MarketCenter` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `MarketCenter` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `MarketCenter` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Ticket` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `MarketCenter` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `address1` to the `MarketCenter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city` to the `MarketCenter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `MarketCenter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `MarketCenter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `MarketCenter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `MarketCenter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `region` to the `MarketCenter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `MarketCenter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timezone` to the `MarketCenter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated` to the `MarketCenter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `zip` to the `MarketCenter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `marketCenterId` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `marketCenterId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Changed the column `role` on the `User` table from a scalar field to a list field. If there are non-null values in that column, this step will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."CommentType" ADD VALUE 'CANCEL';
ALTER TYPE "public"."CommentType" ADD VALUE 'ESCALATION';
ALTER TYPE "public"."CommentType" ADD VALUE 'EXTERNAL';
ALTER TYPE "public"."CommentType" ADD VALUE 'REMINDER';
ALTER TYPE "public"."CommentType" ADD VALUE 'SYSTEM';

-- AlterEnum
ALTER TYPE "public"."Priority" ADD VALUE 'CRITICAL';

-- AlterEnum
BEGIN;
CREATE TYPE "public"."Role_new" AS ENUM ('ADMIN', 'AGENT', 'COMPLIANCE', 'FINANCE', 'MANAGEMENT', 'MARKETING', 'TECH_SUPPORT');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."User" ALTER COLUMN "role" TYPE "public"."Role_new"[] USING ("role"::text::"public"."Role_new"[]);
ALTER TYPE "public"."Role" RENAME TO "Role_old";
ALTER TYPE "public"."Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "public"."User" ALTER COLUMN "role" SET DEFAULT ARRAY['AGENT']::"public"."Role"[];
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."TicketStatus" ADD VALUE 'ASSIGNED';
ALTER TYPE "public"."TicketStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "public"."TicketStatus" ADD VALUE 'CLOSED';

-- DropForeignKey
ALTER TABLE "public"."MarketCenter" DROP CONSTRAINT "MarketCenter_userId_fkey";

-- DropIndex
DROP INDEX "public"."MarketCenter_userId_key";

-- AlterTable
ALTER TABLE "public"."MarketCenter" DROP COLUMN "description",
DROP COLUMN "title",
DROP COLUMN "userId",
ADD COLUMN     "address1" TEXT NOT NULL,
ADD COLUMN     "address2" TEXT,
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "region" TEXT NOT NULL,
ADD COLUMN     "state" TEXT NOT NULL,
ADD COLUMN     "timezone" TEXT NOT NULL,
ADD COLUMN     "updated" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "zip" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Ticket" DROP COLUMN "createdAt",
DROP COLUMN "description",
ADD COLUMN     "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "marketCenterId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "marketCenterId" TEXT NOT NULL,
ALTER COLUMN "role" SET DEFAULT ARRAY['AGENT']::"public"."Role"[],
ALTER COLUMN "role" SET DATA TYPE "public"."Role"[];

-- CreateTable
CREATE TABLE "public"."Comments" (
    "id" TEXT NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "type" "public"."CommentType" NOT NULL,
    "comment" TEXT NOT NULL,

    CONSTRAINT "Comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TicketStatusHistory" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticketId" TEXT NOT NULL,
    "status" "public"."TicketStatus" NOT NULL,

    CONSTRAINT "TicketStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Comments_userId_ticketId_key" ON "public"."Comments"("userId", "ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketCenter_code_key" ON "public"."MarketCenter"("code");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_marketCenterId_fkey" FOREIGN KEY ("marketCenterId") REFERENCES "public"."MarketCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_marketCenterId_fkey" FOREIGN KEY ("marketCenterId") REFERENCES "public"."MarketCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comments" ADD CONSTRAINT "Comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comments" ADD CONSTRAINT "Comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketStatusHistory" ADD CONSTRAINT "TicketStatusHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
