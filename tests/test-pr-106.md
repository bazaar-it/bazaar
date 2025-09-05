# PR #106 Test Plan

## 1. Performance Test - getFullProject Query
Test that the new consolidated query actually improves performance.

### Manual Test Steps:
```bash
# 1. Checkout PR branch
git checkout dev

# 2. Start dev server
npm run dev

# 3. Open browser DevTools Network tab
# 4. Navigate to any project workspace
# 5. Check that only ONE query fires: getFullProject
# 6. Verify it returns: project, scenes, messages
# 7. Check timing - should be <200ms
```

### Expected Results:
- ✅ Single API call instead of 3-4
- ✅ All data loads correctly
- ✅ No missing scenes or messages
- ✅ Performance <200ms for typical project

## 2. Edge Case Test - Missing/Slow Data
Test WorkspaceContentAreaG handles edge cases properly.

### Test Scenarios:
```typescript
// A. Empty project (no scenes)
// - Create new project, don't add scenes
// - Should not crash, show empty state

// B. Project with only messages (no scenes yet)
// - Use chat but don't generate scenes
// - Messages should appear correctly

// C. Slow network simulation
// - Chrome DevTools → Network → Slow 3G
// - UI should show loading states, not break
```

## 3. Promo Code Functionality Test

### Admin Side:
```bash
# 1. Navigate to /admin/promo-codes
# 2. Create new promo code:
   - Code: TESTPR106
   - Discount: 50%
   - Max uses: 5
   - Expiry: 30 days

# 3. Verify it appears in list
# 4. Check database:
```

```sql
-- Run in dev database
SELECT * FROM "bazaar-vid_promo_codes" 
WHERE code = 'TESTPR106';
```

### User Side:
```bash
# 1. Open purchase modal
# 2. Enter code TESTPR106
# 3. Verify:
   - Discount applies correctly
   - Price updates in UI
   - Usage tracked in database
```

```sql
-- Check usage tracking
SELECT * FROM "bazaar-vid_promo_code_usage"
WHERE promo_code_id = (
  SELECT id FROM "bazaar-vid_promo_codes" 
  WHERE code = 'TESTPR106'
);
```

## 4. Paywall Analytics Test

### Trigger Events:
```bash
# 1. As free user, trigger paywall by:
   - Trying to export video
   - Accessing premium feature
   
# 2. Check events are recorded:
```

```sql
-- Check paywall events
SELECT * FROM "bazaar-vid_paywall_events"
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- Check analytics aggregation
SELECT * FROM "bazaar-vid_paywall_analytics"
WHERE date = CURRENT_DATE;
```

## 5. Load Test - Concurrent Users

### Simulate Multiple Users:
```bash
# Open 5+ browser tabs/windows
# Each in different project
# All perform actions simultaneously:
  - Load workspace
  - Send chat messages
  - Generate scenes

# Monitor:
  - No race conditions
  - All data loads correctly
  - No duplicate messages
  - Performance stays <500ms
```

## 6. Rollback Test
Ensure we can safely rollback if issues found.

```bash
# 1. Note current commit
git rev-parse HEAD

# 2. If issues found, rollback:
git checkout main
git pull origin main

# 3. Verify old code still works
# 4. No database changes needed (additive only)
```

## Quick Smoke Test Checklist

Before merging, quickly verify:

- [ ] `/projects/[id]/generate` loads without errors
- [ ] Chat messages appear correctly
- [ ] Scene generation still works
- [ ] Preview panel updates properly
- [ ] No console errors in browser
- [ ] Network tab shows consolidated query
- [ ] Admin panel accessible at `/admin`
- [ ] Promo codes page loads at `/admin/promo-codes`

## Database Verification

```sql
-- Final check: All tables exist and have correct structure
SELECT COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'bazaar-vid_promo_codes',
  'bazaar-vid_promo_code_usage',
  'bazaar-vid_paywall_events',
  'bazaar-vid_paywall_analytics'
);
-- Should return: 4
```

## Performance Baseline

Record before/after metrics:

### Before PR (main branch):
- Project load time: _____ms
- Number of API calls: _____
- Total data transfer: _____KB

### After PR (dev branch):
- Project load time: _____ms  (target: -40%)
- Number of API calls: _____ (target: 1)
- Total data transfer: _____KB (target: -20%)

## Sign-off Criteria

✅ PR can be merged when:
1. All smoke tests pass
2. Performance improved (or at least not degraded)
3. No console errors
4. Promo codes create/redeem successfully
5. No data loss or corruption

⚠️ Block merge if:
1. Project workspace fails to load
2. Performance degraded >20%
3. Database errors occur
4. Chat/scene generation broken