# Sprint 99: URL-to-Video Pipeline Enhancement

## Sprint Overview
**Start Date**: 2025-01-22
**Status**: In Progress
**Goal**: Complete the URL-to-video pipeline integration with seamless UX

## Background
The system already has most components built:
- ✅ WebAnalysisAgentV2 for brand extraction
- ✅ HeroJourneyGenerator for narrative creation  
- ✅ TemplateSelector for matching templates to story beats
- ✅ 60+ animation templates
- ✅ Website pipeline router

## What We're Building

### Phase 1: Brain Integration ✅
- Added `websiteToVideo` tool to Brain Orchestrator
- Updated prompts to recognize website URLs
- Added routing logic for non-YouTube URLs

### Phase 2: Chat UI Integration (IN PROGRESS)
- Detect URLs in ChatPanelG
- Show progress for multi-step generation
- Display brand extraction status

### Phase 3: Tool Implementation
- Create websiteToVideo tool handler
- Connect to existing pipeline
- Handle progress updates via SSE

### Phase 4: Template Context Enhancement
- Use templates as examples for AI generation
- Implement template similarity matching
- Improve first-scene generation quality

## Files Modified

### Brain Orchestrator Updates
- `/src/config/prompts/active/brain-orchestrator.ts`
  - Added websiteToVideo to available tools
  - Added website URL handling logic
  - Updated response format to include websiteUrl field

### Next Files to Update
- `/src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx` - Add URL detection
- `/src/brain/orchestrator_functions/intentAnalyzer.ts` - Handle websiteToVideo tool
- `/src/server/api/routers/generation.universal.ts` - Route to website pipeline
- `/src/tools/website/websiteToVideoHandler.ts` - Create tool handler

## Architecture Flow

```
User Input (URL) 
    ↓
ChatPanelG (detect URL)
    ↓
Brain Orchestrator (select websiteToVideo tool)
    ↓
Intent Analyzer (process decision)
    ↓
Generation Router (call website pipeline)
    ↓
Website Pipeline:
    1. Web Analysis (brand extraction)
    2. Hero Journey (narrative creation)
    3. Template Selection (beat matching)
    4. Template Customization (brand injection)
    5. Scene Generation (5 scenes)
    ↓
Progress Updates (SSE)
    ↓
Preview Panel (show video)
```

## Success Metrics
- URL detection accuracy: 100%
- Pipeline completion rate: >95%
- Generation time: <60 seconds
- Brand accuracy: >85%

## Testing Checklist
- [ ] Test with various URL formats
- [ ] Verify progress updates display
- [ ] Check brand extraction accuracy
- [ ] Validate template selection logic
- [ ] Ensure scene generation completes
- [ ] Test error handling

## Notes
- Using existing infrastructure, not reinventing
- Focus on seamless integration and UX
- Progressive enhancement approach