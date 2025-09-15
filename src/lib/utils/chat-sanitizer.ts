/**
 * Chat Sanitizer
 * Ensures assistant chat responses are always user‑friendly and never leak code.
 */

// Quick heuristic to detect code-like content
const CODE_SIGNALS = [
  '```',
  'export default',
  'import ',
  'window.Remotion',
  'React.createElement',
  'useCurrentFrame',
  'useVideoConfig',
  'durationInFrames',
  'function ',
  '=> {',
  ';',
  '<svg',
];

function removeCodeBlocks(text: string): string {
  // Remove fenced code blocks
  return text.replace(/```[\s\S]*?```/g, '').trim();
}

function looksLikeCode(text: string): boolean {
  const lowered = text.toLowerCase();
  if (CODE_SIGNALS.some((sig) => lowered.includes(sig.toLowerCase()))) return true;
  // Many lines and braces often indicate code
  const lines = text.split('\n');
  if (lines.length > 12) return true;
  const braceCount = (text.match(/[{}<>]/g) || []).length;
  if (braceCount > 20) return true;
  // Specific phrasing from internal tooling
  if (/^fixed component code/i.test(text)) return true;
  return false;
}

export function sanitizeAssistantMessage(raw: string | undefined | null, fallback: string): { message: string; sanitized: boolean } {
  const base = (raw || '').trim();
  if (!base) return { message: fallback, sanitized: true };

  // Strip code blocks first
  const stripped = removeCodeBlocks(base);

  // If after stripping it still looks like code or is overly long, use fallback
  if (looksLikeCode(stripped)) {
    return { message: fallback, sanitized: true };
  }

  // Trim excessive length
  const MAX_LEN = 600;
  if (stripped.length > MAX_LEN) {
    return { message: stripped.slice(0, 280).trim() + '…', sanitized: true };
  }

  return { message: stripped, sanitized: false };
}

