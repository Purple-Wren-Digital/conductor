/*
  Warnings:

  - You are about to drop the column `staff_leader_id` on the `market_centers` table. All the data in the column will be lost.
  - You are about to drop the column `staffLeader` on the `users` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "public"."UserRole" ADD VALUE 'STAFF_LEADER';

-- AlterTable
ALTER TABLE "public"."market_centers" DROP COLUMN "staff_leader_id";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "staffLeader";
