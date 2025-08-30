# Pro Tips for Comfortable, Premium Motion

These are focused techniques pros use to achieve clarity and polish without distraction. Use sparingly and with clear intent.

## Entrances & Exits
- Use 6–10 frame opacity ramps; pair with 4–8 frame scale 0.98→1.0 for “breathing” entrances.
- Avoid simultaneously changing opacity and large scale factors (>1.05) on text.
- Favor masked/clip-path reveals for panels over raw position jumps.

## Text & Readability
- Keep line length 60–72ch; clamp width for paragraphs; avoid full justify.
- Use 2–3 weights max; differentiate headings by size, weight, and tracking.
- During emphasis, dim background to 70–85% and blur 6–12px.

## Choreography
- Group related elements and apply micro-staggers (2–4 frames) within the group.
- Between sections, use 6–10 frame staggers for hierarchy.
- Never have more than 3 focal motions at once—others should be static or very subtle.

## Color & Contrast
- Keep surfaces neutral; reserve accent color for highlights, progress, or CTA.
- For gradients, keep angles shallow (20–45°) and limit stop count (2–3 stops, subtle deltas).
- Prefer colored, soft shadows (alpha 0.2–0.35) over black.

## Depth & Camera Feel
- Apply 30–50% parallax on background vs foreground.
- Use subtle global scale changes on transitions (0.98→1.0) to create camera presence.
- Cap blur at 12–16px to prevent smearing.

## Springs & Easing
- Include `fps` in all springs. Use presets consistently across element families.
- Add anticipation (3–6 frames) and settle (6–12 frames) for key motions.
- Keep overshoot small on UI (clamped or ≤ 1.05).

## Performance & Cleanliness
- Prefer transform-based motions (translate/scale) over top/left changes.
- Avoid continuous background animations under text-heavy sections.
- Keep total element count reasonable; fewer, larger elements generally read better.

## Common Fixes
- If layout feels cramped: increase outer margins to 64–96px; increase gaps by one token step.
- If motion feels noisy: remove one animation track; increase stagger to 6–10 frames.
- If text feels weak: increase size to next scale step; bump line-height to 1.35; ensure AA+ contrast.

