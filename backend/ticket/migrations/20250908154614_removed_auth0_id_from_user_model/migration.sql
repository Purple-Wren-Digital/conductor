/*
  Warnings:

  - You are about to drop the column `auth0_id` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."users_auth0_id_key";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "auth0_id";
