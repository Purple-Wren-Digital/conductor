-- DropForeignKey
ALTER TABLE "public"."settings_audit_logs" DROP CONSTRAINT "settings_audit_logs_user_id_fkey";

-- CreateIndex
CREATE INDEX "MarketCenterHistory_market_center_id_idx" ON "public"."MarketCenterHistory"("market_center_id");
