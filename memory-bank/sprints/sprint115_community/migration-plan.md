# Migration Plan — Community (Safe Additions)

Follow the project’s CRITICAL migration guidelines. Only additive changes.

## Dev Branch (Local/Dev DB)
1) Update `src/server/db/schema.ts` with new community tables/enums
2) `npm run db:generate` (creates SQL)
3) Review SQL: ensure only CREATE TABLE/INDEX/TYPE; no DROP/ALTER destructive
4) `npm run db:push` (apply to dev)
5) Implement minimal CRUD and smoke test in dev

## Staging
1) Backup staging DB
2) Apply migrations
3) Verify CRUD, API, and Community Panel in staging domain(s)
4) Test SSO across subdomains in staging

## Production
1) BACKUP production DB
2) Maintenance window approved
3) Apply migrations
4) Verify health checks and quick CRUD
5) Gradual feature flag rollout for community publishing

## Rollback
- If issues: revert feature flags → disable publish/use
- Migrations are additive; no DROP; safe to leave tables in place

## Red Flags to Avoid
- Changing existing auth/user ID types (must remain varchar(255))
- Foreign key cascades that could delete user data unexpectedly
- Heavy writes on hot paths (debounce client; batch server)

