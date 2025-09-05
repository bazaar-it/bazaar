# Sprint 106: Server‑Side Compilation

## Goal
Move all TSX→JS compilation from the client to the server at scene create/edit time. Persist compiled JS and serve it unchanged to the client for preview, sharing, and export.

## Why
- Reduce failure points (no client Sucrase, no namespace wrap, no API regex)
- Increase reliability (single artifact across environments)
- Improve performance (cacheable, versioned JS)

## Target Architecture
```
LLM TSX → Server compile (Sucrase/Babel) → Store JS (R2) → Save outputUrl in DB → Client import(outputUrl)
```

## Scope (This Sprint)
- New/edited scenes compile on the server and produce a versioned `outputUrl`
- Component API returns the stored JS unchanged (keep Day‑1 simplification)
- Preview uses dynamic import via `useRemoteComponent` (no client compile)
- Fallback UI shown while a scene is building or on compile error

## Out of Scope (Next Sprints)
- State synchronization refactor
- Auto‑fix redesign
- Full template validation

## Risks
- Initial build latency on edit (acceptable with clear progress UI)
- Backfill of legacy scenes (handled lazily on first access)
