UPDATE market_centers
SET settings = '{}'::jsonb
WHERE settings IS NULL
   OR jsonb_typeof(settings) <> 'object';

UPDATE market_centers
SET settings = jsonb_set(
  settings,
  '{enterpriseSettings}',
  'null'::jsonb,
  true
)
WHERE settings->'enterpriseSettings' IS NULL;


