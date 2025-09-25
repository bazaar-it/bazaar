# Sprint 140 – Mobile Experience Overhaul

## Why this sprint exists
- The landing page (`src/app/(marketing)/home/page.tsx`) is heavily tuned for desktop hero animations, long-form marketing copy, and large CTA buttons that do not adapt gracefully to smaller screens. The current implementation relies on manual `window.innerWidth` checks and spreads hero content in stacked blocks that create long scrolls on phones.【F:src/app/(marketing)/home/page.tsx†L1-L124】
- The generate workspace swaps to `MobileWorkspaceLayout` and a bottom navigation bar, but it still mirrors the desktop mental model. Preview sizing is fixed, panel transitions are abrupt, and essential actions like timeline edits or render/export management become hidden on mobile devices.【F:src/app/projects/[id]/generate/workspace/GenerateWorkspaceRoot.tsx†L1-L211】【F:src/app/projects/[id]/generate/workspace/MobileWorkspaceLayout.tsx†L1-L118】

## Sprint objective
Deliver a mobile-first experience that keeps users in flow from marketing touch through project creation. We will:
1. **Reduce friction on the marketing funnel** by creating responsive hero, proof, and CTA patterns that feel native on phones.
2. **Rebuild the generate workspace for touch** so chat, preview, timeline, and library tools are easy to access without desktop assumptions.
3. **Establish mobile instrumentation & QA** to ensure changes improve conversion and in-app task completion.

## Success metrics
- +15% lift in mobile sign-up → project creation conversion (baseline: TBD via analytics export).
- Mobile workspace retention: ≥60% of mobile sessions trigger at least one generation within 2 minutes.
- Zero mobile-only regressions in preview playback, chat input, or project switching (tracked via QA checklist and bug bash doc).

## Workstreams
1. **Foundation** – breakpoints, layout primitives, shared mobile components, loading/perf improvements.
2. **Landing page** – hero, CTA stack, social proof, comparison modules, pricing CTA, FAQ accordion.
3. **Generate workspace** – navigation, preview ergonomics, chat usability, attachments, timeline accessibility, template browsing, rendering/export controls.
4. **Instrumentation & QA** – analytics dashboard, session replay sampling, device matrix, regression suites.

See `mobile-experience-outline.md` for detailed ideas and `TODO.md` for actionable tickets.
