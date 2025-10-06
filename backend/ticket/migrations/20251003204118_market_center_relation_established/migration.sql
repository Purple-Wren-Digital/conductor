/*
  Warnings:

  - You are about to drop the `settings_audit_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."settings_audit_logs" DROP CONSTRAINT "settings_audit_logs_market_center_id_fkey";

-- DropTable
DROP TABLE "public"."settings_audit_logs";

-- AddForeignKey
ALTER TABLE "public"."MarketCenterHistory" ADD CONSTRAINT "MarketCenterHistory_market_center_id_fkey" FOREIGN KEY ("market_center_id") REFERENCES "public"."market_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketCenterHistory" ADD CONSTRAINT "MarketCenterHistory_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
