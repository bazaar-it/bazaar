-- CRITICAL FIX: Create credit records for 205 users who have none!

-- 1. First, let's see who needs credits
SELECT 'USERS NEEDING CREDITS' as status;
SELECT COUNT(*) as users_without_credits
FROM "bazaar-vid_user" u
LEFT JOIN "bazaar-vid_user_credits" uc ON u.id = uc.user_id
WHERE uc.user_id IS NULL;

-- 2. Create credit records for ALL users who don't have them
INSERT INTO "bazaar-vid_user_credits" (user_id, daily_credits, purchased_credits, lifetime_credits, daily_reset_at, created_at, updated_at)
SELECT 
    u.id as user_id,
    5 as daily_credits,              -- 5 daily credits
    20 as purchased_credits,         -- 20 signup bonus
    20 as lifetime_credits,          -- 20 lifetime to start
    NOW() + INTERVAL '1 day' as daily_reset_at,  -- Reset tomorrow
    NOW() as created_at,
    NOW() as updated_at
FROM "bazaar-vid_user" u
LEFT JOIN "bazaar-vid_user_credits" uc ON u.id = uc.user_id
WHERE uc.user_id IS NULL;

-- 3. Update the 2 existing users to new system
UPDATE "bazaar-vid_user_credits"
SET 
    daily_credits = 5,
    purchased_credits = GREATEST(purchased_credits, 20),  -- Ensure at least 20
    lifetime_credits = GREATEST(lifetime_credits, 20),
    updated_at = NOW()
WHERE daily_credits != 5;

-- 4. Update schema default
ALTER TABLE "bazaar-vid_user_credits" 
ALTER COLUMN daily_credits SET DEFAULT 5;

-- 5. Verify everyone now has credits
SELECT 'FINAL VERIFICATION' as status;
SELECT 
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT uc.user_id) as users_with_credits,
    COUNT(DISTINCT u.id) - COUNT(DISTINCT uc.user_id) as users_still_missing_credits
FROM "bazaar-vid_user" u
LEFT JOIN "bazaar-vid_user_credits" uc ON u.id = uc.user_id;

-- 6. Check credit distribution
SELECT 'CREDIT DISTRIBUTION' as status;
SELECT 
    daily_credits,
    COUNT(*) as user_count,
    MIN(purchased_credits) as min_purchased,
    MAX(purchased_credits) as max_purchased,
    AVG(purchased_credits) as avg_purchased
FROM "bazaar-vid_user_credits"
GROUP BY daily_credits;

-- 7. Sample of newly created records
SELECT 'SAMPLE NEW RECORDS' as status;
SELECT 
    user_id,
    daily_credits,
    purchased_credits,
    created_at
FROM "bazaar-vid_user_credits"
ORDER BY created_at DESC
LIMIT 10;