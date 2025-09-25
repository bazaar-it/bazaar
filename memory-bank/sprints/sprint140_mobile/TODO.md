# TODO — Sprint 140 Mobile

## Foundation
- [ ] Audit existing breakpoint usage and replace manual `window.innerWidth` checks with shared hook across marketing + workspace.
- [ ] Create mobile UI primitive library (`BottomSheet`, `StickyCTA`, `FloatingActionBar`, responsive typography scale).
- [ ] Implement lazy loading + `sizes` metadata for heavy marketing media assets.

## Landing Page
- [ ] Redesign hero for mobile-first stack with sticky CTA + social proof.
- [ ] Convert long-form sections into swipeable card carousel with animation triggers.
- [ ] Rework template/demo modules for horizontal scroll and capture engagement analytics.
- [ ] Launch testimonial carousel + mobile-friendly FAQ accordion.

## Generate Workspace
- [x] Redesign mobile navigation (bottom nav, floating quick actions, header switcher).
- [ ] Enhance preview ergonomics
  - [ ] Drive preview sizing from actual aspect ratio and show orientation guidance for portrait vs landscape scenes.
  - [ ] Add pinch-to-zoom, double-tap reset, and thumb-friendly scrub bar with scene markers.
  - [ ] Replace native fullscreen call with custom modal that adds playback controls, captions, and safe-area padding.
- [ ] Upgrade mobile chat composer
  - [ ] Design sticky, safe-area aware composer with larger input, labeled attach/voice buttons, and suggestion chips.
  - [ ] Implement inline upload carousel (progress, retry, swipe-to-remove) plus camera/photo picker shortcuts.
  - [ ] Remove desktop drag cues, tighten error states, and support inline transcript display from voice input.
- [ ] Modernize templates / media / projects surfaces
  - [ ] Convert "Projects" tab into mobile-first list/cards with quick actions (rename, share, delete) and lightweight previews. (Touch-safe preview + controls shipped; follow-up: dedicated rename/share affordances)
  - [ ] Rework templates into category tabs with horizontal carousels and lazy-loaded previews for performance. (Mobile list & deferred previews landed; next: category surfacing + carousels)
  - [ ] Surface media library as a bottom sheet accessible from composer + quick actions with large tap targets.
- [ ] Build mobile timeline drawer
  - [ ] Replace embedded desktop timeline with stacked scene cards, drag handles, and per-card duration slider.
  - [ ] Add mute toggle, audio waveform summary, and quick insert controls for gaps.
  - [ ] Remember drawer state and expose timeline entry point near preview for discoverability.
- [ ] Create dedicated mobile share/export flow with resilient error handling.

## Instrumentation & QA
- [ ] Extend analytics events for mobile funnel and workspace usage.
- [ ] Configure session replay sampling + device tagging.
- [ ] Draft regression checklist + usability testing plan.
- [ ] Gate workspace changes behind `mobile_v2` flag and define rollout KPIs.
