/*
  Warnings:

  - You are about to drop the column `user_id` on the `UserHistory` table. All the data in the column will be lost.
  - Added the required column `userId` to the `UserHistory` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."UserHistory_market_center_id_idx";

-- DropIndex
DROP INDEX "public"."UserHistory_user_id_idx";

-- AlterTable
ALTER TABLE "public"."UserHistory" DROP COLUMN "user_id",
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "changed_by_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "UserHistory_userId_idx" ON "public"."UserHistory"("userId");

-- AddForeignKey
ALTER TABLE "public"."UserHistory" ADD CONSTRAINT "UserHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserHistory" ADD CONSTRAINT "UserHistory_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
