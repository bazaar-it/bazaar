-- Migration to New Credit System
-- 5 daily + 20 signup bonus

-- 1. First, let's see current state
SELECT 'BEFORE MIGRATION' as status;
SELECT 
    daily_credits,
    COUNT(*) as user_count,
    AVG(purchased_credits) as avg_purchased,
    AVG(lifetime_credits) as avg_lifetime
FROM "bazaar-vid_user_credits"
GROUP BY daily_credits
ORDER BY daily_credits DESC;

-- 2. Update schema default for new users
ALTER TABLE "bazaar-vid_user_credits" 
ALTER COLUMN daily_credits SET DEFAULT 5;

-- 3. Update ALL existing users to new system
UPDATE "bazaar-vid_user_credits"
SET 
    daily_credits = 5,
    -- Add 20 bonus to purchased credits if they don't already have it
    purchased_credits = CASE 
        WHEN purchased_credits < 20 THEN 20
        ELSE purchased_credits 
    END,
    -- Update lifetime to include the bonus
    lifetime_credits = CASE 
        WHEN lifetime_credits < 20 THEN 20
        ELSE lifetime_credits 
    END,
    updated_at = NOW()
WHERE daily_credits != 5 
   OR purchased_credits < 20;

-- 4. Verify the migration
SELECT 'AFTER MIGRATION' as status;
SELECT 
    daily_credits,
    COUNT(*) as user_count,
    AVG(purchased_credits) as avg_purchased,
    MIN(purchased_credits) as min_purchased,
    AVG(lifetime_credits) as avg_lifetime
FROM "bazaar-vid_user_credits"
GROUP BY daily_credits;

-- 5. Check specific examples
SELECT 'SAMPLE USERS' as status;
SELECT 
    user_id,
    daily_credits,
    purchased_credits,
    lifetime_credits,
    created_at
FROM "bazaar-vid_user_credits"
LIMIT 10;