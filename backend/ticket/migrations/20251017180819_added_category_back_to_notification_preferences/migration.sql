-- AlterTable
ALTER TABLE "public"."NotificationPreferences" ADD COLUMN     "category" "public"."NotificationCategory" NOT NULL DEFAULT 'ACCOUNT';
