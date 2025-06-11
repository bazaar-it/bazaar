# Image Persistence Complete Fix

## Problem
Images disappear from chat on page refresh because:
1. ✅ Images ARE saved to database (already fixed in generation.ts)
2. ✅ Chat router returns imageUrls (fixed in chat.ts)
3. ❌ ChatPanelG doesn't load messages from database on initial load
4. ❌ VideoState chat history is only in-memory

## What We Fixed

### 1. Chat Router - Added imageUrls to query
```typescript
// In chat.ts - Now explicitly selects imageUrls
columns: {
  id: true,
  projectId: true,
  content: true,
  role: true,
  kind: true,
  imageUrls: true, // Added this
  createdAt: true,
},
```

### 2. VideoState - Added imageUrls to ChatMessage interface
```typescript
export interface ChatMessage {
  // ... existing fields
  imageUrls?: string[]; // Added to support image persistence
}
```

### 3. addUserMessage - Already accepts imageUrls
```typescript
addUserMessage: (projectId: string, content: string, imageUrls?: string[]) => {
  // Already includes imageUrls in the message
}
```

## What's Still Missing

ChatPanelG needs to:
1. Load messages from database on mount using `api.chat.getMessages`
2. Sync database messages to VideoState using `syncDbMessages`
3. This will restore images after page refresh

## The Architecture

```
Page Load:
1. ChatPanelG mounts
2. Queries database messages (including imageUrls)
3. Syncs to VideoState chat history
4. Images appear in chat

New Message:
1. User uploads image + types message
2. Saved to database WITH imageUrls
3. Added to VideoState WITH imageUrls
4. Images persist across refreshes
```

## Next Steps

Add this to ChatPanelG:
```typescript
// Load messages from database on mount
const { data: dbMessages } = api.chat.getMessages.useQuery({ 
  projectId 
});

// Sync to VideoState when loaded
useEffect(() => {
  if (dbMessages) {
    syncDbMessages(projectId, dbMessages);
  }
}, [dbMessages, projectId, syncDbMessages]);
```

This will complete the image persistence fix\!
EOF < /dev/null