-- SAFE STEP-BY-STEP CREDIT MIGRATION

-- STEP 1: Just check - don't change anything
SELECT 'STEP 1: CHECKING CURRENT STATE' as step;
SELECT 
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT uc.user_id) as users_with_credits,
    COUNT(DISTINCT u.id) - COUNT(DISTINCT uc.user_id) as users_without_credits
FROM "bazaar-vid_user" u
LEFT JOIN "bazaar-vid_user_credits" uc ON u.id = uc.user_id;

-- Show sample of users without credits
SELECT 'SAMPLE USERS WITHOUT CREDITS' as info;
SELECT u.id, u.name, u.email, u.created_at
FROM "bazaar-vid_user" u
LEFT JOIN "bazaar-vid_user_credits" uc ON u.id = uc.user_id
WHERE uc.user_id IS NULL
ORDER BY u.created_at DESC
LIMIT 5;

-- STOP HERE AND REVIEW THE RESULTS BEFORE CONTINUING

-- STEP 2: Create credits for just ONE test user first
-- Uncomment and run this for one user to test:
/*
INSERT INTO "bazaar-vid_user_credits" (user_id, daily_credits, purchased_credits, lifetime_credits, daily_reset_at, created_at, updated_at)
SELECT 
    u.id as user_id,
    5 as daily_credits,
    20 as purchased_credits,
    20 as lifetime_credits,
    NOW() + INTERVAL '1 day' as daily_reset_at,
    NOW() as created_at,
    NOW() as updated_at
FROM "bazaar-vid_user" u
LEFT JOIN "bazaar-vid_user_credits" uc ON u.id = uc.user_id
WHERE uc.user_id IS NULL
LIMIT 1;

-- Check if it worked
SELECT * FROM "bazaar-vid_user_credits" ORDER BY created_at DESC LIMIT 1;
*/

-- STEP 3: If test user works, create for all remaining users
-- Uncomment and run this after testing:
/*
INSERT INTO "bazaar-vid_user_credits" (user_id, daily_credits, purchased_credits, lifetime_credits, daily_reset_at, created_at, updated_at)
SELECT 
    u.id as user_id,
    5 as daily_credits,
    20 as purchased_credits,
    20 as lifetime_credits,
    NOW() + INTERVAL '1 day' as daily_reset_at,
    NOW() as created_at,
    NOW() as updated_at
FROM "bazaar-vid_user" u
LEFT JOIN "bazaar-vid_user_credits" uc ON u.id = uc.user_id
WHERE uc.user_id IS NULL;
*/

-- STEP 4: Update existing users (only 2 of them)
-- Uncomment and run:
/*
UPDATE "bazaar-vid_user_credits"
SET 
    daily_credits = 5,
    purchased_credits = GREATEST(purchased_credits, 20),
    lifetime_credits = GREATEST(lifetime_credits, 20),
    updated_at = NOW()
WHERE daily_credits = 20;
*/

-- STEP 5: Change default for future users
-- Uncomment and run:
/*
ALTER TABLE "bazaar-vid_user_credits" 
ALTER COLUMN daily_credits SET DEFAULT 5;
*/

-- FINAL VERIFICATION
-- Run this to confirm everyone has credits:
/*
SELECT 
    'Total Users' as metric,
    COUNT(*) as count
FROM "bazaar-vid_user"
UNION ALL
SELECT 
    'Users with Credits' as metric,
    COUNT(*) as count
FROM "bazaar-vid_user_credits"
UNION ALL
SELECT 
    'Users with 5 daily credits' as metric,
    COUNT(*) as count
FROM "bazaar-vid_user_credits"
WHERE daily_credits = 5;
*/