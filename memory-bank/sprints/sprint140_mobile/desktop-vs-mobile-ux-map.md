# Desktop vs Mobile UX Map — Projects & Generate

## Desktop Experience

### Projects management (MyProjectsPanelG)
- Projects grid supports search, pagination, favorites, and inline rename with hover-activated overlays for preview, name edit, and timestamps.【src/app/projects/[id]/generate/workspace/panels/MyProjectsPanelG.tsx:785】【src/app/projects/[id]/generate/workspace/panels/MyProjectsPanelG.tsx:250】【src/app/projects/[id]/generate/workspace/panels/MyProjectsPanelG.tsx:276】【src/app/projects/[id]/generate/workspace/panels/MyProjectsPanelG.tsx:812】
- Hover swaps static thumbnails for live Remotion previews, while loading, delete, and favorite states are layered via absolute overlays to avoid layout shifts.【src/app/projects/[id]/generate/workspace/panels/MyProjectsPanelG.tsx:252】【src/app/projects/[id]/generate/workspace/panels/MyProjectsPanelG.tsx:258】【src/app/projects/[id]/generate/workspace/panels/MyProjectsPanelG.tsx:731】
- Create, delete, and project-switch flows live alongside the grid (new project button, delete modal, redirect when the current project is removed).【src/app/projects/[id]/generate/workspace/GenerateSidebar.tsx:61】【src/app/projects/[id]/generate/workspace/panels/MyProjectsPanelG.tsx:843】【src/app/projects/[id]/generate/workspace/panels/MyProjectsPanelG.tsx:872】

### Generate workspace (desktop layout)
- Desktop layout pins `AppHeader` for rename/share/export controls, surface area for project switcher, and template creation entry.【src/app/projects/[id]/generate/workspace/GenerateWorkspaceRoot.tsx:339】
- A fixed-width sidebar exposes panel shortcuts (Projects, Chat, Timeline, Media, Code, Templates) with drag-to-add interactions, while the central `WorkspaceContentAreaG` maintains draggable, resizable panel stacks.【src/app/projects/[id]/generate/workspace/GenerateSidebar.tsx:37】【src/app/projects/[id]/generate/workspace/GenerateWorkspaceRoot.tsx:360】【src/app/projects/[id]/generate/workspace/WorkspaceContentAreaG.tsx:98】
- Timeline mounts inline beneath the main panels with enter/exit animation and visibility persistence per project via localStorage snapshots.【src/app/projects/[id]/generate/workspace/GenerateWorkspaceRoot.tsx:385】【src/app/projects/[id]/generate/workspace/GenerateWorkspaceRoot.tsx:52】
- Preview, chat, templates, media, and code panels run concurrently—drag-and-drop and playback events are coordinated through shared Zustand state and Remotion player hooks.【src/app/projects/[id]/generate/workspace/WorkspaceContentAreaG.tsx:142】【src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx:2570】【src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx:1840】

## Current Mobile Experience

### Frame
- Mobile breakpoint swaps to `MobileAppHeader` + `MobileWorkspaceLayout`, keeping the same data sources but serialising UI into a vertical stack.【src/app/projects/[id]/generate/workspace/GenerateWorkspaceRoot.tsx:312】【src/components/MobileAppHeader.tsx:155】

### Header & Navigation
- `MobileAppHeader` exposes breadcrumb project switcher, inline rename, and share/export drop-down, mirroring desktop actions within a compact bar.【src/components/MobileAppHeader.tsx:171】【src/components/MobileAppHeader.tsx:240】
- Bottom navigation persists the last-open panel per project (chat/templates/projects) and routes `New` through the same quick-create button with haptic feedback on tap.【src/app/projects/[id]/generate/workspace/MobileWorkspaceLayout.tsx:52】【src/app/projects/[id]/generate/workspace/MobileWorkspaceLayout.tsx:166】【src/app/projects/[id]/generate/workspace/MobileWorkspaceLayout.tsx:320】

### Workspace stack
- Preview occupies the top of the viewport with format-based min/max height heuristics; quick actions (Generate, Full preview, Timeline) appear once scenes exist.【src/app/projects/[id]/generate/workspace/MobileWorkspaceLayout.tsx:173】【src/app/projects/[id]/generate/workspace/MobileWorkspaceLayout.tsx:253】
- Each panel (Chat/Templates/My Projects) renders full-screen within the remaining space, reusing desktop implementations without mobile-only affordances.【src/app/projects/[id]/generate/workspace/MobileWorkspaceLayout.tsx:137】
- Timeline opens inside a full-screen drawer but renders the desktop `TimelinePanel` component wholesale.【src/app/projects/[id]/generate/workspace/MobileWorkspaceLayout.tsx:291】【src/app/projects/[id]/generate/workspace/panels/TimelinePanel.tsx:1】

