UPDATE market_centers
SET settings = settings - 'enterpriseSettings'
WHERE settings ? 'enterpriseSettings';


ALTER TABLE market_centers
ADD COLUMN primary_stripe_subscription_id TEXT NULL,
ADD COLUMN primary_stripe_customer_id TEXT NULL;