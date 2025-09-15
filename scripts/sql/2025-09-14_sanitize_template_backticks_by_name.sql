-- Same sanitization as the ID-based script, but targets by template name.
-- Use this when IDs differ between dev and prod.

BEGIN;

-- Preview (optional)
SELECT id, name, updated_at
FROM "bazaar-vid_templates"
WHERE name IN (
  'Build a'' word slide',
  'Rainbow stroke text effect'
);

-- Sanitize Build a' word slide by name
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
WHERE name = 'Build a'' word slide';

-- Sanitize Rainbow stroke text effect by name
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
WHERE name = 'Rainbow stroke text effect';

-- Verify (optional)
SELECT id, name, LENGTH(tsx_code) AS tsx_len
FROM "bazaar-vid_templates"
WHERE name IN (
  'Build a'' word slide',
  'Rainbow stroke text effect'
);

COMMIT;

