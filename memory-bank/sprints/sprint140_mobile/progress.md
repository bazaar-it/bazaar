# Progress — Sprint 140 Mobile

## 2025-09-25
- Created sprint folder with overview, outline, and TODO to consolidate mobile roadmap.
- Captured current landing page + workspace gaps referencing existing implementations for context.
- Defined success metrics, workstreams, and instrumentation requirements ahead of design/engineering kick-off.

Next:
- Validate baseline analytics for mobile funnel and workspace usage.
- Draft wireframes for mobile hero, chat composer, and timeline drawer concepts.

## 2025-09-26
- Implemented mobile navigation overhaul: bottom nav state now persists per project with haptic feedback and quick action cluster post-generation. Linked implementation details in `navigation-wayfinding-analysis.md`.
- Added floating timeline drawer and fullscreen preview trigger to keep post-generation actions within thumb reach.
- Delivered breadcrumb-driven project switcher across desktop and mobile headers so users can swap projects in-place without leaving the workspace.

Next:
- Evaluate chat input focus hand-off from quick actions to further reduce taps.
- Add analytics events for quick action + breadcrumb interactions once instrumentation workstream is ready.

## 2025-09-27
- Audited desktop vs mobile experiences for project switching and the generate workspace; documented layout, navigation, and interaction differences in `generate-mobile-gap-analysis.md`.
- Identified core mobile gaps: cramped composer, hidden media library, timeline drawer ergonomics, preview sizing/orientation handling, and heavy desktop panels rendered unchanged on phones.
- Captured priority recommendations (mobile-focused project list, composer redesign, adaptive preview, mobile timeline cards, richer upload UX) to guide upcoming implementation stories.

Next:
- Share audit findings with design for wireframes of mobile composer, preview, and project list.
- Break recommendations into TODO items (composer, preview, timeline, media) and align with instrumentation requirements.

## 2025-09-27
- Mapped desktop vs mobile user journeys for Projects and Generate workspace, capturing current behaviour and gaps in `desktop-vs-mobile-ux-map.md` with code references.
- Identified high-priority mobile pain points (preview ergonomics, chat composer, templates/projects panels, timeline controls) to guide upcoming mobile-first iterations.
- Implemented first-pass mobile chat composer improvements: sticky safe-area padding and compact horizontal attachment tray to prevent keyboard overlap and overflow.【src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx:1828】【src/components/chat/MediaUpload.tsx:160】
- Removed the mobile timeline entry point to keep the workspace focused on chat + preview while the touch-friendly timeline redesign is pending.【src/app/projects/[id]/generate/workspace/MobileWorkspaceLayout.tsx:220】
- Simplified template previews on mobile to show a static frame (≈145) instead of hover video playback, cutting heavy Remotion players from scroll.【src/app/projects/[id]/generate/workspace/panels/TemplatesPanelG.tsx:123】

Next:
- Prioritise actionable UI experiments (mobile composer redesign, template card disclosure) and align with instrumentation plan before implementation.

## 2025-09-27 (cont.)
- Replaced the mobile "Full preview" action with an in-app overlay that includes an explicit close control, avoiding native fullscreen traps on touch devices.
- Suppressed floating quick actions while the overlay is open so users always see the exit control.
- Logged the overlay fallback as the baseline for upcoming preview ergonomics work.
## 2025-09-28
- Stabilised Templates and My Projects panels for touch devices: list layout on mobile, persistent titles/actions, and preview toggles that avoid accidental navigation.
- Deferred Remotion compilation behind explicit preview requests via new `useIsTouchDevice` hook, reducing crashes when opening template cards on phones.
- Added brand-safe placeholders and inline preview controls so mobile users can rename, favorite, or delete projects without relying on hover overlays.

## 2025-09-29
- Refactored `NewProjectButton` to lean on the shared `useIsMobile` breakpoint hook, eliminating ad-hoc `window.innerWidth` logic and preventing the TDZ crash when the component mounted before initializing its local `isMobile` state.【src/components/client/NewProjectButton.tsx:11】【src/components/client/NewProjectButton.tsx:41】
- Synced the mobile format sheet visibility with the new breakpoint hook so it auto-closes whenever the dropdown is disabled or the viewport returns to desktop widths.【src/components/client/NewProjectButton.tsx:41】【src/components/client/NewProjectButton.tsx:108】
- Updated the Projects panel so mobile cards render the actual scene component at frame 15 instead of the placeholder initials, ensuring parity with desktop thumbnails while keeping previews opt-in for playback.【src/app/projects/[id]/generate/workspace/panels/MyProjectsPanelG.tsx:197】【src/app/projects/[id]/generate/workspace/panels/MyProjectsPanelG.tsx:298】
- Reverted `TemplatesPanelG` to the stable baseline from `main` so both mobile and desktop regain the original hover-preview behaviour and consistent grid styling.【src/app/projects/[id]/generate/workspace/panels/TemplatesPanelG.tsx:1】
- Optimised the Templates panel for touch devices: mobile prefers cached thumbnails and only compiles database templates when no image exists, preventing crashes while still showing genuine frame-15 previews and avoiding duplicate name labels.【src/app/projects/[id]/generate/workspace/panels/TemplatesPanelG.tsx:52】【src/app/projects/[id]/generate/workspace/panels/TemplatesPanelG.tsx:624】
- Ensured mobile share always surfaces the URL—clipboard copy succeeds when supported, otherwise the link posts into chat for easy reuse—and collapsed the download flow to a one-tap MP4 1080p export that mirrors desktop auto-render behaviour.【src/components/MobileAppHeader.tsx:98】【src/components/export/ExportDropdown.tsx:88】

Next:
- Sweep other project creation entry points to adopt the shared breakpoint + touch hooks and retire bespoke device detection code.
