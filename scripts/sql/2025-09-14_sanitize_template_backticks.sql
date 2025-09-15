-- Sanitize risky template-literal styles/attributes in templates that can break multi‑scene composite assembly.
-- Focus: Replace backtick template strings in inline styles with string concatenation.
-- Scope: Build a' word slide (1aa932e9-981b-44f3-b8e5-fa403c98a65f)
--        Rainbow stroke text effect (59719468-662c-485b-9279-c94626d014d9)
--
-- NOTE
-- - This script only updates tsx_code; it NULLs js_code/js_compiled_at so the server re-compiles on next use.
-- - Run on staging first; then run on production during a low-traffic window.
-- - Always backup these rows before updating if possible.

BEGIN;

-- Preview current rows (optional)
SELECT id, name, duration, usage_count, updated_at
FROM "bazaar-vid_templates"
WHERE id IN (
  '1aa932e9-981b-44f3-b8e5-fa403c98a65f', -- Build a' word slide
  '59719468-662c-485b-9279-c94626d014d9'  -- Rainbow stroke text effect
);

-- Build a' word slide: replace backtick transforms/viewBox with concatenation
UPDATE "bazaar-vid_templates"
SET
  tsx_code = regexp_replace(
               regexp_replace(
                 regexp_replace(
                   regexp_replace(tsx_code,
                     'transform:\s*`translate\(\$\{([^}]+)\}px,\s*\$\{([^}]+)\}px\)`',
                     'transform: ''translate('' || \1 || ''px, '' || \2 || ''px)''',
                     'g'
                   ),
                   'transform:\s*`translateY\(\$\{([^}]+)\}%\)`',
                   'transform: ''translateY('' || \1 || ''%)''',
                   'g'
                 ),
                 'transform:\s*`scale\(\$\{([^}]+)\}\)`',
                 'transform: ''scale('' || \1 || '')''',
                 'g'
               ),
               'viewBox\s*:\s*`0 0 \$\{([^}]+)\}\s+\$\{([^}]+)\}`',
               'viewBox: ''0 0 '' || \1 || '' '' || \2',
               'g'
             ),
  js_code = NULL,
  js_compiled_at = NULL,
  compilation_error = NULL,
  updated_at = NOW()
WHERE id = '1aa932e9-981b-44f3-b8e5-fa403c98a65f';

-- Rainbow stroke text effect: apply the same sanitization patterns
UPDATE "bazaar-vid_templates"
SET
  tsx_code = regexp_replace(
               regexp_replace(
                 regexp_replace(
                   regexp_replace(tsx_code,
                     'transform:\s*`translate\(\$\{([^}]+)\}px,\s*\$\{([^}]+)\}px\)`',
                     'transform: ''translate('' || \1 || ''px, '' || \2 || ''px)''',
                     'g'
                   ),
                   'transform:\s*`translateY\(\$\{([^}]+)\}%\)`',
                   'transform: ''translateY('' || \1 || ''%)''',
                   'g'
                 ),
                 'transform:\s*`scale\(\$\{([^}]+)\}\)`',
                 'transform: ''scale('' || \1 || '')''',
                 'g'
               ),
               'viewBox\s*:\s*`0 0 \$\{([^}]+)\}\s+\$\{([^}]+)\}`',
               'viewBox: ''0 0 '' || \1 || '' '' || \2',
               'g'
             ),
  js_code = NULL,
  js_compiled_at = NULL,
  compilation_error = NULL,
  updated_at = NOW()
WHERE id = '59719468-662c-485b-9279-c94626d014d9';

-- Verify affected rows (optional)
SELECT id, name, LENGTH(tsx_code) AS tsx_len
FROM "bazaar-vid_templates"
WHERE id IN (
  '1aa932e9-981b-44f3-b8e5-fa403c98a65f',
  '59719468-662c-485b-9279-c94626d014d9'
);

COMMIT;

