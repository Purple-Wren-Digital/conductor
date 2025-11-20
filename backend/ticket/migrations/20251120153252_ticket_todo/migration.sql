-- CreateTable
CREATE TABLE "public"."todos" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "complete" BOOLEAN NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "todos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "todos_ticket_id_idx" ON "public"."todos"("ticket_id");

-- CreateIndex
CREATE INDEX "todos_complete_idx" ON "public"."todos"("complete");

-- AddForeignKey
ALTER TABLE "public"."todos" ADD CONSTRAINT "todos_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
