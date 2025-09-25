# Generate Workspace: Desktop vs Mobile Audit

## 1. Desktop reference experience

### My Projects (desktop panel)
- **Layout & navigation** – `src/app/projects/[id]/generate/workspace/GenerateSidebar.tsx:25` exposes a dedicated "Projects" entry that opens `MyProjectsPanelG`. The panel renders a searchable grid with live Remotion previews, inline rename/favorite actions, delete confirmation, and hover-driven video playback (`src/app/projects/[id]/generate/workspace/panels/MyProjectsPanelG.tsx:40`).
- **Context switching** – Project cards open in-place via `router.push`, while the header (desktop `AppHeader`) keeps export/share controls immediately visible.
- **Feedback** – Empty states (“No scenes yet”), loading spinners, and compilation errors are all surfaced in the grid itself so the user understands project health before switching.

### Generate workspace (desktop)
- **Multi-panel canvas** – `WorkspaceContentAreaG` manages draggable, resizable panels built on resizable-panels + dnd-kit (`src/app/projects/[id]/generate/workspace/WorkspaceContentAreaG.tsx:1`). Users can pin Chat, Preview, Code, Storyboard, Templates, Media, My Projects, and Brand panels simultaneously, then reorder them horizontally.
- **Panel lifecycle** – Sidebar icons drag into the canvas or toggle panels with a click (`GenerateSidebar.tsx:40`). Panels (except Preview) have close icons, while dropzones allow drag-to-rearrange across the row.
- **Timeline & playback** – Timeline mounts inside the workspace with playback controls and scene metadata; preview header exposes loop & playback speed via timeline instrumentation.
- **Chat experience** – Desktop composer shows attachment tray, icon previews, and multi-attachment management (`ChatPanelG.tsx:1873`). File uploads compress images, extract audio from video, and support asset mentions all within a wide text input.
- **Media/template surfaces** – Dedicated panels give full-screen width lists with filters, search, drag-and-drop into chat, and asset metadata.

## 2. Current mobile experience snapshot

### Mobile header & navigation
- **Header** – `MobileAppHeader.tsx:1` keeps logo + breadcrumb project switcher + share/export. Switching projects opens a dropdown but the grid view remains buried behind the "Projects" tab.
- **Bottom navigation** – `MobileWorkspaceLayout.tsx:56` swaps desktop sidebar for a four-item tab bar (Chat, Templates, Projects, New) with localStorage persistence and haptic feedback.
- **Quick actions** – Once a scene exists, floating buttons provide Generate, Full preview, and Timeline access (`MobileWorkspaceLayout.tsx:214`). Timeline opens a full-screen drawer with the desktop timeline panel embedded.

### Mobile workspace panels
- **Preview** – Occupies a fixed box above the tabs with min/max heights (`MobileWorkspaceLayout.tsx:154`). Aspect ratio is approximated via height clamps; there is no pinch-to-zoom, landscape handling, or scrub bar.
- **Chat** – Reuses the desktop composer, but on a narrow viewport the text area shrinks to 32px high with small icon buttons. Attachment chips and upload list exist, yet they’re horizontally constrained and overflow quickly.
- **Templates & Projects tabs** – Each reuses desktop panel components; heavy grids, hover affordances, and wide search bars appear, forcing long vertical scroll and tiny tap targets.
- **Media uploads** – Image/video uploads still rely on the desktop `MediaUpload` component with inline toasts and no mobile-first progress UI. Drag-and-drop cues remain visible even though touch drag is unsupported (`ChatPanelG.tsx:1170`).
- **Timeline** – Only accessible through the quick-action overlay. The drawer displays the desktop timeline layout inside a modal, so controls are still sized for cursor interaction.

## 3. Gaps & opportunities

### Projects / switching
- The dedicated project grid is buried in a tab instead of being the landing view for mobile users. Cards retain hover-only interactions (favorite, rename) and Remotion previews that autoplay on load, causing performance spikes on cellular. Consider a lightweight list with tap gestures and explicit context actions.

### Chat & attachments
- The composer’s 32px text area and tiny icon buttons are hard to tap. Attachment previews lack swipe-to-remove or carousel behavior; upload progress is only shown via toasts. Voice input is hidden behind a 16px icon without labeling.
- Drag-and-drop affordances clutter the UI even though touch doesn’t support them. Upload errors render as small red badges that aren’t obvious on mobile.

### Preview & playback
- Preview height clamps (max 40–65% of viewport) often leave large letterboxing. There is no orientation swap when rotating the device, no pinch/zoom, and no ability to scrub or scrub-by-scene. Fullscreen relies on the platform `requestFullscreen` with no fallback instructions.

### Timeline & scene management
- Timeline drawer is discoverable only via floating button. Once opened, the embedded desktop timeline uses small handles and expects horizontal dragging. No quick duration slider, no summary chips, and the drawer cannot be partially expanded/pinned.

### Templates / media / projects surfaces
- Templates panel shows full desktop grids with multi-column cards, causing horizontal clipping. There is no quick category filter or search optimized for touch. Media panel is inaccessible in mobile layout (no tab), so users cannot browse uploads without switching to desktop.

### System navigation & feedback
- There is no onboarding or empty-state guidance when a user opens the workspace on mobile for the first time—active panel always defaults to Chat, even if the project only has templates.
- Haptics exist for nav/quick actions, but there’s no visual state change after tap (e.g., pressed state, ripple) beyond color shift.

## 4. Recommendations (next steps)
1. **Define mobile-first views** for Projects and Templates: switch the tab content to list/swipe cards with large tap targets, lazy Remotion previews, and explicit action sheets for rename/share/delete.
2. **Rebuild the chat composer** with a sticky safe-area aware sheet: larger input, labeled attachment/voice buttons, inline thumbnail carousel with progress states, and a collapsible uploads drawer.
3. **Make preview adaptive**: compute aspect ratio based on actual composition, allow pinch-to-zoom + double-tap to reset, and introduce a bottom scrub bar with scene markers. Provide orientation hints when better experience exists in landscape.
4. **Timeline micro-interactions**: convert to vertically stacked scene cards with drag handles, per-card duration slider, audio mute toggle, and optional minimized banner showing current scene order.
5. **Expose media library** via a bottom sheet accessible from composer + quick action, rather than hiding it as a desktop-only panel.
6. **Improve upload ergonomics**: add dedicated upload manager overlay with progress bars, resumable support, compression info, and CTA to pick from camera/photos. Surface errors inline with retry.
7. **Mobile-specific analytics**: log tab switches, quick action usage, upload start/complete/failure, and timeline drawer open/close to validate improvements.
