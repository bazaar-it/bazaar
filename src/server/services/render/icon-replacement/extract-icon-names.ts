// Extract all icon names used in the code for preloading
export function extractIconNames(code: string): Set<string> {
  const iconNames = new Set<string>();

  // Pattern 1: { icon: "mdi:heart" }
  const objectPattern = /\{\s*icon\s*:\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = objectPattern.exec(code)) !== null) {
    if (match[1]) iconNames.add(match[1]);
  }

  // Pattern 2: icon="mdi:heart" (JSX)
  const jsxPattern = /icon\s*=\s*["']([^"']+)["']/g;
  while ((match = jsxPattern.exec(code)) !== null) {
    if (match[1]) iconNames.add(match[1]);
  }

  // Pattern 3: iconData arrays, generic "set:name" tokens
  const arrayPattern = /["']([a-z0-9-]+:[a-z0-9-]+)["']/gi;
  while ((match = arrayPattern.exec(code)) !== null) {
    if (match[1] && match[1].includes(':')) {
      iconNames.add(match[1]);
    }
  }

  return iconNames;
}

