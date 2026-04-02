-- Update SubscriptionPlan enum to match current pricing plans
ALTER TYPE "public"."SubscriptionPlan" ADD VALUE IF NOT EXISTS 'EARLY_BIRD';
ALTER TYPE "public"."SubscriptionPlan" ADD VALUE IF NOT EXISTS 'STANDARD';
