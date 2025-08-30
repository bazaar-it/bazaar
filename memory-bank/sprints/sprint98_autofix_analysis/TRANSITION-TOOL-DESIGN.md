# Transition Tool — Boundary Refinement (Sprint 98)

Status: Draft
Owner: AI Agent (with Mark)
Scope: Smooth transitions between scene N and N+1 by editing only the last/first window (default 30 frames each).

## Problem
Hard cuts between scenes. Our system lacks overlap rendering and consistent transition logic. Users want to request: “Make transition between scene n and n+1 better”.

## Tool Goal
A pure tool that: (1) plans a boundary transition spec and (2) emits minimal, targeted code edits confined to the last/first N frames, to be applied via the Edit tool.

## Inputs
- aSceneId, bSceneId
- aCode, bCode
- aDuration, bDuration (frames)
- fps (default 30)
- requested spec (optional): overlapFrames, type, easing, direction

## Output
- BoundaryPlan: overlapFrames, type, easing, direction, per‑side edit snippets
- Optional updated code (future): pre-applied patches if we later allow direct emission

## Default Strategy
- Type: crossfade
- Overlap: min(30, 20% of the shorter scene)
- Easing: easeInOutCubic
- Window: [A_end-overlap…A_end], [B_start…B_start+overlap]

## Application Flow
1) User prompt → Orchestrator selects Transition Tool (intent: “make transition smoother between n and n+1”).
2) Transition Tool returns BoundaryPlan with two small snippets:
   - A: opacity 1→0 over last N frames
   - B: opacity 0→1 over first N frames
3) Executor calls Edit Tool twice (A then B) to splice snippets into the correct opacity/easing areas.
4) Persist → compile → auto‑fix → eval transition checks.

## Eval Checks
- Overlap sanity: both scenes visible in overlap
- Easing whitelist: approved easings only
- Flicker guard: no full-white flashes
- Duration sanity: N within [10, 60] unless requested

## Limitations & Dependencies
- Composition must support overlap for true crossfades. Today Series hard-cuts; we should add an overlap-aware renderer (TransitionRenderer) in `/src/remotion/`.
- Until renderer supports overlap, opacity ramps won’t show a crossfade (still useful for per-scene entry/exit smoothness).

## Files Added
- `src/tools/transition/transition.ts` — Tool implementation
- `src/tools/helpers/types.ts` — Transition types and Zod schema

## Next Steps
- Add simple overlap support in Remotion composition (TransitionRenderer)
- Add executor helper to apply snippets via Edit Tool
- Add UI action: “Make transition between Scene n and n+1 better”
- Add evals for overlap/easing/flicker

