-- DropForeignKey
ALTER TABLE "public"."TicketHistory" DROP CONSTRAINT "TicketHistory_ticket_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."TicketHistory" ADD CONSTRAINT "TicketHistory_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
