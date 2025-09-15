// Extract all icon names used in the code for preloading
export function extractIconNames(code: string): Set<string> {
  const iconNames = new Set<string>();

  // We accept any alphabetic prefix to allow unknown sets to flow into
  // the fallback chain (local → API → placeholder), but still filter
  // out obvious non-icon tokens (times, emoji, etc.).

  const timePattern = /^\d{1,2}:\d{2}$/; // e.g., 9:41, 21:15
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}/u;

  const isValidIconName = (name: string) => {
    if (!name || typeof name !== 'string') return false;
    if (timePattern.test(name)) return false; // skip times
    if (emojiRegex.test(name)) return false; // skip emoji
    if (!name.includes(':')) return false;
    const [prefix, rest] = name.split(':');
    if (!prefix || !rest) return false;
    // prefix must start with a letter (not a digit like "9:41")
    if (!/^[a-z]/i.test(prefix)) return false;
    // basic rest validation (letters, numbers, dash, slashes)
    return /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/i.test(rest);
  };

  const addIfValid = (candidate?: string | null) => {
    if (!candidate) return;
    if (isValidIconName(candidate)) iconNames.add(candidate);
  };

  // Pattern 1: { icon: "mdi:heart" }
  const objectPattern = /\{\s*icon\s*:\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = objectPattern.exec(code)) !== null) {
    addIfValid(match[1]);
  }

  // Pattern 2: icon="mdi:heart" (JSX)
  const jsxPattern = /icon\s*=\s*["']([^"']+)["']/g;
  while ((match = jsxPattern.exec(code)) !== null) {
    addIfValid(match[1]);
  }

  // Pattern 3: icon-like tokens inside arrays/objects
  // Require a known prefix and valid name to avoid false positives like "9:41"
  const arrayPattern = /["']([a-z][a-z0-9-]*:[a-z0-9-]+(?:\/[a-z0-9-]+)*)["']/gi;
  while ((match = arrayPattern.exec(code)) !== null) {
    addIfValid(match[1]);
  }

  return iconNames;
}
