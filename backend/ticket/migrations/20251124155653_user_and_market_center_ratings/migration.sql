-- AlterTable
ALTER TABLE "public"."ticket_ratings" ADD COLUMN     "overallRating" DECIMAL(3,2);

-- AddForeignKey
ALTER TABLE "public"."ticket_ratings" ADD CONSTRAINT "ticket_ratings_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_ratings" ADD CONSTRAINT "ticket_ratings_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_ratings" ADD CONSTRAINT "ticket_ratings_market_center_id_fkey" FOREIGN KEY ("market_center_id") REFERENCES "public"."market_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
