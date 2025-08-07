# Unused Tables Analysis

## Overview
Analysis of tables that exist in the database but are not actively used by the codebase.

## 1. Completely Unused Tables (0 rows in production)

### Safe to Delete:
1. **`bazaar-vid_component_error`** 
   - 0 rows in production
   - Only referenced in schema.ts, no actual usage found
   
2. **`bazaar-vid_patch`**
   - 0 rows in production
   - No code references found
   
3. **`bazaar-vid_scene_plan`**
   - 0 rows in production
   - No code references found
   
4. **`bazaar-vid_scene_specs`**
   - 0 rows in production
   - No code references found

## 2. Tables with Data but No Code Usage

### Potentially Legacy - Need Investigation:
1. **`bazaar-vid_project_memory`**
   - 621 rows in production
   - No code references found
   - May be legacy feature
   
2. **`bazaar-vid_metric`**
   - 389 rows in production
   - No code references found
   - Different from api_usage_metric
   
3. **`bazaar-vid_agent_message`**
   - 3 rows in production
   - No code references found

## 3. Duplicate Tables

### Must Remove:
1. **`api_usage_metric`** (without prefix)
   - This is a duplicate of `bazaar-vid_api_usage_metric`
   - Code uses the prefixed version
   - Safe to delete after migrating any data

## 4. Tables Missing Code References (Need Verification)

These are defined in schema.ts but no usage found in code:
1. `bazaar-vid_component_evaluation_metric`
2. `bazaar-vid_component_test_case`
3. `bazaar-vid_animation_design_brief`
4. `bazaar-vid_usage_limit`
5. `bazaar-vid_user_usage`
6. `bazaar-vid_verificationToken`
7. `bazaar-vid_image_analysis`
8. `bazaar-vid_credit_package`

## 5. Recommendations

### Immediate Actions:
1. **Delete duplicate table**: `api_usage_metric`
2. **Delete empty tables**: component_error, patch, scene_plan, scene_specs

### Investigate Before Deleting:
1. **project_memory** - Has 621 rows, check if needed
2. **metric** - Has 389 rows, verify if different from api metrics
3. **agent_message** - Only 3 rows, likely safe to remove

### Keep for Now:
- Tables defined in schema.ts even if unused (might be for future features)
- Any table with active foreign key constraints

## 6. Schema Cleanup Opportunities

### Dev-only Schemas:
- `auth` schema - Check if NextAuth needs it
- `neon_auth` schema - Appears to be Neon-specific
- `pgrst` schema - PostgREST related

### Production-only:
- `show_db_tree()` function - Utility function, can keep

## Summary Statistics
- Total tables: 31
- Actively used: ~15
- Completely empty: 4
- Potential legacy: 3
- Duplicate: 1
- Total candidates for deletion: 8