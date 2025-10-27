-- CreateEnum
CREATE TYPE "public"."NotificationCategory" AS ENUM ('ACCOUNT', 'ACTIVITY', 'MARKETING', 'PRODUCT');

-- CreateEnum
CREATE TYPE "public"."NotificationFrequency" AS ENUM ('INSTANT', 'DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "public"."UserSettings" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "ticket_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationPreferences" (
    "id" TEXT NOT NULL,
    "category" "public"."NotificationCategory" NOT NULL,
    "frequency" "public"."NotificationFrequency" NOT NULL DEFAULT 'INSTANT',
    "type" TEXT NOT NULL,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "push" BOOLEAN NOT NULL DEFAULT true,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "text" BOOLEAN NOT NULL DEFAULT false,
    "userSettingsId" TEXT NOT NULL,

    CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSettings_ticket_id_idx" ON "public"."UserSettings"("ticket_id");

-- AddForeignKey
ALTER TABLE "public"."UserSettings" ADD CONSTRAINT "UserSettings_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_userSettingsId_fkey" FOREIGN KEY ("userSettingsId") REFERENCES "public"."UserSettings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
