-- CreateTable
CREATE TABLE "public"."TicketHistory" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "ticket_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "previousValue" JSONB NOT NULL,
    "newValue" JSONB NOT NULL,
    "snapshot" JSONB,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_id" TEXT NOT NULL,

    CONSTRAINT "TicketHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketHistory_ticket_id_idx" ON "public"."TicketHistory"("ticket_id");

-- CreateIndex
CREATE INDEX "TicketHistory_changed_by_id_idx" ON "public"."TicketHistory"("changed_by_id");
