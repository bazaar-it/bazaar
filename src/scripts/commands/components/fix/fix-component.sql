-- Update the stuck component from "queued" to "failed" status
UPDATE custom_component_jobs 
SET status = 'failed', 
    error_message = 'Generated component has syntax errors: Cannot use import statement outside a module', 
    updated_at = NOW() 
WHERE effect = 'APerfectlyRoundScene' 
  AND status = 'queued'
RETURNING id, status;
