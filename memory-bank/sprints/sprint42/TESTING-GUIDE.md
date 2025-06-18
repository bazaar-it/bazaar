# Sprint 42 - Testing Guide for New Architecture

## What's Ready to Test

The new unified architecture (TICKETS 001-005) is now ready for basic testing. The server is running at http://localhost:3001

## Key Console Logs to Look For

When you create a scene, you should see these console logs in order, proving the NEW system is running:

### 1. **NEW GENERATION ROUTER**
```
🚀 [NEW GENERATION ROUTER] ====== SCENE GENERATION STARTED ======
📋 [NEW GENERATION ROUTER] Input received: { ... }
🔄 [NEW GENERATION ROUTER] Compatibility layer applied: { ... }
🔐 [NEW GENERATION ROUTER] Step 1: Verifying project ownership...
✅ [NEW GENERATION ROUTER] Project verified: [project name]
```

### 2. **NEW ORCHESTRATOR (Brain)**
```
🧠 [NEW ORCHESTRATOR] === PROCESSING USER INPUT ===
🧠 [NEW ORCHESTRATOR] Input: { prompt, projectId, hasImages, sceneCount }
🧠 [NEW ORCHESTRATOR] Step 1: Building context...
🧠 [NEW ORCHESTRATOR] Context built successfully
🧠 [NEW ORCHESTRATOR] Step 2: Analyzing intent...
🧠 [NEW ORCHESTRATOR] Tool selected: { tool: 'addScene', reasoning: '...' }
🧠 [NEW ORCHESTRATOR] Decision complete! Returning to router...
🧠 [NEW ORCHESTRATOR] === ORCHESTRATION COMPLETE ===
```

### 3. **NEW CONTEXT BUILDER**
```
📚 [NEW CONTEXT BUILDER] === BUILDING CONTEXT ===
📚 [NEW CONTEXT BUILDER] Project: [project-id]
📚 [NEW CONTEXT BUILDER] Has images: [true/false]
```

### 4. **NEW INTENT ANALYZER**
```
🎯 [NEW INTENT ANALYZER] === ANALYZING INTENT ===
🎯 [NEW INTENT ANALYZER] User prompt: [first 50 chars]...
🎯 [NEW INTENT ANALYZER] Brain responded, parsing decision...
🎯 [NEW INTENT ANALYZER] Decision: { toolName: 'addScene', success: true, reasoning: '...' }
```

### 5. **PURE FUNCTION TOOLS**
```
🔨 [ADD TOOL - PURE FUNCTION] === EXECUTING ===
🔨 [ADD TOOL] Input: { prompt: '...', hasImages: false, sceneNumber: 1 }
🔨 [ADD TOOL] NOTE: This is a PURE FUNCTION - no database access!
🔨 [ADD TOOL] Using text-based generation
```

### 6. **DATABASE OPERATIONS (Router Only)**
```
💾 [NEW GENERATION ROUTER] Step 8: Saving to database (Router handles DB)...
✅ [NEW GENERATION ROUTER] Scene saved to DB in [X]ms: { sceneId: '...', sceneName: '...' }
```

### 7. **ASYNC IMAGE ANALYSIS**
If you upload images:
```
🖼️ [NEW GENERATION ROUTER] Starting async image analysis for [N] images
[ProjectMemory] Queued async image analysis: { traceId: '...', imageCount: N }
```

### 8. **SUCCESS**
```
🎉 [NEW GENERATION ROUTER] SUCCESS! Total time: [X]ms
📊 [NEW GENERATION ROUTER] Performance breakdown: { brain: Xms, tool: Xms, database: Xms, total: Xms }
```

## How to Test

### 1. Basic Text Scene Creation
```
"Create a title scene that says Welcome to My Video"
```

Expected: Should see all console logs above, scene should be created with `tsxCode` field.

### 2. Image-Based Scene Creation
1. Upload an image
2. Type: "Create a scene based on this image"

Expected: 
- Should see "Using image-based generation" in tool logs
- Should see async image analysis logs
- Tools receive images directly (multimodal)

### 3. Multiple Images Reference
1. Upload 2-3 images in different messages
2. Type: "Make it like the first image"

Expected:
- Context builder tracks image positions
- Brain never chooses image analysis tool
- Images passed directly to tools

## What's NOT Working Yet

1. **Edit operations** - ChatPanelG sends to wrong endpoint
2. **Delete operations** - Not implemented in ChatPanelG
3. **Some UI features** - Need TICKET-006 implementation

## Key Architecture Proof Points

1. **Router handles ALL database operations** - Tools never access DB
2. **Tools are pure functions** - Only generate content
3. **Using tsxCode field** - NOT "code" or "existingCode"
4. **Brain never analyzes images** - Tools are multimodal
5. **Async image analysis** - Only for context, not tool selection

## TypeScript Errors

There are some TypeScript errors in ChatPanelG due to API mismatch. These don't prevent testing but should be fixed in TICKET-006.

## Next Steps

After confirming the console logs show the new system is working:
1. Implement TICKET-006 to fix ChatPanelG
2. Implement TICKET-007 for real-time updates
3. Implement TICKET-008 for edit with image support