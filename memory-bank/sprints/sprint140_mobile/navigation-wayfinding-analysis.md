# Navigation & Wayfinding Updates — Sprint 140

## Objectives
- Persistent mobile bottom navigation highlighting even after layout reflows or project switches.
- Tactile feedback for all primary mobile navigation actions.
- Contextual quick actions to keep generation, preview, and timeline access within thumb reach once the user is active.
- Breadcrumb-driven project switcher that works on both desktop and mobile headers without ejecting from the workspace.

## Key Decisions
1. **State persistence for bottom nav**
   - Store the active panel key in `localStorage` per project (`bazaar:workspace:<id>:mobile-panel`).
   - Reset to chat when the project changes to avoid confusing carry-over between projects.

2. **Haptics abstraction**
   - Added a single `triggerHaptic` helper that prefers `navigator.vibrate` and gracefully no-ops when unavailable (Safari, desktop).
   - Reused the helper for nav taps, quick actions, and the quick-create flow so the feedback is consistent.

3. **Quick action cluster**
   - Anchored as a fixed stack above the bottom nav with blur + shadow to preserve preview visibility.
   - Actions: `Generate` (switch to chat), `Full preview` (requests fullscreen on the preview container, with `webkitRequestFullscreen` fallback), `Timeline` (opens a modal drawer with the existing timeline panel via dynamic import to avoid initial bundle cost).
   - Drawer closes on explicit close button or when the timeline panel fires `onClose`.

4. **Breadcrumb switcher**
   - Desktop (`AppHeader`) and mobile (`MobileAppHeader`) now show `Projects / Current` with a dropdown trigger when multiple projects are available.
   - Switching closes the timeline and uses `router.push` to stay within the workspace route.
   - Dropdown lists every project with a checkmark on the active one for clarity.

## Follow-ups / Open Questions
- Decide whether the timeline drawer should remember its open state or always require manual trigger.
- Consider focusing the chat textarea when the `Generate` quick action is tapped (would need an event bridge to `ChatPanelG`).
- Evaluate analytics hooks for quick action usage once mobile instrumentation stories are ready.
