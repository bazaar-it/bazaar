-- Fix stuck Tetris components JSX syntax

-- First, fetch the current TSX code for each component
WITH component_code AS (
  SELECT id, "tsxCode" 
  FROM "bazaar-vid_custom_component_job"
  WHERE id IN ('69ecccb5-862c-43a7-b5a5-ddd7cf7776f3', '46a6e2c8-8e1f-408a-b4a8-a131ec82e48a')
)

-- Then update the components, replacing the semicolon after </AbsoluteFill>;
UPDATE "bazaar-vid_custom_component_job"
SET 
  "tsxCode" = REPLACE(cc."tsxCode", '</AbsoluteFill>;', '</AbsoluteFill>'),
  "status" = 'building'
FROM component_code cc
WHERE "bazaar-vid_custom_component_job".id = cc.id
  AND cc."tsxCode" LIKE '%</AbsoluteFill>;%';
