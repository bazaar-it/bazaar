BAZAAR-304 — “Workspace v1: Chat + Preview + Storyboard”

(replaces the earlier draft after your feedback)

	
Sprint target	27
Owner	Front-end pod (♟ lead: you)
Depends on	302 ✅
Parallel	303 (publish/R2 pipeline)


⸻

0 · Outcome

A single /projects/[id]/generate/ workspace where a user can:
	1.	Chat to add or edit scenes (302 logic).
	2.	See a live preview of the current video.
	3.	Browse & tweak the storyboard: list of scenes, “Add Scene” button, inline code editor per scene.

➡️ All inside a resizable panel layout that feels similar to the old /edit UI but without the heavy timeline.

Nothing from /edit is deleted – we copy/rename what we need so future advanced features stay intact.

⸻

1 · Definition of Done

#	Requirement
1	Route /projects/[id]/generate renders the new workspace shell (PanelGroup).
2	Sidebar (new component GenerateSidebar.tsx) shows the user’s projects; icons: Chat, Preview, Storyboard, Code. Collapsible.
3	ChatPanelG (fork of /edit/panels/ChatPanel.tsx)• auto-tags @scene(id)• uses generateSceneCode• toasts (sonner) for errors/no-scene-selected.
4	PreviewPanelG (fork, simplified)• <Player> refreshes on new scene / compile success.• No orphan-script clean-ups; rely on refreshToken.
5	StoryboardPanelG (NEW)• Shows list of scenes (name + duration).• “Add Scene” → opens modal or prompt, calls generateSceneCode.• Click scene ⇒ selects it (sets selectedScene in Zustand).• Tabs inside panel: “Props” (JSON viewer)
6	CodePanelG optional separate panel – just mirrors the current scene’s code (same component as Storyboard → Code tab, so zero extra work).
7	Panel manager (WorkspaceContentAreaG.tsx) supports Chat / Preview / Storyboard / Code. Uses drag-resize; timeline panel is absent.
8	No removals – the original /edit files stay untouched; new files live under /generate/workspace/*.
9	Type-check & tests green.Smoke test: open generate workspace, type prompt, scene appears in storyboard, preview refreshes.
10	Docs updated (docs/prompt-flow.md, README badge “Workspace UI v1”).


⸻

2 · Implementation Plan

Seq	Task	Est
1	Scaffold /generate/workspace route; copy ProjectEditorRoot.tsx → GenerateWorkspaceRoot.tsx. Strip timeline logic.	1 h
2	Sidebar fork → GenerateSidebar.tsx; keep project list & icons subset.	1 h
3	ChatPanelG – copy, delete SSE-reconnect code, wire sonner toasts.	3 h
4	PreviewPanelG – copy, remove script-cleanup heuristics.	2 h
5	StoryboardPanelG – fresh component:• list, select, add, delete (soft).• internal tabs Props/Code.Reuse GenerateVideoClient helpers for compile.	4 h
6	WorkspaceContentAreaG – register 4 panel types; drag/resize works.	2 h
7	Toast provider (sonner) in _app. Replace console warns.	1 h
8	Glue Zustand store – selectedScene & refreshToken reused from 302.	2 h
9	TypeScript / eslint pass.	1 h
10	Smoke test (jest-dom).	1 h
11	Docs & screenshots.	1 h

Total ≈ 19 h.

⸻

3 · Risks & Notes

Risk	Mitigation
Forked panels drift from originals	Add // @legacy-source comment + keep same API so we can cherry-pick fixes later.
StoryboardPanel complexity	Start with minimal features (list, add, select, code tab). Fancy drag-reorder → future 305.
Duplicate state stores	Centralise in videoState to avoid two sources of truth.


⸻

Ready to file?

Let me know if any other tweak is needed – otherwise I’ll open BAZAAR-304 with this revised scope and start the branch.