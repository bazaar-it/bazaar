-- Safe migration to preserve A2A component data in parallel snake_case columns
-- This migration does NOT delete any columns to prevent data loss

-- Check if there's any data in camelCase columns that hasn't been copied to snake_case columns
DO $$
DECLARE
    data_to_migrate BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM "bazaar-vid_custom_component_job" 
        WHERE 
            ("originalTsxCode" IS NOT NULL AND ("original_tsx_code" IS NULL OR "original_tsx_code" = ''))
            OR
            ("lastFixAttempt" IS NOT NULL AND "last_fix_attempt" IS NULL)
            OR
            ("fixIssues" IS NOT NULL AND ("fix_issues" IS NULL OR "fix_issues" = ''))
    ) INTO data_to_migrate;

    IF data_to_migrate THEN
        RAISE NOTICE 'Migrating data from camelCase to snake_case columns...';
        
        -- Copy data from camelCase columns to snake_case columns
        UPDATE "bazaar-vid_custom_component_job"
        SET 
            "original_tsx_code" = COALESCE("original_tsx_code", "originalTsxCode"),
            "last_fix_attempt" = COALESCE("last_fix_attempt", "lastFixAttempt"),
            "fix_issues" = COALESCE("fix_issues", "fixIssues")
        WHERE 
            ("originalTsxCode" IS NOT NULL AND ("original_tsx_code" IS NULL OR "original_tsx_code" = ''))
            OR
            ("lastFixAttempt" IS NOT NULL AND "last_fix_attempt" IS NULL)
            OR
            ("fixIssues" IS NOT NULL AND ("fix_issues" IS NULL OR "fix_issues" = ''));
            
        RAISE NOTICE 'Data migration completed successfully.';
    ELSE
        RAISE NOTICE 'No data needs to be migrated.';
    END IF;
END $$;

-- Important: This migration does not drop any columns
-- We're keeping both versions (camelCase and snake_case) until we're certain all code
-- is using the snake_case versions consistently 