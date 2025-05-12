# Scene Planning Fix - Adding refreshToken to Props Updates

## Problem Identified

We've been encountering an issue where scenes planned by the LLM through the `planVideoScenes` tool call are not appearing in the video preview panel, despite being stored correctly in the database. The logs showed:

```
[DynamicVideo] Scenes after render: – Array (0) 
Array (0)
[DynamicVideo] Current refreshToken: – "token-1747057010828"
```

This indicates that the DynamicVideo component is receiving scenes data but they're not rendering properly.

## Root Cause

After analyzing the codebase, we discovered that when scene patches are applied, the `refreshToken` property that triggers UI updates was not being generated or set correctly in the props data. The video states and Remotion compositions rely on this token to know when to refresh and show new content.

## Solution Implemented

We've updated the `chat.ts` router's scene planning logic to:

1. Generate a new `refreshToken` with the current timestamp when scene patches are applied
2. Add this token to the props before saving them to the database
3. Add logging to track when refreshes occur

```typescript
// CRITICAL FIX: Generate a new refreshToken and add it to the props
const refreshToken = `token-${Date.now()}`;
// Use type assertion to add refreshToken
(validated.data as any).refreshToken = refreshToken;

// Save changes with the refreshToken
await ctx.db.update(projects)
    .set({ 
        props: validated.data, 
        updatedAt: new Date() 
    })
    .where(eq(projects.id, projectId));

// Add debug logging
console.log(`[chat.ts] Applied scene plan patches with refreshToken: ${refreshToken}`);
```

## Why This Works

1. The `refreshToken` is propagated from the database to the state store when data is fetched
2. The store passes this token to the `PreviewPanel` component
3. `PreviewPanel` passes it to the `Player` component with a `key` that forces remounts
4. The `DynamicVideo` composition receives the token and passes it to each scene
5. Custom components receive the token and remount when it changes

## Testing

After implementing this fix, when the LLM creates a new scene plan:
1. The patches are correctly applied to the project props
2. A unique refreshToken is generated and added to the props
3. The PreviewPanel sees the new token and updates its display
4. The scenes render as expected

This fix ensures that both regular scenes (text, background, etc.) and custom component scenes will update correctly in the UI when they're added or modified through the scene planning workflow. 