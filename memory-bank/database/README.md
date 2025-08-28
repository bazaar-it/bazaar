# Database Migration Documentation

This folder contains critical database migration information and safety procedures.

## Files

### 🚨 `CRITICAL-MIGRATION-GUIDE.md`
**READ THIS FIRST before any migration!**
- Complete migration safety procedures
- Verified brand extraction migration SQL (Sprint 99.5)
- Schema verification process
- Emergency procedures

### `migration-verification-commands.sql`
MCP SQL commands to verify database schemas before migration:
- Compare dev vs prod tables
- Generate exact CREATE TABLE statements
- Verify column counts and structures

## Quick Migration Process

1. **Backup production database first!**
2. Use MCP tools to verify current dev schema
3. Run verification commands from `migration-verification-commands.sql`
4. Use migration SQL from `CRITICAL-MIGRATION-GUIDE.md`
5. Test and verify after migration

## Emergency

If migration fails, see emergency procedures in `CRITICAL-MIGRATION-GUIDE.md`.

## History

- **2024-08-28**: Near-miss prevented - almost ran incorrect brand extraction migration
  - Actual dev schema has 29 columns vs expected 22
  - Corrected and documented proper migration