-- CreateTable
CREATE TABLE "public"."MarketCenterHistory" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "market_center_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "previousValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "snapshot" JSONB,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_id" TEXT,

    CONSTRAINT "MarketCenterHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketCenterHistory_changed_by_id_idx" ON "public"."MarketCenterHistory"("changed_by_id");
