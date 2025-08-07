# Sprint 90 TODO - Database Synchronization

## Critical Issues (Must Fix)

### 1. Production Type Mismatches
- [ ] Fix `bazaar-vid_exports` table types (text → uuid/varchar)
- [ ] Test export functionality after type fix
- [ ] Verify all foreign key constraints work

### 2. Dev Type Mismatches  
- [ ] Fix `bazaar-vid_export_analytics` export_id type (text → uuid)

### 3. Duplicate Tables
- [ ] Migrate data from `api_usage_metric` to `bazaar-vid_api_usage_metric`
- [ ] Drop duplicate `api_usage_metric` table

## Cleanup Tasks

### 4. Remove Unused Empty Tables
- [ ] Drop `bazaar-vid_component_error`
- [ ] Drop `bazaar-vid_patch`
- [ ] Drop `bazaar-vid_scene_plan`
- [ ] Drop `bazaar-vid_scene_specs`

### 5. Investigate Legacy Tables
- [ ] Check if `bazaar-vid_project_memory` (621 rows) is needed
- [ ] Check if `bazaar-vid_metric` (389 rows) is needed
- [ ] Check if `bazaar-vid_agent_message` (3 rows) is needed

## Schema Decisions

### 6. Auth Schemas
- [x] Determine if dev auth schemas are needed in prod ✓ NOT NEEDED
- [ ] Document decision in CLAUDE.md
- [ ] Remove auth, pgrst, neon_auth schemas from dev (after backup)

### 7. Column Order Alignment
- [ ] Document column order differences
- [ ] Decide if realignment is necessary (probably not)

## Testing & Validation

### 8. Pre-Migration
- [ ] Create full database backups
- [ ] Set up test environment
- [ ] Run migrations on test database

### 9. Post-Migration
- [ ] Validate all foreign keys
- [ ] Test all CRUD operations
- [ ] Run full application test suite
- [ ] Monitor for 24 hours

## Documentation

### 10. Update Documentation
- [ ] Update CLAUDE.md with database changes
- [ ] Document in progress.md
- [ ] Create rollback procedures

## Migration Execution

### 11. Production Migration
- [ ] Schedule maintenance window
- [ ] Execute migration plan
- [ ] Verify data integrity
- [ ] Deploy updated code

## Important Notes

⚠️ **CRITICAL**: Review Sprint 32 data loss incident before ANY migrations
⚠️ **ALWAYS**: Test on staging first
⚠️ **BACKUP**: Take multiple backups before changes
⚠️ **MONITOR**: Watch for errors after deployment