-- Check Production User Credits Status

-- 1. Total user count
SELECT '=== TOTAL USERS ===' as check_type;
SELECT COUNT(DISTINCT user_id) as total_users
FROM "bazaar-vid_user_credits";

-- 2. User distribution by daily credits
SELECT '=== USERS BY DAILY CREDITS ===' as check_type;
SELECT 
    daily_credits,
    COUNT(*) as user_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM "bazaar-vid_user_credits"
GROUP BY daily_credits
ORDER BY daily_credits DESC;

-- 3. Check for NULL or empty user_ids
SELECT '=== NULL USER CHECK ===' as check_type;
SELECT 
    COUNT(*) FILTER (WHERE user_id IS NULL) as null_users,
    COUNT(*) FILTER (WHERE user_id = '') as empty_users,
    COUNT(*) as total_records
FROM "bazaar-vid_user_credits";

-- 4. Sample of actual data
SELECT '=== SAMPLE USER DATA ===' as check_type;
SELECT 
    user_id,
    daily_credits,
    purchased_credits,
    lifetime_credits,
    created_at
FROM "bazaar-vid_user_credits"
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check main users table
SELECT '=== MAIN USERS TABLE COUNT ===' as check_type;
SELECT COUNT(*) as total_users_in_main_table
FROM "bazaar-vid_user";

-- 6. Users without credits
SELECT '=== USERS WITHOUT CREDITS ===' as check_type;
SELECT COUNT(*) as users_without_credits
FROM "bazaar-vid_user" u
LEFT JOIN "bazaar-vid_user_credits" uc ON u.id = uc.user_id
WHERE uc.user_id IS NULL;