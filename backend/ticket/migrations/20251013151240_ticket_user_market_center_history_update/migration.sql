-- AlterTable
ALTER TABLE "public"."MarketCenterHistory" ALTER COLUMN "action" SET DEFAULT 'UPDATE';

-- AlterTable
ALTER TABLE "public"."TicketHistory" ADD COLUMN     "action" TEXT NOT NULL DEFAULT 'UPDATE',
ALTER COLUMN "field" DROP NOT NULL,
ALTER COLUMN "previousValue" DROP NOT NULL,
ALTER COLUMN "newValue" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."UserHistory" ADD COLUMN     "action" TEXT NOT NULL DEFAULT 'UPDATE',
ALTER COLUMN "field" DROP NOT NULL,
ALTER COLUMN "previousValue" DROP NOT NULL,
ALTER COLUMN "newValue" DROP NOT NULL;
