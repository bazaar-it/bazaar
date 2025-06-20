# ChatPanelG Modularization Plan (Updated Analysis)

## Current State: 1353 Lines of Code

### Critical Findings from Deep Analysis

#### 1. Dead Code to Remove (~150 lines)
- **Optimistic messages** - DECLARED BUT NEVER USED:
  - `OptimisticMessage` type (lines 42-50)
  - State declaration (line 92): `useState<OptimisticMessage[]>([])`
  - Clear on project change (line 806)
  - **Finding**: Component uses VideoState exclusively for messages
- **Unused states**:
  - `currentPrompt` (line 91) - never set or read
  - `progressStage` (line 98) - never set or read
- **Unused types**:
  - `DbMessage` interface (lines 52-62) - not used anywhere
- **Removed functions**:
  - `formatTimestamp` - no longer needed after ChatMessage extraction

#### 2. Message Flow (Verified Working Correctly)
1. **User submits** → Added to VideoState (line 257)
2. **Assistant loading** → Simple "Processing your request..." (lines 260-266)
3. **API call** → `generateSceneMutation` to Brain (line 305)
4. **Response handling** → Updates VideoState (lines 336-354)
   - Uses `chatResponse` from brain (orchestratorNEW.ts line 62)
   - Handles clarifications correctly (lines 339-344)
   - Adds timing info (line 350)

#### 3. Major Components to Extract

##### AutoFixErrorBanner (~250 lines)
- **Lines**: 853-1043 (handleAutoFix function)
- **Lines**: 1163-1219 (error banner UI)
- **State**: `sceneErrors` Map (line 851)
- **Event listeners**: preview-scene-error, trigger-autofix, scene-deleted

##### ImageUpload (~200 lines)
- **Lines**: 101-104 (state declarations)
- **Lines**: 675-682 (handleDeleteImage)
- **Lines**: 684-719 (compressImage)
- **Lines**: 721-764 (handleImageUpload)
- **Lines**: 766-801 (handlers)
- **Lines**: 1221-1255 (UI rendering)

##### ChatWelcome (~80 lines)
- **Lines**: 1049-1122 (welcome message and examples)
- Self-contained UI component

##### VoiceInput (~100 lines)
- **Lines**: 114-121 (voice hook usage)
- **Lines**: 660-667 (handleMicrophoneClick)
- **Lines**: 825-833 (voice transcription effect)
- **Lines**: 834-840 (voice error effect)
- **Lines**: 1300-1328 (voice button UI)

##### ChatInput (~90 lines)
- **Lines**: 1259-1349 (entire input form)
- Includes textarea, buttons, file input

##### Scene Update Logic (~200 lines)
- **Lines**: 366-573 (complex scene update handling)
- Should be moved to a service or custom hook

## Proposed Module Structure (Revised)

### Phase 1: Remove Dead Code (Immediate)
```typescript
// To delete:
- OptimisticMessage type (lines 42-50)
- optimisticMessages state (line 92)
- setOptimisticMessages([]); (line 806)
- currentPrompt state (line 91)
- progressStage state (line 98)
- DbMessage interface (lines 52-62)
- messagesEndRef (line 93) - duplicate of scrolling logic
- inputRef (line 96) - never used
```

### Phase 2: Extract Components

#### `/components/chat/AutoFixErrorBanner.tsx`
```typescript
interface AutoFixErrorBannerProps {
  scenes: Scene[];
  sceneErrors: Map<string, ErrorDetails>;
  onAutoFix: (sceneId: string) => void;
  isGenerating: boolean;
  projectId: string;
}
```

#### `/components/chat/ImageUpload.tsx`
```typescript
interface ImageUploadProps {
  uploadedImages: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  onImageUpload: (files: File[]) => void;
  onDeleteImage: (id: string) => void;
  projectId: string;
  disabled?: boolean;
}
```

#### `/components/chat/ChatWelcome.tsx`
```typescript
interface ChatWelcomeProps {
  onExampleClick: (message: string) => void;
}
```

#### `/components/chat/VoiceInput.tsx`
```typescript
interface VoiceInputProps {
  onTranscription: (text: string) => void;
  isGenerating: boolean;
  showError: boolean;
  onErrorDismiss: () => void;
}
```

#### `/components/chat/ChatInput.tsx`
```typescript
interface ChatInputProps {
  message: string;
  onMessageChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isGenerating: boolean;
  selectedSceneId?: string | null;
  // Child components
  voiceInput?: React.ReactNode;
  imageUpload?: React.ReactNode;
}
```

### Phase 3: Extract Hooks

#### `/hooks/use-scene-updates.ts`
- Extract lines 366-573
- Handle all scene update logic
- Return simplified interface for components

#### `/hooks/use-auto-fix.ts`
- Extract auto-fix logic
- Handle error event listeners
- Return `{ sceneErrors, handleAutoFix }`

## Implementation Priority

1. **Remove dead code** (30 min)
   - ~150 lines removed immediately
   - No functionality change

2. **Extract AutoFixErrorBanner** (1 hour)
   - Self-contained feature
   - ~250 lines extracted

3. **Extract ImageUpload** (1 hour)
   - Clear boundaries
   - ~200 lines extracted

4. **Extract ChatWelcome** (30 min)
   - Simple extraction
   - ~80 lines extracted

5. **Extract scene update logic** (2 hours)
   - Complex but high value
   - ~200 lines moved to hook/service

## Expected Result

### Before: 1353 lines
### After: ~280 lines

ChatPanelG becomes a clean orchestrator:
```typescript
export function ChatPanelG({ projectId, selectedSceneId }: Props) {
  // Core state from VideoState
  const messages = getProjectChatHistory(projectId);
  
  // Extracted hooks
  const { handleSubmit, isGenerating } = useChat(projectId);
  const { sceneErrors, handleAutoFix } = useAutoFix(projectId);
  const scrollRef = useChatScroll(messages);
  
  return (
    <div className="flex flex-col h-full">
      <AutoFixErrorBanner
        scenes={scenes}
        sceneErrors={sceneErrors}
        onAutoFix={handleAutoFix}
        isGenerating={isGenerating}
        projectId={projectId}
      />
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <ChatWelcome onExampleClick={setMessage} />
        ) : (
          messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))
        )}
      </div>
      
      <ChatInput
        message={message}
        onMessageChange={setMessage}
        onSubmit={handleSubmit}
        isGenerating={isGenerating}
        selectedSceneId={selectedSceneId}
      />
    </div>
  );
}
```

## Benefits of This Approach

1. **79% reduction in file size** (1353 → ~280 lines)
2. **Single responsibility** per component
3. **Testable** isolated components
4. **Maintainable** clear structure
5. **No breaking changes** to parent components