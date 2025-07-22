-- VERIFICATION QUERIES - Run these in BOTH Dev and Prod

-- 1. OVERALL SUMMARY
SELECT '=== CREDIT SYSTEM SUMMARY ===' as check_type;
SELECT 
    'Environment' as metric,
    'CHANGE_ME_TO_DEV_OR_PROD' as value -- Change this when running
UNION ALL
SELECT 
    'Total Users' as metric,
    COUNT(*)::text as value
FROM "bazaar-vid_user"
UNION ALL
SELECT 
    'Users with Credits' as metric,
    COUNT(*)::text as value
FROM "bazaar-vid_user_credits"
UNION ALL
SELECT 
    'Users Missing Credits' as metric,
    COUNT(*)::text as value
FROM "bazaar-vid_user" u
LEFT JOIN "bazaar-vid_user_credits" uc ON u.id = uc.user_id
WHERE uc.user_id IS NULL;

-- 2. CREDIT DISTRIBUTION
SELECT '=== DAILY CREDIT DISTRIBUTION ===' as check_type;
SELECT 
    daily_credits,
    COUNT(*) as user_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM "bazaar-vid_user_credits"
GROUP BY daily_credits
ORDER BY daily_credits;

-- 3. PURCHASED CREDITS ANALYSIS
SELECT '=== PURCHASED CREDITS BREAKDOWN ===' as check_type;
SELECT 
    CASE 
        WHEN purchased_credits = 0 THEN '0 (No bonus/purchases)'
        WHEN purchased_credits = 20 THEN '20 (Signup bonus only)'
        WHEN purchased_credits > 20 AND purchased_credits < 100 THEN '21-99 (Small purchase)'
        WHEN purchased_credits >= 100 THEN '100+ (Big spender)'
    END as credit_category,
    COUNT(*) as user_count,
    SUM(purchased_credits) as total_credits_in_category
FROM "bazaar-vid_user_credits"
GROUP BY 
    CASE 
        WHEN purchased_credits = 0 THEN '0 (No bonus/purchases)'
        WHEN purchased_credits = 20 THEN '20 (Signup bonus only)'
        WHEN purchased_credits > 20 AND purchased_credits < 100 THEN '21-99 (Small purchase)'
        WHEN purchased_credits >= 100 THEN '100+ (Big spender)'
    END
ORDER BY 
    CASE credit_category
        WHEN '0 (No bonus/purchases)' THEN 1
        WHEN '20 (Signup bonus only)' THEN 2
        WHEN '21-99 (Small purchase)' THEN 3
        WHEN '100+ (Big spender)' THEN 4
    END;

-- 4. CHECK DEFAULT VALUE
SELECT '=== SCHEMA DEFAULTS ===' as check_type;
SELECT 
    column_name,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'bazaar-vid_user_credits'
    AND column_name = 'daily_credits';

-- 5. TOP CREDIT HOLDERS
SELECT '=== TOP 10 CREDIT HOLDERS ===' as check_type;
SELECT 
    uc.user_id,
    u.name,
    u.email,
    uc.daily_credits,
    uc.purchased_credits,
    uc.lifetime_credits
FROM "bazaar-vid_user_credits" uc
JOIN "bazaar-vid_user" u ON u.id = uc.user_id
ORDER BY uc.purchased_credits DESC
LIMIT 10;

-- 6. RECENT ACTIVITY CHECK
SELECT '=== CREDITS CREATED IN LAST 24 HOURS ===' as check_type;
SELECT 
    COUNT(*) as new_credit_records,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM "bazaar-vid_user_credits"
WHERE created_at > NOW() - INTERVAL '24 hours';

-- 7. CONSISTENCY CHECK
SELECT '=== DATA CONSISTENCY CHECK ===' as check_type;
SELECT 
    'Users where purchased < lifetime' as issue,
    COUNT(*) as count
FROM "bazaar-vid_user_credits"
WHERE purchased_credits > lifetime_credits
UNION ALL
SELECT 
    'Users with negative credits' as issue,
    COUNT(*) as count
FROM "bazaar-vid_user_credits"
WHERE daily_credits < 0 OR purchased_credits < 0
UNION ALL
SELECT 
    'Users with NULL values' as issue,
    COUNT(*) as count
FROM "bazaar-vid_user_credits"
WHERE daily_credits IS NULL OR purchased_credits IS NULL OR lifetime_credits IS NULL;

-- 8. AUDIO COLUMN CHECK
SELECT '=== AUDIO FEATURE STATUS ===' as check_type;
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Audio column EXISTS'
        ELSE '❌ Audio column MISSING'
    END as audio_column_status
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'bazaar-vid_project'
    AND column_name = 'audio';

-- 9. PROJECTS WITH AUDIO
SELECT '=== AUDIO USAGE ===' as check_type;
SELECT 
    COUNT(*) FILTER (WHERE audio IS NOT NULL) as projects_with_audio,
    COUNT(*) as total_projects,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND(COUNT(*) FILTER (WHERE audio IS NOT NULL) * 100.0 / COUNT(*), 2)
        ELSE 0
    END as percentage_with_audio
FROM "bazaar-vid_project";