## Mobile Gaps & Pain Points

### Layout & Preview
- Preview container only changes height via resize listener; there is no pinch-to-zoom, orientation response, or scrub overlay for touch, so landscape projects shrink to ≤350px tall and portrait projects still truncate on tall phones.【src/app/projects/[id]/generate/workspace/MobileWorkspaceLayout.tsx:173】【src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx:233】
- Quick actions trigger fullscreen via the browser API but there is no fallback for devices that block fullscreen (e.g., iOS Safari) or indicator when it fails.【src/app/projects/[id]/generate/workspace/MobileWorkspaceLayout.tsx:112】

### Chat & Uploads
- Composer inherits desktop spacing (`className="p-4"`) and lacks safe-area padding or sticky behaviour, so the keyboard can obscure input on smaller devices.【src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx:1868】
- Attachments preview as 96×96 tiles in a flex-wrap row; on narrow screens they push the composer off-screen instead of switching to horizontal scroll or collapsing into chips.【src/components/chat/MediaUpload.tsx:165】
- File picker does not advertise capture intents (no `capture` attribute or per-source buttons), forcing users through the generic picker for camera shots or voice memos.【src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx:2147】
- Prompt suggestions/shortcuts are absent even though mobile outline calls for chips; composer still shows desktop-specific icon toggles (Github/Figma placeholders) that are hidden but leave empty space.【src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx:2013】

### Templates & Projects panels
- Template cards reveal titles only on hover, leaving mobile users without template names unless they tap blindly.【src/app/projects/[id]/generate/workspace/panels/TemplatesPanelG.tsx:121】【src/app/projects/[id]/generate/workspace/panels/TemplatesPanelG.tsx:164】
- Projects grid also relies on hover for project titles and inline rename, making it easy to mis-tap and navigate away instead of editing, and the Remotion preview still renders (heavy) players even though hover never fires.【src/app/projects/[id]/generate/workspace/panels/MyProjectsPanelG.tsx:250】【src/app/projects/[id]/generate/workspace/panels/MyProjectsPanelG.tsx:276】
- Pagination buttons target hover states and small tap targets; there is no swipe-to-switch or quick filter UI optimised for touch.【src/app/projects/[id]/generate/workspace/panels/MyProjectsPanelG.tsx:843】

### Timeline & Editing
- Timeline drawer embeds the desktop component with dense controls (resize handles, context menus, keyboard shortcuts) that rely on mouse hover and precise dragging, making scene edits effectively unusable on touch.【src/app/projects/[id]/generate/workspace/MobileWorkspaceLayout.tsx:291】【src/app/projects/[id]/generate/workspace/panels/TimelinePanel.tsx:1774】
- There is no memory of the drawer state or mini-summary of scene order/duration when the drawer is closed, so users lack temporal context while chatting.【src/app/projects/[id]/generate/workspace/MobileWorkspaceLayout.tsx:127】

### Navigation & Context
- Mobile workspace stores active panel per project but does not surface breadcrumbs inside panels, so switching between Chat/Templates/Projects loses scroll position context each time as components remount on panel change.【src/app/projects/[id]/generate/workspace/MobileWorkspaceLayout.tsx:52】【src/app/projects/[id]/generate/workspace/MobileWorkspaceLayout.tsx:137】
- Quick actions always return to chat but cannot focus the textarea, requiring an extra tap before typing (not yet wired to `ChatPanelG`).【src/app/projects/[id]/generate/workspace/MobileWorkspaceLayout.tsx:253】【src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx:1998】

## Opportunities & Next Steps
- Introduce mobile-specific preview controls (pinch zoom, orientation-aware height, scrub bar) and a lightweight fullscreen modal with explicit error handling.
- Rebuild chat composer for mobile: safe-area padding, sticky elevation above keyboard, horizontal attachment tray, camera/voice quick actions, and contextual suggestion chips.
- Refactor template/project cards for tap-first disclosure—always show names, add swipe actions for rename/favorite/delete, and lazy-load heavy Remotion previews until cards enter viewport.
- Replace desktop timeline with a touch-first scene stack (cards, drag handles, simple duration sliders) and persist timeline summary when collapsed.
- Cache panel scroll positions and wire quick action "Generate" to focus the chat input to reduce taps; expand bottom nav analytics once instrumentation workstream lands.
