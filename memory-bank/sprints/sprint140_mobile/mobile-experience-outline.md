# Mobile Experience Outline — Sprint 140

## 1. Foundation & Infrastructure
- **Breakpoint audit & consolidation**
  - Replace bespoke `window.innerWidth` checks on marketing pages with shared `useBreakpoint` hook to keep SSR-friendly logic and reduce hydration flicker.【F:src/app/(marketing)/home/page.tsx†L1-L47】
  - Document standardized breakpoints (xs < 480, sm < 640, md < 768, etc.) and migrate Tailwind classes accordingly.
- **Shared mobile primitives**
  - Build `BottomSheet`, `StickyCTA`, and `FloatingActionBar` components for reuse across marketing and workspace surfaces.
  - Extract responsive typography scale so hero headings and chat labels auto-adjust rather than relying on `text-3xl md:text-4xl` duplication.
- **Performance safeguards**
  - Lazy-load heavy marketing modules (e.g., YouTube iframe, template carousel) only when scrolled into view.
  - Add image `sizes` attributes and responsive source sets for hero imagery and backgrounds.

## 2. Landing Page Upgrades
- **Hero section**
  - Swap the two-column desktop layout for a stacked mobile hero with primary CTA + secondary social proof above the fold.
  - Introduce auto-resizing CTA button that pins above the keyboard when login modal is open.
  - Replace static gradient button container with `sticky` CTA bar when user scrolls past hero.
- **Value proposition cards**
  - Reflow text-heavy sections ("Create viral videos" and long paragraphs) into swipeable cards with iconography to prevent cognitive overload.【F:src/app/(marketing)/home/page.tsx†L74-L160】
  - Use `IntersectionObserver` to trigger subtle animations instead of always-on particle effects on low-power devices.
- **Template & demo modules**
  - Convert template grid into horizontal scroll snaps with previews sized for phone width.
  - For embedded demo video, surface a play overlay with analytics to capture engagement and degrade gracefully when autoplay is blocked.
- **Trust & FAQ**
  - Introduce compact testimonial carousel with avatar + quote sized for 320px width.
  - Collapse FAQ into accordions with default-open first item, ensuring tap targets ≥48px.
- **Analytics**
  - Track `homepage_mobile_cta_click`, `homepage_mobile_scroll_depth`, and `homepage_mobile_video_play` events.
  - Add pixel-perfect screenshots for QA on key breakpoints (320, 375, 414, 480, 600).

## 3. Generate Workspace Enhancements
- **Navigation & wayfinding**
  - Replace bottom nav buttons with icons + labels that persist highlight, and add haptic feedback via `navigator.vibrate` fallback.
  - Introduce floating "quick action" (generate, preview full-screen, timeline) button cluster that appears after first prompt.
  - Add breadcrumbs / project switcher accessible from header without leaving workspace.
- **Preview experience**
  - Make preview panel collapsible with pinch-to-zoom and orientation-aware aspect ratios (lock to `min(80vh, width * aspect)` instead of fixed pixel heights).【F:src/app/projects/[id]/generate/workspace/MobileWorkspaceLayout.tsx†L61-L118】
  - Provide full-screen preview modal with scrubber and caption for scene metadata.
  - Surface playback controls optimized for thumb reach (bottom-right area).
- **Chat & prompt input**
  - Implement sticky composer with safe-area padding, quick-attach buttons (image, screen recording), and voice input toggle.
  - Add prompt suggestions chips above composer that adapt to context (empty project, revision loop).
  - Ensure keyboard interactions do not collapse preview unexpectedly; add `ScrollView` that keeps last messages visible.
- **Templates & media library**
  - Convert template list into category tabs with virtualization to avoid long scrolls.
  - Provide search + filters in bottom sheet overlay to keep list accessible while preview remains visible.
  - Sync `My Projects` with quick rename and swipe-to-switch interactions.
- **Timeline & editing**
  - Create mobile timeline drawer accessible via floating FAB; show scene cards stacked vertically with drag handles.
  - Support long-press reorder and quick duration adjustments with slider controls.
  - Add audio track summary and simple toggle to mute/unmute preview.
- **Render & export**
  - Add dedicated "Share/Export" screen optimized for mobile with progress indicator, share sheet integration, and ability to copy links.
  - Provide offline-friendly error states when render queue fails (retry banner).

## 4. Instrumentation, QA & Rollout
- **Analytics dashboards**
  - Break down mobile vs desktop funnel metrics in existing analytics tooling; annotate release milestones.
  - Capture panel usage telemetry (chat vs templates vs projects) for mobile to prioritize follow-up iterations.
- **Session replay & logging**
  - Enable targeted session replay sampling (5% of mobile sessions) with masking for sensitive content.
  - Extend existing `analytics.projectOpened` events with device info for correlation.【F:src/app/projects/[id]/generate/page.tsx†L1-L68】
- **QA matrix**
  - Define regression checklist covering iOS Safari, Android Chrome, small tablets, and desktop responsive mode.
  - Schedule usability tests with 5 target customers; document insights in sprint progress notes.
- **Rollout plan**
  - Behind feature flag (`mobile_v2`) for workspace, with gradual ramp based on stability KPIs.
  - Marketing changes ship globally after staging sign-off and Lighthouse mobile score ≥90.
