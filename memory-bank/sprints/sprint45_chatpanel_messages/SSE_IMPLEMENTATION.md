# SSE Implementation for Chat Messages

## Overview
Server-Sent Events (SSE) implementation to eliminate duplicate messages and provide real-time streaming updates.

## Implementation Steps

### 1. SSE API Route (`/api/generate-stream`)
```typescript
// Key features:
- Creates message in DB immediately with proper ID
- Streams updates to client in real-time
- No temporary IDs needed
- Single source of truth (database)
```

### 2. Client Hook (`use-sse-generation`)
```typescript
// Handles:
- EventSource connection management
- Message type routing (message/update/complete/error)
- Automatic cleanup on unmount
- Error handling
```

### 3. Update ChatPanelG
Replace the current `handleSubmit` with:

```typescript
// Import the hook
import { useSSEGeneration } from '~/hooks/use-sse-generation';

// In component
const { generate, cancel } = useSSEGeneration({
  projectId,
  onComplete: (messageId) => {
    setIsGenerating(false);
    scrollToBottom();
    if (onSceneGenerated) {
      onSceneGenerated(messageId);
    }
  },
  onError: (error) => {
    setIsGenerating(false);
    toast.error(error);
  }
});

// Replace handleSubmit
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!message.trim() || isGenerating) return;

  const trimmedMessage = message.trim();
  const imageUrls = uploadedImages
    .filter(img => img.status === 'uploaded' && img.url)
    .map(img => img.url!);

  // Add user message
  addUserMessage(projectId, trimmedMessage, imageUrls.length > 0 ? imageUrls : undefined);
  
  setMessage("");
  setUploadedImages([]);
  setIsGenerating(true);
  
  // Start SSE generation
  generate(trimmedMessage, imageUrls);
};

// Add cleanup on unmount
useEffect(() => {
  return () => {
    cancel();
  };
}, [cancel]);
```

## Benefits

1. **No Duplicates**: Message created once with DB ID
2. **Real-time Updates**: Users see progress as it happens
3. **Better UX**: Smooth, streaming experience
4. **Simpler State**: No temporary ID tracking needed
5. **Error Recovery**: Built-in connection handling

## Migration Path

1. **Phase 1**: Implement SSE alongside existing system
2. **Phase 2**: Update ChatPanelG to use SSE
3. **Phase 3**: Remove old mutation-based approach
4. **Phase 4**: Update videoState to remove temporary message logic

## Testing

1. Test message creation and updates
2. Verify no duplicates after refresh
3. Test connection interruption/recovery
4. Verify proper cleanup on component unmount

## Future Enhancements

1. **Typed Events**: Add zod schemas for SSE data
2. **Progress Indicators**: Stream completion percentage
3. **Retry Logic**: Automatic reconnection with exponential backoff
4. **Compression**: Gzip SSE stream for better performance