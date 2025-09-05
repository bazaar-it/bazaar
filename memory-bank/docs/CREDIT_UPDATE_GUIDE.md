# Credit System Update Guide - 20 to 100 Credits

## Files to Update for New User Signup Bonus

### 1. `/src/server/auth/config.ts` (Line 121-122)
```typescript
// OLD:
purchasedCredits: 20, // 20 signup bonus
lifetimeCredits: 20,

// NEW:
purchasedCredits: 100, // 100 signup bonus - increased from 20
lifetimeCredits: 100,
```

### 2. `/src/app/api/webhooks/stripe/route.ts` (Line 70-71)
When creating credits for users who don't have them yet:
```typescript
// OLD:
purchasedCredits: 20, // Initial 20 prompts
lifetimeCredits: 20,

// NEW:
purchasedCredits: 100, // Initial 100 prompts - increased from 20
lifetimeCredits: 100,
```

### 3. `/src/scripts/update-credit-system.ts` (Lines 43-44)
If you use this migration script:
```typescript
// OLD:
purchasedCredits: 20, // Give 20 initial credits
lifetimeCredits: 20,

// NEW:
purchasedCredits: 100, // Give 100 initial credits - increased from 20
lifetimeCredits: 100,
```

## Testing After Changes

1. Create a new user account
2. Check they receive 100 credits (not 20)
3. Verify existing users have +80 credits added

## Rollback (If Needed)

```sql
-- To rollback (subtract 80 credits)
UPDATE "bazaar-vid_user_credits"
SET 
  purchased_credits = GREATEST(0, purchased_credits - 80),
  lifetime_credits = GREATEST(0, lifetime_credits - 80);
```