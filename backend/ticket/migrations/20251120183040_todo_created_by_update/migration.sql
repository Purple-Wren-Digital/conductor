/*
  Warnings:

  - You are about to drop the column `created_by` on the `todos` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `todos` table. All the data in the column will be lost.
  - Added the required column `created_by_user_id` to the `todos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."todos" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_user_id" TEXT NOT NULL,
ADD COLUMN     "updated_by_user_id" TEXT;

-- CreateIndex
CREATE INDEX "todos_created_by_user_id_idx" ON "public"."todos"("created_by_user_id");

-- CreateIndex
CREATE INDEX "todos_updated_by_user_id_idx" ON "public"."todos"("updated_by_user_id");

-- AddForeignKey
ALTER TABLE "public"."todos" ADD CONSTRAINT "todos_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."todos" ADD CONSTRAINT "todos_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
