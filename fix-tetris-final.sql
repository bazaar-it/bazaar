
-- Fix JSX syntax errors in Tetris components and set to building status
-- This properly escapes the table name with double quotes

-- First fix AnimateVariousTetrominoScene component (ID: 69ecccb5-862c-43a7-b5a5-ddd7cf7776f3)
UPDATE "bazaar-vid_custom_component_job"
SET "tsxCode" = REPLACE("tsxCode", E'</AbsoluteFill>;', E'</AbsoluteFill>'),
    status = 'building',
    "errorMessage" = NULL -- Clear previous error message
WHERE id = '69ecccb5-862c-43a7-b5a5-ddd7cf7776f3';

-- Then fix OnceARowScene component (ID: 46a6e2c8-8e1f-408a-b4a8-a131ec82e48a)
UPDATE "bazaar-vid_custom_component_job"
SET "tsxCode" = REPLACE("tsxCode", E'</AbsoluteFill>;', E'</AbsoluteFill>'),
    status = 'building',
    "errorMessage" = NULL -- Clear previous error message
WHERE id = '46a6e2c8-8e1f-408a-b4a8-a131ec82e48a';

-- Get status after fixes
SELECT id, effect AS component_name, status, 
       LEFT("tsxCode", 50) as code_preview,
       "tsxCode" NOT LIKE '%</AbsoluteFill>;%' as syntax_fixed
FROM "bazaar-vid_custom_component_job"
WHERE id IN ('69ecccb5-862c-43a7-b5a5-ddd7cf7776f3', '46a6e2c8-8e1f-408a-b4a8-a131ec82e48a');
    