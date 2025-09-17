/*
  Warnings:

  - A unique constraint covering the columns `[auth0Id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `auth0Id` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "auth0Id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_auth0Id_key" ON "public"."users"("auth0Id");
