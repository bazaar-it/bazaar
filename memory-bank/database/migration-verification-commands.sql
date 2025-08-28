-- Database Migration Verification Commands
-- Use these MCP commands to verify schema before any migration

-- 1. Check what tables exist in dev but not in prod
-- Run in dev:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'bazaar-vid_%' 
ORDER BY table_name;

-- Run in prod:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'bazaar-vid_%' 
ORDER BY table_name;

-- 2. Get exact column structure for any table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'YOUR_TABLE_NAME'
ORDER BY ordinal_position;

-- 3. Count columns in table
SELECT COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'YOUR_TABLE_NAME';

-- 4. Generate CREATE TABLE statement
SELECT 
    'CREATE TABLE IF NOT EXISTS "' || table_name || '" (' || chr(10) ||
    string_agg(
        '    "' || column_name || '" ' || 
        CASE 
            WHEN data_type = 'character varying' THEN 'varchar(' || character_maximum_length || ')'
            WHEN data_type = 'timestamp with time zone' THEN 'timestamp with time zone'
            WHEN data_type = 'numeric' THEN 'numeric'
            ELSE data_type
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE 
            WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
            ELSE ''
        END,
        ',' || chr(10) 
        ORDER BY ordinal_position
    ) || chr(10) || ');' as create_statement
FROM information_schema.columns 
WHERE table_name = 'YOUR_TABLE_NAME'
GROUP BY table_name;

-- 5. Get all indexes for table
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE tablename = 'YOUR_TABLE_NAME'
AND schemaname = 'public'
ORDER BY indexname;

-- 6. Get unique constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
AND tc.table_name = 'YOUR_TABLE_NAME';

-- 7. Get foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'YOUR_TABLE_NAME';

-- BRAND EXTRACTION TABLES VERIFICATION (2024-08-28)
-- Verified these tables exist in dev with these column counts:

-- bazaar-vid_brand_extraction: 29 columns
-- bazaar-vid_story_arc: 19 columns  
-- bazaar-vid_story_arc_scene: 20 columns
-- bazaar-vid_extraction_cache: 10 columns
-- bazaar-vid_brand_profile: 17 columns
-- bazaar-vid_brand_profile_version: 7 columns

-- Before running migration, verify these counts still match dev!