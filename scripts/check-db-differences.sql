-- Database Difference Checker
-- Run this in both DEV and PROD databases to compare

-- 1. Check Audio Column
SELECT '=== AUDIO COLUMN CHECK ===' as check_type;
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Audio column EXISTS'
        ELSE '❌ Audio column MISSING'
    END as audio_status
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'bazaar-vid_project'
    AND column_name = 'audio';

-- 2. Check Daily Credits Default
SELECT '=== DAILY CREDITS DEFAULT ===' as check_type;
SELECT 
    column_default as current_default_value
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'bazaar-vid_user_credits'
    AND column_name = 'daily_credits';

-- 3. User Credit Distribution
SELECT '=== USER CREDIT DISTRIBUTION ===' as check_type;
SELECT 
    daily_credits,
    COUNT(*) as user_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM "bazaar-vid_user_credits"
GROUP BY daily_credits
ORDER BY daily_credits DESC;

-- 4. Migration Status
SELECT '=== MIGRATION STATUS ===' as check_type;
SELECT 
    name as migration_file,
    hash,
    executed_at
FROM "bazaar-vid__drizzle_migrations"
ORDER BY executed_at DESC
LIMIT 10;

-- 5. Project Count with Audio
SELECT '=== PROJECTS WITH AUDIO ===' as check_type;
SELECT 
    COUNT(*) FILTER (WHERE audio IS NOT NULL) as projects_with_audio,
    COUNT(*) as total_projects,
    ROUND(COUNT(*) FILTER (WHERE audio IS NOT NULL) * 100.0 / NULLIF(COUNT(*), 0), 2) as percentage_with_audio
FROM "bazaar-vid_project";

-- 6. Schema Summary
SELECT '=== SCHEMA SUMMARY ===' as check_type;
SELECT 
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name LIKE 'bazaar-vid_%'
GROUP BY table_name
ORDER BY table_name;