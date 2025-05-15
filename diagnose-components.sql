-- Diagnose Tetris components
SELECT 
  id, 
  status, 
  "projectId",
  effect as component_name,
  "errorMessage",
  LENGTH("tsxCode") as code_length,
  "tsxCode" 
FROM "bazaar-vid_custom_component_job"
WHERE id IN ('69ecccb5-862c-43a7-b5a5-ddd7cf7776f3', '46a6e2c8-8e1f-408a-b4a8-a131ec82e48a');
