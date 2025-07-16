# Rate Limit Purchase Modal Fix

## Issue
When users exceeded their daily prompt limit (20 free prompts), they could still send messages but:
- The generation would fail silently
- No purchase modal would appear
- Users were confused about why nothing happened

## Root Cause
The rate limit error handling had multiple issues:

1. **Server Response Format**: When rate limited, the server returned a response with `success: false` and an error object, not a thrown exception
2. **Error Code Mismatch**: The server wrapped the TRPCError and changed the code from 'RATE_LIMITED' to 'AI_ERROR'
3. **Response vs Exception**: The client code was checking for rate limit errors in the catch block, but the mutation was returning successfully with an error response

## Solution

### 1. Server Side (scene-operations.ts)
Converted the rate limit check to throw a proper TRPCError:
```typescript
throw new TRPCError({
  code: 'PRECONDITION_FAILED',
  message: usageCheck.message || "Daily prompt limit reached",
  cause: {
    code: 'RATE_LIMITED',
    used: usageCheck.used,
    limit: usageCheck.limit
  }
});
```

### 2. Client Side (ChatPanelG.tsx)
Added dual error checking:

**In the main try block** - Check response for error status:
```typescript
if (responseData?.meta?.success === false || responseData?.error) {
  const errorMessage = responseData?.error?.message || '';
  
  if (errorMessage.includes('Daily limit reached') || 
      errorMessage.includes('Buy more prompts') ||
      errorMessage.includes('prompt limit') ||
      responseData?.error?.code === 'RATE_LIMITED') {
    setIsPurchaseModalOpen(true);
    toast.error('You\'ve reached your daily prompt limit. Please purchase more prompts to continue.');
    return;
  }
}
```

**In the catch block** - Handle thrown errors:
```typescript
const errorMessage = error?.message || '';

const isRateLimitError = 
  errorMessage.includes('Daily limit reached') ||
  errorMessage.includes('Buy more prompts') ||
  errorMessage.includes('prompt limit') ||
  error?.data?.cause?.code === 'RATE_LIMITED';

if (isRateLimitError) {
  setIsPurchaseModalOpen(true);
  toast.error('You\'ve reached your daily prompt limit. Please purchase more prompts to continue.');
}
```

## Testing
1. Set user to have used all 20 daily prompts
2. Try to send a message
3. Purchase modal now appears automatically
4. Toast message confirms the rate limit was reached

## Result
✅ Purchase modal now opens automatically when users hit their prompt limit
✅ Clear feedback to users about why generation failed
✅ Seamless flow to purchase more prompts