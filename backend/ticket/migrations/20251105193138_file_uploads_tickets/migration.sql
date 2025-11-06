-- CreateTable
CREATE TABLE "public"."files" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "s3Key" TEXT NOT NULL,
    "url" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaderId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "files_id_idx" ON "public"."files"("id");

-- CreateIndex
CREATE INDEX "files_ticketId_idx" ON "public"."files"("ticketId");

-- CreateIndex
CREATE INDEX "files_uploaderId_idx" ON "public"."files"("uploaderId");

-- CreateIndex
CREATE INDEX "files_uploadedAt_idx" ON "public"."files"("uploadedAt");

-- AddForeignKey
ALTER TABLE "public"."files" ADD CONSTRAINT "files_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
