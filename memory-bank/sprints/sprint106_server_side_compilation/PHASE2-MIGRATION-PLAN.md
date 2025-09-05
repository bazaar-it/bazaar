# Phase 2 — Migration Plan (Dev‑First, Safe)

## Summary
Add two columns (ADD COLUMN only) and test thoroughly on dev before any upstream environments.

## Steps — Development
1) Add columns in schema/migration
- `compilation_version INTEGER NOT NULL DEFAULT 1`
- `compile_meta JSONB NULL`

2) Apply migration to dev DB
- Run `npm run db:generate` then `npm run db:push`
- Review SQL; confirm only ADD COLUMN

3) Validate
- Create/edit scenes → verify `compilation_version=1` and `compile_meta.timings.ms` set
- Use `VERIFICATION-QUERIES.md`

4) Backfill (dev)
- Run `scripts/backfill-scene-js.ts` (to be implemented)
- Batch 100; set `compilation_version=1` where null

## Steps — Staging/Prod (Later)
- BACKUP first
- Apply the same ADD COLUMN migration
- Enable metrics capture; keep V1 execution
- Monitor for 24–48h

## Rollback Plan
- No destructive changes; leave columns in place if issues
- Disable any new flags; continue Phase 1 behavior

