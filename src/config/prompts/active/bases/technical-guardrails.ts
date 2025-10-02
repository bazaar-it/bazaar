export const TECHNICAL_GUARDRAILS_BASE = `
CRITICAL TECHNICAL RULES (APPLY ALWAYS):
- Use window.Remotion destructuring only: const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img } = window.Remotion.
- No imports or TypeScript annotations. Code-only output.
- Export exact duration: export const durationInFrames_[ID] = <number>; do not default to 180.
- Keep all elements within canvas bounds using useVideoConfig() width/height.
- Clamp interpolations (extrapolateLeft/Right: 'clamp').
- Default easing is cubic: when you add springs or interpolations, destructure Easing from window.Remotion and use "Easing.bezier(0.4, 0, 0.2, 1)" unless the user explicitly asks for a different feel.
- For every interpolate() call, the inputRange and outputRange arrays MUST be the same length; never provide mismatched lengths.
- Use a single transform property per element (compose translate/scale/rotate in one string).
- Ensure responsive styles; avoid fixed pixel layouts when possible.
- For edits: limit scope to requested elements; keep unrelated code unchanged.
- Do not leak global variables; obey scoping; data arrays at top-level if needed.
`;
