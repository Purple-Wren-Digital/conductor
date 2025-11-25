-- AlterTable
ALTER TABLE "public"."ticket_ratings" ADD COLUMN     "assignee_id" TEXT,
ADD COLUMN     "market_center_id" TEXT;

-- AddForeignKey
ALTER TABLE "public"."ticket_ratings" ADD CONSTRAINT "ticket_ratings_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_ratings" ADD CONSTRAINT "ticket_ratings_market_center_id_fkey" FOREIGN KEY ("market_center_id") REFERENCES "public"."market_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
