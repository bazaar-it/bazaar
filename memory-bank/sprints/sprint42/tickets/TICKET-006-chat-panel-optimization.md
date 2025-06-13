# TICKET-006: Optimize ChatPanelG for Speed

## Overview
Make the chat interface lightning fast by fixing the current implementation, not rewriting it. Focus on real speed improvements.

## Current State

### Current ChatPanelG Structure
- Uses `api.generation.generateScene.mutate()` for scene generation
- Has welcome scene logic
- Updates video state after scene creation
- Shows messages in chat

### Problem Areas
1. **UI waits for full server response** before showing anything
2. **No loading feedback** while AI is working
3. **Image uploads not optimized**
4. **No retry on failures**

## Implementation Plan

### Step 1: Add Loading States to Existing ChatPanelG

Update `/src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx`:

```typescript
// Add these state variables to existing component
const [isGenerating, setIsGenerating] = useState(false);
const [currentOperation, setCurrentOperation] = useState<string>('');

// Update the existing handleSendMessage function
const handleSendMessage = async (message: string) => {
  if (!message.trim() && attachedImages.length === 0) return;

  const newUserMessage = {
    id: Date.now().toString(),
    type: "user" as const,
    content: message,
    timestamp: new Date().toISOString(),
    images: attachedImages,
  };

  setMessages((prev) => [...prev, newUserMessage]);
  setInputMessage("");
  setAttachedImages([]);
  
  // NEW: Add immediate loading feedback
  setIsGenerating(true);
  setCurrentOperation('Analyzing your request...');

  try {
    // NEW: Add loading message
    const loadingMessage = {
      id: `loading-${Date.now()}`,
      type: "assistant" as const,
      content: "🤔 Thinking...",
      timestamp: new Date().toISOString(),
      isLoading: true, // NEW: Flag for loading state
    };
    setMessages((prev) => [...prev, loadingMessage]);

    // Upload images if any (with better error handling)
    let uploadedImageUrls: string[] = [];
    if (attachedImages.length > 0) {
      setCurrentOperation('Uploading images...');
      try {
        uploadedImageUrls = await Promise.all(
          attachedImages.map(async (img) => {
            const formData = new FormData();
            formData.append("file", img.file);
            const response = await fetch("/api/upload", {
              method: "POST",
              body: formData,
            });
            if (!response.ok) throw new Error('Upload failed');
            const data = await response.json();
            return data.url;
          })
        );
      } catch (error) {
        console.error("Image upload failed:", error);
        toast.error("Failed to upload images");
        // Continue without images rather than failing completely
      }
    }

    setCurrentOperation('Generating scene...');

    // Call the API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const result = await generateSceneMutation.mutateAsync(
      {
        projectId,
        userMessage: message,
        userContext: uploadedImageUrls.length > 0 
          ? { imageUrls: uploadedImageUrls }
          : undefined,
      },
      {
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    // Remove loading message and add real response
    setMessages((prev) => prev.filter(m => !m.isLoading));

    if (result.success && result.scene) {
      // Process the scene (existing logic)
      const sceneData = result.scene.scene || result.scene;
      
      // Update video state (existing logic)
      updateVideoState(
        { sceneId: sceneData.id },
        {
          replaceWelcome: videoState.scenes.length === 1 && videoState.scenes[0]?.type === "welcome",
          updateType: "add",
        }
      );

      // Add success message
      if (result.chatResponse) {
        const assistantMessage = {
          id: Date.now().toString(),
          type: "assistant" as const,
          content: result.chatResponse,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }

      toast.success("Scene created successfully!");
    }
  } catch (error: any) {
    console.error("Scene generation error:", error);
    
    // Remove loading message
    setMessages((prev) => prev.filter(m => !m.isLoading));
    
    // Add error message
    const errorMessage = {
      id: Date.now().toString(),
      type: "assistant" as const,
      content: `Sorry, I couldn't generate the scene: ${error.message || 'Unknown error'}. Please try again.`,
      timestamp: new Date().toISOString(),
      isError: true,
    };
    setMessages((prev) => [...prev, errorMessage]);

    // Show retry button
    toast.error("Failed to generate scene", {
      action: {
        label: "Retry",
        onClick: () => handleSendMessage(message),
      },
    });
  } finally {
    setIsGenerating(false);
    setCurrentOperation('');
  }
};
```

### Step 2: Optimize Image Handling

Add image compression before upload:

```typescript
// Add this utility function
const compressImage = async (file: File): Promise<File> => {
  // Only compress if larger than 1MB
  if (file.size < 1024 * 1024) return file;
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // Max 1920px width/height
        let { width, height } = img;
        const maxSize = 1920;
        
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            resolve(new File([blob!], file.name, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.85 // 85% quality
        );
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
};

// Update image upload logic
const uploadedImageUrls = await Promise.all(
  attachedImages.map(async (img) => {
    const compressed = await compressImage(img.file);
    const formData = new FormData();
    formData.append("file", compressed);
    // ... rest of upload logic
  })
);
```

### Step 3: Add Streaming Response (if AI supports it)

```typescript
// If the API supports streaming, update to show partial responses
const streamResponse = async () => {
  const response = await fetch('/api/generation/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      prompt: message,
      imageUrls: uploadedImageUrls,
    }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  let assistantMessage = {
    id: Date.now().toString(),
    type: "assistant" as const,
    content: "",
    timestamp: new Date().toISOString(),
  };
  
  setMessages(prev => [...prev.filter(m => !m.isLoading), assistantMessage]);

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    assistantMessage.content += chunk;
    
    // Update the message in place
    setMessages(prev => prev.map(m => 
      m.id === assistantMessage.id ? { ...m, content: assistantMessage.content } : m
    ));
  }
};
```

### Step 4: Update Message Display

Update the message rendering to show loading states:

```typescript
{messages.map((message) => (
  <div
    key={message.id}
    className={cn(
      "flex gap-3 p-4 rounded-lg",
      message.type === "user" 
        ? "bg-blue-50 ml-8" 
        : "bg-gray-50 mr-8",
      message.isError && "bg-red-50",
      message.isLoading && "animate-pulse"
    )}
  >
    <div className="flex-shrink-0">
      {message.type === "user" ? (
        <User className="w-6 h-6" />
      ) : (
        <Bot className={cn(
          "w-6 h-6",
          message.isLoading && "animate-spin"
        )} />
      )}
    </div>
    
    <div className="flex-1">
      <p className="text-sm font-medium mb-1">
        {message.type === "user" ? "You" : "AI Assistant"}
      </p>
      <p className={cn(
        "text-gray-700",
        message.isError && "text-red-700"
      )}>
        {message.content}
      </p>
      
      {/* Show images if any */}
      {message.images && message.images.length > 0 && (
        <div className="flex gap-2 mt-2">
          {message.images.map((img, idx) => (
            <img
              key={idx}
              src={img.url}
              alt={`Attached ${idx + 1}`}
              className="w-20 h-20 object-cover rounded"
            />
          ))}
        </div>
      )}
    </div>
  </div>
))}

