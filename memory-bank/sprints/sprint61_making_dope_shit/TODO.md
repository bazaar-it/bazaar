# Sprint 61: Making Dope Shit - TODO

## Priority 1: Prompt Overhaul

- [ ] Rewrite code-generator.ts with:
  - [ ] Fast-paced timing guidelines (8-15 frame animations)
  - [ ] Hero element focus (max 2-3 elements at once)
  - [ ] Specific easing functions and patterns
  - [ ] Transition techniques (momentum, morphing, liquid)
  - [ ] Motion graphics best practices

- [ ] Create animation-patterns.ts with:
  - [ ] Easing function library
  - [ ] Timing constants (SNAP_IN: 8, SLIDE: 12, etc.)
  - [ ] Stagger patterns
  - [ ] Transition helpers

## Priority 2: Pattern Library

- [ ] Create /src/lib/animation-patterns/:
  - [ ] entrances.ts - Pop, slide, scale, rotate entries
  - [ ] exits.ts - Matching exits with momentum
  - [ ] transitions.ts - Scene-to-scene connections
  - [ ] emphasis.ts - Pulse, shake, glow, bounce

## Priority 3: Context Enhancement

- [ ] Update brain orchestrator to pass:
  - [ ] Previous scene's exit style
  - [ ] Desired pacing (fast/medium/slow)
  - [ ] Animation intensity level
  - [ ] Brand motion preferences

- [ ] Modify scene context to include:
  - [ ] Last 30 frames of previous scene
  - [ ] First 30 frames of next scene (if exists)
  - [ ] Overall video tempo

## Priority 4: Testing & Validation

- [ ] Create test scenarios:
  - [ ] "Product launch" - Fast, energetic
  - [ ] "Data visualization" - Clear, focused
  - [ ] "Brand story" - Smooth, flowing
  - [ ] "Social media ad" - Punchy, attention-grabbing

- [ ] Evaluation criteria:
  - [ ] Average animation duration < 20 frames
  - [ ] Clear focal points
  - [ ] Smooth transitions
  - [ ] Visual impact score

## Quick Wins (Do First)

1. [ ] Update code-generator.ts with new timing guidelines
2. [ ] Add 5 custom easing functions
3. [ ] Create one killer transition pattern
4. [ ] Test with "make it fast and punchy" prompt

## Research & Inspiration

- [ ] Analyze top motion graphics on Behance/Dribbble
- [ ] Study Instagram Reels animation patterns
- [ ] Document common timing patterns in pro work
- [ ] Create "dopeness checklist"

## Success Criteria

- Animations feel energetic and purposeful
- Clear visual hierarchy in every frame
- Seamless transitions between scenes
- Users say "wow" not "meh"