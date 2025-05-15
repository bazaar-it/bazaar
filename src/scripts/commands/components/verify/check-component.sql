-- Check the AGreenAndScene component
SELECT 
  id, 
  effect, 
  status, 
  error_message, 
  LENGTH(tsx_code) as tsx_code_length, 
  CASE WHEN tsx_code IS NULL THEN 'NULL' 
       WHEN LENGTH(tsx_code) = 0 THEN 'EMPTY' 
       ELSE 'HAS CODE' END as tsx_code_status,
  LENGTH(original_tsx_code) as original_code_length,
  CASE WHEN original_tsx_code IS NULL THEN 'NULL' 
       WHEN LENGTH(original_tsx_code) = 0 THEN 'EMPTY' 
       ELSE 'HAS CODE' END as original_code_status,
  created_at,
  updated_at
FROM custom_component_jobs
WHERE id = '7fe2a647-2c7b-4ca6-ae7e-0c4b439410cc';
