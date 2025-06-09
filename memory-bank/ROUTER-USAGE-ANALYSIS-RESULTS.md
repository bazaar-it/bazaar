# tRPC Router Usage Analysis Results

**Date**: January 9, 2025  
**Analysis**: Comprehensive usage patterns across entire codebase  
**Method**: Searched for `api.routerName` patterns and direct imports  

## 🎯 Executive Summary

Out of **17 total routers**, **12 are actively used** and **5 can be safely removed**.

**Safe to Remove**: 5 routers (~30% reduction)  
**Must Keep**: 12 routers (actively used in production)

---

## ❌ UNUSED ROUTERS (Safe to Delete)

### 1. **animation.ts** 
- **Usage**: ❌ No `api.animation` calls found
- **Status**: Only referenced in deleted services (animationDesigner.service)
- **Safety**: SAFE TO DELETE - no active usage

### 2. **chatStream.ts**
- **Usage**: ❌ No `api.chatStream` calls found  
- **Status**: Streaming functionality replaced by generation router
- **Safety**: SAFE TO DELETE - superseded by newer implementation

### 3. **customComponentFix.ts**
- **Usage**: ❌ No `api.customComponentFix` calls found
- **Status**: Fix functionality never implemented/used
- **Safety**: SAFE TO DELETE - no production usage

### 4. **timeline.ts**
- **Usage**: ❌ No `api.timeline` calls found
- **Status**: Timeline types exist but router unused
- **Safety**: SAFE TO DELETE - types can remain, router removed

### 5. **video.ts**
- **Usage**: ❌ No `api.video` calls found
- **Status**: Video state management handled by stores/videoState
- **Safety**: SAFE TO DELETE - functionality handled elsewhere

---

## ✅ ACTIVELY USED ROUTERS (Must Keep)

### Core Generation System
1. **generation.ts** ⭐ CRITICAL
   - `generateScene` (ChatPanelG, StoryboardPanelG)
   - `getProjectScenes` (multiple panels)
   - `addTemplate` (TemplatesPanelG)
   - `addScene` (CodePanelG)

2. **project.ts** ⭐ CRITICAL
   - `rename`, `list`, `create`, `delete` (project management)
   - Used across workspace panels

3. **scenes.ts** ⭐ CRITICAL
   - `updateSceneCode` (CodePanelG)
   - Scene management functionality

### User Interface
4. **chat.ts** ⭐ ACTIVE
   - `getMessages` (WorkspaceContentAreaG)
   - `sendMessage` (ChatInterface)
   - `regenerateScene` (Timeline)

5. **render.ts** ⭐ ACTIVE
   - `start` (GenerateWorkspaceRoot)
   - Video rendering functionality

6. **voice.ts** ⭐ ACTIVE
   - `transcribe` (PromptForm, FeedbackModal)
   - Voice-to-text features

### Admin & Features
7. **admin.ts** ⭐ ACTIVE
   - Multiple admin panel operations
   - User management, analytics, feedback review

8. **share.ts** ⭐ ACTIVE
   - `createShare`, `getSharedVideo`, `getMyShares`
   - Video sharing functionality

9. **feedback.ts** ⭐ ACTIVE
   - `submit` (FeedbackModal)
   - User feedback system

### Special Cases
10. **evaluation.ts** ⭐ RESEARCH
    - `runBatchTest` (CodeGenerationEvalWorkspace)
    - Used in testing/evaluation framework
    - **Keep**: Research and QA functionality

11. **emailSubscriber.ts** ⭐ MARKETING
    - `subscribe` (marketing page)
    - **Keep**: Marketing feature

12. **customComponent.ts** ⭐ PARTIALLY USED
    - `getJobStatus` (CustomComponentStatus)
    - Some commented-out usage in FixableComponentsPanel
    - **Keep**: Still has active usage

---

## 📊 Usage Intensity Analysis

### High Usage (5+ calls)
- **generation**: 8 active API calls
- **project**: 8 active API calls  
- **admin**: 12 active API calls
- **share**: 6 active API calls

### Medium Usage (2-4 calls)
- **chat**: 3 active API calls
- **voice**: 2 active API calls

### Low Usage (1 call)
- **render**: 1 API call
- **scenes**: 1 API call
- **feedback**: 1 API call
- **evaluation**: 1 API call
- **emailSubscriber**: 1 API call
- **customComponent**: 1 API call

### No Usage (0 calls)
- **animation**: 0 API calls ❌
- **chatStream**: 0 API calls ❌  
- **customComponentFix**: 0 API calls ❌
- **timeline**: 0 API calls ❌
- **video**: 0 API calls ❌

---

## 🧹 Cleanup Recommendations

### Phase 1: Remove Unused Routers
```bash
# Safe to delete (confirmed no usage)
rm src/server/api/routers/animation.ts
rm src/server/api/routers/chatStream.ts  
rm src/server/api/routers/customComponentFix.ts
rm src/server/api/routers/timeline.ts
rm src/server/api/routers/video.ts
```

### Phase 2: Update Router Registration
Remove from `src/server/api/root.ts`:
- `animationRouter`
- `chatStreamRouter`
- `customComponentFixRouter` 
- `timelineRouter`
- `videoRouter`

### Phase 3: Service Cleanup
With unused routers removed, can also remove:
- `src/server/services/animationDesigner.service.ts` (no router)
- Any other services only used by deleted routers

---

## 💡 Architecture Insights

### What We Learned

1. **Core Architecture**: 
   - `generation` + `project` + `scenes` = Core video creation
   - `chat` handles conversation flow
   - `render` handles video export

2. **Feature Completeness**:
   - Share functionality fully implemented
   - Admin system actively used
   - Voice features integrated
   - Evaluation system operational

3. **Legacy Code**:
   - Animation router was part of failed A2A system
   - Timeline router replaced by client-side state management
   - Video router superseded by stores/videoState

4. **Development Pattern**:
   - Some routers built but never integrated (timeline, video)
   - Some routers planned but not finished (customComponentFix)
   - Shows iterative development with changing requirements

---

## 🎯 Next Steps

1. **Execute router cleanup** (safe 30% reduction)
2. **Update imports** in root.ts
3. **Remove associated services** that only served deleted routers
4. **Test application** to ensure no breakage
5. **Document new cleaner API surface**

This cleanup will remove ~30% of API surface area while preserving all actively used functionality.