{/* Show current operation */}
{isGenerating && currentOperation && (
  <div className="text-center text-sm text-gray-500 py-2">
    {currentOperation}
  </div>
)}
```

### Step 5: Add Simple Retry Logic

```typescript
// Add retry utility
const retryWithBackoff = async (
  fn: () => Promise<any>,
  retries = 3,
  delay = 1000
): Promise<any> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
};

// Use in API call
const result = await retryWithBackoff(
  () => generateSceneMutation.mutateAsync({
    projectId,
    userMessage: message,
    userContext: uploadedImageUrls.length > 0 
      ? { imageUrls: uploadedImageUrls }
      : undefined,
  }),
  3, // max retries
  1000 // initial delay
);
```

## After Implementation

### User Experience Improvements

1. **Immediate Feedback**
   - "Thinking..." message appears instantly
   - Current operation shown ("Uploading images...", "Generating scene...")
   - Loading animation on AI avatar

2. **Faster Image Handling**
   - Images compress automatically before upload
   - Parallel uploads for multiple images
   - Continues even if one image fails

3. **Better Error Handling**
   - Automatic retry with backoff
   - Clear error messages
   - Manual retry option

4. **No Breaking Changes**
   - Same component structure
   - Same API calls
   - Same video state management
   - Just faster and more responsive

## Testing Plan

### 1. Loading State Tests
```typescript
it('shows loading message immediately', async () => {
  renderChatPanel();
  
  await userEvent.type(screen.getByPlaceholderText(/type a message/i), 'Create intro');
  await userEvent.click(screen.getByRole('button', { name: /send/i }));
  
  // Should show loading message immediately
  expect(screen.getByText('🤔 Thinking...')).toBeInTheDocument();
});
```

### 2. Image Compression Tests
```typescript
it('compresses large images', async () => {
  const largeFile = createMockFile('large.jpg', 5 * 1024 * 1024); // 5MB
  const compressed = await compressImage(largeFile);
  
  expect(compressed.size).toBeLessThan(2 * 1024 * 1024); // < 2MB
});
```

### 3. Retry Tests
```typescript
it('retries on failure', async () => {
  let attempts = 0;
  mockApi.onPost().reply(() => {
    attempts++;
    if (attempts < 3) return [500, { error: 'Server error' }];
    return [200, { success: true }];
  });
  
  await sendMessage('Create scene');
  
  expect(attempts).toBe(3);
  expect(screen.getByText(/successfully/i)).toBeInTheDocument();
});
```

## Success Criteria

- [ ] Loading feedback appears within 50ms
- [ ] Images compress to <2MB automatically
- [ ] Failed requests retry 3 times
- [ ] Current operation is always visible
- [ ] No breaking changes to existing functionality

## Dependencies

- None - uses existing dependencies

## Time Estimate

- Loading states: 1 hour
- Image optimization: 1 hour
- Retry logic: 1 hour
- Testing: 1 hour
- **Total: 4 hours**