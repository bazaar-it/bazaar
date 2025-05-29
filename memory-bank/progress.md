# Bazaar-Vid Progress Log

## 🚀 Current Status: Sprint 31 - Chat Panel Stability & State Management

### ✅ Recently Completed
- **CRITICAL Chat Panel Simplification** (Just Completed)
  - **PROBLEM**: Complex optimistic message filtering was causing message duplicates and stuck chat states
  - **ROOT CAUSE**: Over-engineered message deduplication logic that was removing valid messages and causing UI inconsistencies
  - **SOLUTION**: 
    - **Simplified allMessages logic**: Removed 200+ lines of complex filtering, now just shows DB messages + basic optimistic messages
    - **Removed aggressive deduplication**: No more content-based filtering that was removing user messages
    - **Simplified cleanup**: Basic optimistic message removal when messages appear in DB
    - **Fixed polling**: Simplified to just `refetchMessages()` every 3 seconds instead of complex conditional logic
  - **IMPACT**: Chat panel now shows messages reliably, no more duplicates, no more stuck states, new assistant messages appear properly

- **ChatPanelG.tsx Major Fixes** (Just Completed)
  - Fixed API parameter mismatch (`userPrompt` → `userMessage`)
  - Resolved message flickering with improved optimistic UI filtering
  - Enhanced TSX code persistence across page navigation
  - Direct video state updates for scene data
  - Better error handling and message state management

- **Critical Scene Targeting Bug Fix** (Just Completed) 
  - **HARDCODED SCENE ID**: Fixed LLM outputting literal `"scene-uuid-here"` instead of real scene IDs
  - **Enhanced Storyboard Context**: Now provides detailed scene information with real IDs to LLM
  - **Better Scene Selection**: Improved logic for detecting edit vs new scene operations
  - **Message Deduplication**: Added logic to prevent duplicate assistant messages
  - **Conservative Optimistic UI**: Much more careful about when to remove user/assistant messages

- **CRITICAL MESSAGE STABILITY FIX** (Just Completed)
  - **FIXED**: Aggressive message removal that was deleting user messages and "assistant thinking" indicators
  - **FIXED**: Users can now see their messages stay visible during generation
  - **FIXED**: "Assistant is working..." messages now stay visible until completion
  - **FIXED**: Much more conservative optimistic message filtering (30min vs 10min staleness)
  - **FIXED**: Removed aggressive content-based deduplication that was removing valid messages
  - **IMPROVED**: Only remove optimistic messages when there's a definitive newer DB match

- **Code Generation Compilation Fix** (Just Completed)
  - **FIXED**: Added critical styling requirements to prevent `fontWeight: 700` vs `fontWeight: "700"` errors
  - **ENHANCED**: LLM now knows to use string values for all CSS numeric properties
  - **IMPROVED**: Better error prevention in generated React components

- **CRITICAL External Library Import Fix** (Just Completed)
  - **PROBLEM**: LLM was generating code with `import { TextField } from '@mui/material'` and `import Typical from 'react-typical'`
  - **ROOT CAUSE**: Our system only allows `window.Remotion` destructuring, no external library imports
  - **SOLUTION**: 
    - **DirectCodeEditor**: Added explicit restrictions against external library imports
    - **CodeGenerator**: Enhanced system prompt to prevent external imports
    - **PreviewPanelG**: Added robust import stripping logic to clean problematic code
    - **Replacements**: TextField → input, Typical → plain text, all external imports stripped
  - **IMPACT**: Compilation errors like "Unexpected token, expected ';'" are now prevented

- **CRITICAL Scene Duration Fix** (Just Completed)
  - **PROBLEM**: When user says "make it last for 4 seconds", only animation timings were modified, not the actual scene duration
  - **ROOT CAUSE**: EditScene tool was always returning `existingDuration` instead of calculating new duration
  - **SYMPTOMS**: Scene duration in DB stayed 180 frames, RemotionPreview showed wrong `durationInFrames`
  - **SOLUTION**: Added duration detection regex patterns to parse user requests like:
    - "make it last for 4 seconds" → 120 frames (4 * 30fps)
    - "make it shorter" → 60% of original duration
    - "make it longer" → 150% of original duration
  - **IMPACT**: Duration changes now properly update both animation timings AND scene duration in database

- **CRITICAL Model Name & Delete Scene Fix** (Just Completed)
  - **PROBLEM 1**: Model name was "GPT-4.1 mini" (incorrect format) causing API failures
  - **PROBLEM 2**: Delete scene was stuck in "Assistant is working..." because actual deletion wasn't implemented
  - **ROOT CAUSE 1**: OpenAI API requires lowercase with hyphens: "gpt-4.1-mini" 
  - **ROOT CAUSE 2**: Orchestrator had no database deletion logic for deleteScene tool
  - **SOLUTION**: 
    - **Model Fix**: Changed all services to use correct "gpt-4.1-mini" format
    - **Temperature Fix**: Restored temperature settings that were accidentally commented out
    - **Delete Implementation**: Added complete database deletion logic in orchestrator's processToolResult
  - **SERVICES FIXED**: BrainOrchestrator, CodeGenerator, LayoutGenerator, SceneBuilder
  - **IMPACT**: Delete scene now properly removes scenes from database, GPT-4.1 mini API calls work correctly

### 🎯 Active Sprint 31 Goals

**Latest Multi-Turn Conversation Fix (2025-01-25)**: Fixed askSpecify tool to properly handle multi-turn conversations. Now when Brain LLM asks for clarification, it sends a chat message and the follow-up user response is correctly processed as an editScene/addScene/deleteScene action.

