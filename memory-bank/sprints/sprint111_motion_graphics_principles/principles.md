# Motion Graphics Principles for Software Demos (Taste Charter)

This document is the authoritative reference for “taste” in generated motion graphics. Use it to inform prompt wording, template examples, and quick evaluations.

## 1) Core Style Tokens

- Spacing: 8px scale. Outer margins ≥ 64px. Common gaps 12/16/24/32px.
- Typography: 1–2 families (Inter/Montserrat). Scale: 12/14/16/20/24/32/48. Line-height 1.2–1.4. Max line width 60–72ch.
- Color: 1 primary, 1 accent, 2 neutrals. AA+ contrast for all text. Gradients: low noise, shallow angles, subtle stops.
- Elevation: 3 shadow tokens only (subtle/mid/hover). Soft, colored; avoid pure black.
- Iconography: One icon family per scene. Sizes on 24/32/48px grid. Stroke/weight consistent with text weight.

## 2) Motion Laws

- Easing palette: smooth-in, ease-out, overshoot-small. Reuse consistently in a scene.
- Choreography: Stagger siblings by 2–4 frames (60–120ms at 30fps). Max 3 concurrent focal motions.
- Beats: Intro → Content → Emphasis → CTA, each with explicit frame ranges and short holds.
- Physical plausibility: Cap velocities, add settle. Standardize springs by intent (gentle/crisp/accent) and include `fps`.

Spring presets:
- gentle: { damping: 24, stiffness: 90 }
- crisp: { damping: 20, stiffness: 120 }
- accent: { damping: 18, stiffness: 140, overshootClamping: true }

## 3) Composition Rules

- Safe zones: 48px perimeter minimum; nothing touches edges.
- Focal anchors: Rule-of-thirds or centered lockups with ample negative space.
- Depth: Max 3 layers. Background parallax at 30–50% of foreground. Background softened with blur/opacity.
- Balance: Prefer fewer, larger elements; avoid crowding and clipping.

## 4) Pro Effects & Tricks (Use Sparingly)

- Micro-staggers: 2–4 frame offsets between related elements for clarity.
- Masked reveals: Clip-path/sliding masks for clean entrances “from behind” surfaces.
- Parallax: Subtle global background movement (30–50% of foreground travel).
- Anticipation & settle: 3–6 frame counter-motion before start; 6–12 frame settle with reduced stiffness.
- Light sweeps: Diagonal sheen (opacity 0→0.15→0 over 12–18 frames) for hero surfaces.
- Depth-of-field: Background blur 6–12px and 70–85% opacity during emphasis.
- Text cadence: Fade 6–10 frames, hold 30–60, fade 6–10. Keep lines stable (no drift).
- Motion contrast: Primary axis for key elements; orthogonal, weaker micro-motions for accents.
- Camera feel: Scene transition scale 0.98→1.00 (or reverse) for subtle dolly.
- Temporal hierarchy: Large elements move slower; small accents move faster.
- Accent restraint: Use accent color primarily for highlights/callouts.

## 5) Anti‑Patterns (Ban List)

- >4 hues, mixed icon families, emoji-as-icon (unless explicitly requested).
- 0ms entrances, constant bounce, permanent wobble, jitter.
- Harsh black shadows, multiple layered shadows, noisy gradients, neon-on-neon.
- Body text < 14px, >2 fonts, inconsistent type scales, full-justified UI text.
- Edge collisions, clipped/overflowed content, out-of-bounds coordinates.
- >3 simultaneous focal animations; constant background motion behind text.
- Inconsistent springs within a set; missing `fps`.
- Unbounded text lines; long paragraphs without breaks.
- Mixed easing on elements that should feel unified; mismatched staggers.
- Using top/left layout jumps instead of transforms for motion.
- Overuse of blur/glow/glassmorphism leading to legibility loss.
- Icon stroke weight inconsistent with text; arbitrary, off-grid icon sizes.

## 6) Checklists

Pre-ship checklist (yes/no):
- Fonts ≤ 2; body ≥ 14px; headings 24–48px.
- Colors ≤ 4 hues; text contrast AA+; accent used sparingly.
- Safe zones ≥ 48px; nothing clipped; elements within bounds.
- Max 3 concurrent focal motions; staggers present; easing consistent.
- Springs use fps; presets consistent by intent.
- Depth ≤ 3 layers; background softened; no constant motion under text.

## 7) Prompt Integration Guidance

- Append a “Taste Charter” section to the generator prompt that enforces the tokens, motion laws, and ban list.
- Keep single-step generation. If user intent matches curated templates, prefer adapting them; else default to Minimal Corporate pack.
- Retain strict technical rules (window globals, scoping, duration export, 30fps math).

