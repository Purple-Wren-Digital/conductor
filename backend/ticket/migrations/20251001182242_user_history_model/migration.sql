-- CreateTable
CREATE TABLE "public"."UserHistory" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "user_id" TEXT NOT NULL,
    "market_center_id" TEXT,
    "field" TEXT NOT NULL,
    "previousValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "snapshot" JSONB,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_id" TEXT NOT NULL,

    CONSTRAINT "UserHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserHistory_user_id_idx" ON "public"."UserHistory"("user_id");

-- CreateIndex
CREATE INDEX "UserHistory_market_center_id_idx" ON "public"."UserHistory"("market_center_id");

-- CreateIndex
CREATE INDEX "UserHistory_changed_by_id_idx" ON "public"."UserHistory"("changed_by_id");