### **🚨 Critical Issues Fixed Today**

#### **Issue #1: askSpecify Multi-Turn Conversation Failure**
- **Problem**: askSpecify tool was not sending chat messages asking for clarification
- **Root Cause**: Orchestrator wasn't handling askSpecify results properly + no context for follow-up
- **Solution**: 
  - **Always send clarification messages**: askSpecify now sends chat message even on failure
  - **Context detection**: Brain LLM detects when user is responding to previous clarification
  - **No double-askSpecify**: Brain LLM won't use askSpecify again if user already responded to clarification

#### **Issue #2: CodeGenerator Wrapper Function Problem**
- **Problem**: Generated TSX still included wrapper functions (`function SingleSceneComposition`)
- **Root Cause**: Code cleaning logic wasn't catching all wrapper patterns
- **Solution**: 
  - Enhanced wrapper function detection and removal
  - Multiple function detection with scene function extraction
  - Proper export default format enforcement

#### **Issue #3: Code Generation Syntax Errors** 
- **Problem**: Generated TSX code contained markdown syntax (`\`\`\`javascript`) causing compilation failures
- **Root Cause**: CodeGenerator system prompt included markdown code fences in examples, which LLM copied
- **Solution**: 
  - Removed markdown code fences from system prompt
  - Added code cleaning logic to strip any remaining markdown
  - Enhanced validation for proper React/Remotion structure

### **Technical Details**

**Files Modified**:
- `src/lib/services/codeGenerator.service.ts` - Fixed markdown issue + logging
- `src/lib/services/layoutGenerator.service.ts` - Added comprehensive logging  
- `src/lib/services/sceneBuilder.service.ts` - Enhanced pipeline logging

**Code Generation Fixes**:
```typescript
// Before: LLM included markdown fences
const code = rawOutput.trim(); // Could include ```javascript

// After: Clean and validate output
let cleanCode = rawOutput.trim();
cleanCode = cleanCode.replace(/^```(?:javascript|tsx|ts|js)?\n?/i, '').replace(/\n?```$/i, '');
```

**Logging Enhancement**:
```typescript
console.log(`[CodeGenerator] 🎯 Starting code generation for: ${functionName}`);
console.log(`[CodeGenerator] 📝 User prompt: "${userPrompt.substring(0, 100)}..."`);
console.log(`[CodeGenerator] 🎨 Scene type: ${layoutJson.sceneType}`);
```

**Previous Major Achievement (2025-01-25)**: Implemented DirectCodeEditor service to replace the problematic two-step pipeline for editScene operations. Now performs surgical code edits instead of regenerating everything from scratch.

**Latest Update**: Successfully implemented comprehensive SEO optimizations including robots.txt, sitemap.xml, metadata enhancements, and performance improvements.

### Sprint 31 Step 1 Completed (Week 1)
- **Welcome Animation**: Created professional animated welcome scene with particles, gradients, and smooth transitions
- **Chat Welcome Message**: Added comprehensive system welcome message to database with rich markdown content
- **Step 1 - Guest User Mode Design (2025-05-29)**: Documented a comprehensive design for implementing a Limited Guest Mode allowing 5-7 prompts before login. This includes architecture for guest ID generation, database schema changes, dual-path authentication logic, data migration strategy for guest-to-user conversion, effort estimation (7-12 days), and recommendation to defer to post-MVP. Details in `/memory-bank/sprints/sprint31/STEP-1-GUEST-USER.md`.
- **Step 1 - Email Authentication (2025-05-29)**: Designed an email-based authentication system as an alternative to OAuth providers, enabling users without GitHub/Google accounts to register. Includes detailed implementation plans for registration, verification, login, and password reset flows using NextAuth.js, with an estimated effort of 7-12 days. Details in `/memory-bank/sprints/sprint31/STEP-1-EMAIL-LOGIN.md`.
- **Feedback Collection Feature (2025-05-29)**: Designed a non-intrusive feedback system with a floating thumbs-up button that opens a modal displaying upcoming features and a feedback form. Implementation includes UI components, database schema, tRPC endpoint, and email notifications via Resend API. Estimated effort is 3-4 days. Details in `/memory-bank/sprints/sprint31/FEATURE-FEEDBACK-BUTTON.md`.
- **Feedback Feature**: 
    - Initial design document created for the user feedback collection system (`/memory-bank/sprints/sprint31/FEATURE-FEEDBACK-BUTTON.md`).
    - Enhanced the feedback feature design to include auto-filled user info, a feature prioritization checklist, and backend management details. Updated `FEATURE-FEEDBACK-BUTTON.md`.
    - **Backend Implemented (2025-05-29)**: tRPC endpoint created, database schema for `feedback` table defined. User confirmed database is migrated/pushed. Ready for E2E testing.

### Current Focus: Phase 1 Preparation
**Next**: Enhanced prompting and intent analysis system implementation

## Recent Progress

- **Video/Message Initialization Debugging (Current Sprint)**: Investigating issue where welcome video and message fail to appear after clearing browser cache and creating a new project. Added extensive console logging across `GenerateWorkspaceRoot.tsx`, `videoState.ts` (for `setProject` and `syncDbMessages`), and `ChatPanelG.tsx` to trace data flow. Awaiting USER to reproduce the bug and provide console logs for analysis.

- **Chat Welcome Message Fix (Sprint 31)**: Resolved inconsistent display of the welcome message in the chat panel. Implemented robust synchronization between database-fetched messages and the Zustand `videoState`