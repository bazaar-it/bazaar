// src/server/services/code/duration-extractor.ts
// Lightweight duration extractor for TSX scene code.
// Strategy: Prefer explicit numeric declarations like
//   export const durationInFrames = 123;
//   export const durationInFrames_suffix = 456;
//   const durationInFrames = 789;
// Falls back to null when no safe numeric literal is found.

export const extractDurationFromCode = (code: string | null | undefined): number | null => {
  if (!code) return null;
  try {
    // Normalize whitespace for simpler regex
    const src = String(code);

    const patterns: RegExp[] = [
      /export\s+const\s+durationInFrames\s*=\s*(\d+)\s*;?/,
      /export\s+const\s+durationInFrames_[a-zA-Z0-9]+\s*=\s*(\d+)\s*;?/,
      /const\s+durationInFrames\s*=\s*(\d+)\s*;?/,
      /const\s+durationInFrames_[a-zA-Z0-9]+\s*=\s*(\d+)\s*;?/,
    ];

    for (const re of patterns) {
      const m = src.match(re);
      if (m && m[1]) {
        const val = parseInt(m[1], 10);
        if (Number.isFinite(val) && val > 0) return val;
      }
    }
    return null;
  } catch {
    return null;
  }
};

