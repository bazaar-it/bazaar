-- PROJECT MEMORY INVESTIGATION QUERIES

-- 1. Sample of User Preferences (see what's actually stored)
SELECT 
    memory_key, 
    memory_value, 
    created_at,
    updated_at,
    project_id
FROM "bazaar-vid_project_memory" 
WHERE memory_type = 'user_preference' 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Sample of Conversation Context
SELECT 
    memory_key, 
    LEFT(memory_value, 100) as memory_value_preview, 
    created_at,
    updated_at,
    project_id
FROM "bazaar-vid_project_memory" 
WHERE memory_type = 'conversation_context' 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Sample of Scene Relationships
SELECT 
    memory_key, 
    memory_value, 
    created_at,
    updated_at,
    project_id
FROM "bazaar-vid_project_memory" 
WHERE memory_type = 'scene_relationship' 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check when data was created (date ranges)
SELECT 
    memory_type,
    MIN(created_at) as earliest_entry,
    MAX(created_at) as latest_entry,
    COUNT(*) as total_entries
FROM "bazaar-vid_project_memory"
GROUP BY memory_type
ORDER BY memory_type;

-- 5. Check data creation patterns by day
SELECT 
    memory_type,
    DATE(created_at) as creation_date,
    COUNT(*) as entries_created
FROM "bazaar-vid_project_memory"
GROUP BY memory_type, DATE(created_at)
ORDER BY creation_date DESC, memory_type
LIMIT 20;

-- 6. Check if entries are being updated
SELECT 
    memory_type,
    COUNT(CASE WHEN updated_at > created_at THEN 1 END) as updated_entries,
    COUNT(CASE WHEN updated_at = created_at THEN 1 END) as never_updated,
    COUNT(*) as total
FROM "bazaar-vid_project_memory"
GROUP BY memory_type;

-- 7. See unique memory keys for user preferences
SELECT 
    memory_key,
    COUNT(*) as usage_count
FROM "bazaar-vid_project_memory"
WHERE memory_type = 'user_preference'
GROUP BY memory_key
ORDER BY usage_count DESC
LIMIT 20;

-- 8. Check project distribution
SELECT 
    p.title as project_title,
    pm.memory_type,
    COUNT(*) as memory_entries
FROM "bazaar-vid_project_memory" pm
JOIN "bazaar-vid_project" p ON pm.project_id = p.id
GROUP BY p.title, pm.memory_type
ORDER BY memory_entries DESC
LIMIT 15;