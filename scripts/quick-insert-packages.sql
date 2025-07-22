-- Quick insert script for credit packages
-- Run this in your database admin tool (like the one from npm run db:studio)

INSERT INTO credit_package (id, name, credits, price, popular, active) VALUES
('starter-pack-50', 'Starter Pack', 50, 500, false, true),
('popular-pack-100', 'Popular Pack', 100, 1000, true, true),
('power-pack-250', 'Power Pack', 250, 2000, false, true),
('pro-bundle-500', 'Pro Bundle', 500, 3500, false, true)
ON CONFLICT (id) DO NOTHING;