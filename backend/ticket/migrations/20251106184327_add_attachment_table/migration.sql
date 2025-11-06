-- CreateTable
CREATE TABLE "public"."attachments" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "bucket_key" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attachments_bucket_key_key" ON "public"."attachments"("bucket_key");

-- CreateIndex
CREATE INDEX "attachments_ticket_id_idx" ON "public"."attachments"("ticket_id");

-- CreateIndex
CREATE INDEX "attachments_uploaded_by_idx" ON "public"."attachments"("uploaded_by");

-- AddForeignKey
ALTER TABLE "public"."attachments" ADD CONSTRAINT "attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attachments" ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
