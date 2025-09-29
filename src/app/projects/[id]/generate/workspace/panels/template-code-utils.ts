export const dangerousTemplatePatterns = [
  /eval\s*\(/,
  /Function\s*\(/,
  /\.innerHTML\s*=/,
  /document\.write/,
  /window\.location/,
  /__proto__/,
  /constructor\s*\[/,
];

const sanitizeComponentName = (value: string, fallback: string) => {
  const base = value || fallback;
  const cleaned = base.replace(/[^A-Za-z0-9_$]/g, "");
  if (!cleaned) return "TemplateComponent";
  if (!/[A-Za-z_$]/.test(cleaned[0]!)) {
    return `Template${cleaned}`;
  }
  return cleaned;
};

export const inferTemplateComponentName = (code: string, fallback: string) => {
  const searchOrder: Array<[RegExp, number]> = [
    [/export\s+default\s+function\s+([A-Za-z_$][\w$]*)/, 1],
    [/export\s+default\s+([A-Za-z_$][\w$]*)/, 1],
    [/const\s+([A-Za-z_$][\w$]*)\s*=\s*\(/, 1],
    [/function\s+([A-Za-z_$][\w$]*)\s*\(/, 1],
    [/return\s+([A-Za-z_$][\w$]*)\s*;\s*$/m, 1],
  ];

  for (const [pattern, index] of searchOrder) {
    const match = code.match(pattern);
    if (match && match[index]) {
      return sanitizeComponentName(match[index]!, fallback);
    }
  }

  return sanitizeComponentName(fallback, fallback);
};

export const wrapCompiledTemplateModule = (code: string, componentName: string) => {
  return `const React = window.React;\n${code}\nexport default ${componentName};`;
};
