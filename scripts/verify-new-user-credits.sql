-- VERIFY NEW USER CREDIT SYSTEM - Run in BOTH Dev and Prod

-- 1. CHECK SCHEMA DEFAULT
SELECT '=== NEW USER DEFAULT CHECK ===' as check_type;
SELECT 
    column_default as daily_credits_default,
    CASE 
        WHEN column_default = '5' THEN '✅ CORRECT - New users will get 5 daily'
        ELSE '❌ WRONG - Default is not 5!'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'bazaar-vid_user_credits'
    AND column_name = 'daily_credits';

-- 2. CHECK ALL USERS HAVE CORRECT SETUP
SELECT '=== CURRENT USER CREDITS ===' as check_type;
SELECT 
    daily_credits,
    purchased_credits,
    COUNT(*) as user_count,
    CASE 
        WHEN daily_credits = 5 AND purchased_credits >= 20 THEN '✅ Correct Setup'
        WHEN daily_credits = 5 AND purchased_credits < 20 THEN '⚠️ Missing signup bonus'
        ELSE '❌ Wrong daily credits'
    END as status
FROM "bazaar-vid_user_credits"
GROUP BY daily_credits, purchased_credits
ORDER BY COUNT(*) DESC;

-- 3. VERIFY EVERYONE HAS AT LEAST 20 ROLLOVER
SELECT '=== SIGNUP BONUS CHECK ===' as check_type;
SELECT 
    CASE 
        WHEN purchased_credits >= 20 THEN '✅ Has signup bonus (20+)'
        ELSE '❌ Missing signup bonus'
    END as has_bonus,
    COUNT(*) as user_count,
    MIN(purchased_credits) as min_credits,
    MAX(purchased_credits) as max_credits
FROM "bazaar-vid_user_credits"
GROUP BY 
    CASE 
        WHEN purchased_credits >= 20 THEN '✅ Has signup bonus (20+)'
        ELSE '❌ Missing signup bonus'
    END;

-- 4. CHECK RECENTLY CREATED USERS (Last 7 days)
SELECT '=== NEW USERS IN LAST 7 DAYS ===' as check_type;
SELECT 
    u.name,
    u.email,
    uc.daily_credits,
    uc.purchased_credits,
    uc.created_at,
    CASE 
        WHEN uc.daily_credits = 5 AND uc.purchased_credits >= 20 THEN '✅ Correct'
        ELSE '❌ Wrong setup'
    END as setup_status
FROM "bazaar-vid_user" u
JOIN "bazaar-vid_user_credits" uc ON u.id = uc.user_id
WHERE uc.created_at > NOW() - INTERVAL '7 days'
ORDER BY uc.created_at DESC
LIMIT 5;

-- 5. SUMMARY
SELECT '=== FINAL SUMMARY ===' as check_type;
SELECT 
    'Total Users' as metric,
    COUNT(*)::text as value
FROM "bazaar-vid_user_credits"
UNION ALL
SELECT 
    'Users with 5 daily credits' as metric,
    COUNT(*)::text as value
FROM "bazaar-vid_user_credits"
WHERE daily_credits = 5
UNION ALL
SELECT 
    'Users with 20+ rollover credits' as metric,
    COUNT(*)::text as value
FROM "bazaar-vid_user_credits"
WHERE purchased_credits >= 20
UNION ALL
SELECT 
    'Users setup correctly (5 daily + 20+ rollover)' as metric,
    COUNT(*)::text as value
FROM "bazaar-vid_user_credits"
WHERE daily_credits = 5 AND purchased_credits >= 20;