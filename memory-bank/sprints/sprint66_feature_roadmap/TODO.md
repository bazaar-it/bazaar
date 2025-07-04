# Sprint 66: Feature Roadmap

**Created**: January 2, 2025  
**Status**: Planning Phase  
**Theme**: Enhanced User Experience & Production Features

## Overview
This sprint contains user-requested features from the Bazaar.it roadmap, prioritized by complexity and business impact.

## Feature List with Implementation Notes

### 🔴 HIGH PRIORITY - Core Features

#### 1. **Use Image Upload in Video** (HIGH Complexity)
- **What**: Allow uploaded images to be used as elements within generated videos
- **Current State**: Images can inspire scenes but aren't directly included
- **Implementation**:
  - Extend Remotion components to support `<Img>` with R2 URLs
  - Add image positioning/sizing to Brain Orchestrator context
  - Update CODE_GENERATOR prompt to handle image placement
  - Create new MCP tool: `addImageToScene`
- **Effort**: 3-5 days

#### 2. **Click to Select Elements** (HIGH Complexity)
- **What**: Click on preview elements to select and edit them
- **Current State**: No interactive preview - only code editing
- **Implementation**:
  - Add React DevTools-like element inspector to preview
  - Create selection overlay system with bounding boxes
  - Bridge selection to code editor with AST parsing
  - Add property panel for selected elements
- **Effort**: 5-7 days

#### 3. **Timeline Underneath Video Player** (LOW-MEDIUM Complexity)
- **What**: Visual timeline showing all scenes with thumbnails
- **Current State**: Scene list in sidebar only
- **Existing Asset**: React Video Editor Pro (RVE) purchased - includes timeline components
- **Implementation**:
  - Integrate RVE timeline component from https://github.com/Lysaker1/react-video-editor-pro
  - Adapt RVE timeline to work with our Remotion/scene structure
  - Extract only timeline UI (not full editor functionality)
  - Connect to our VideoState store
  - Features from RVE to integrate:
    - Scene thumbnails with duration bars
    - Drag-and-drop reordering
    - Visual duration indicators
    - Scrubbing/seeking functionality
    - Zoom in/out for precision editing
  - Custom modifications needed:
    - Remove video editing features (cuts, transitions)
    - Adapt to our scene-based structure
    - Connect to our preview player
    - Style to match Bazaar UI
- **Effort**: 1-2 days (reduced due to existing component)

#### 4. **AI Prompt Backend Improvements** (MEDIUM Complexity)
- **What**: Better context understanding and generation quality
- **Current State**: Good but could be more contextual
- **Implementation**:
  - Add scene history to Brain Orchestrator context
  - Implement style consistency tracking
  - Create prompt chaining for complex requests
  - Add few-shot examples to prompts
- **Effort**: 3-4 days

#### 5. **Vertical Video Format** (LOW Complexity)
- **What**: Support 9:16 format for TikTok/Reels
- **Current State**: Only 16:9 landscape
- **Implementation**:
  - Add format selector to project settings
  - Update Remotion composition dimensions
  - Adjust AI prompts for vertical layouts
  - Update preview panel aspect ratio
- **Effort**: 1-2 days

#### 6. **System Prompt Improvements** (LOW Complexity)
- **What**: Refine all prompts for better output
- **Current State**: Functional but can be optimized
- **Implementation**:
  - A/B test prompt variations
  - Add more specific examples
  - Reduce token usage while maintaining quality
  - Document prompt patterns that work
- **Effort**: 2-3 days

#### 7. **Scene Transitions** (HIGH Complexity)
- **What**: Smooth transitions between scenes
- **Current State**: Hard cuts only
- **Implementation**:
  - Create transition library (fade, slide, zoom)
  - Add transition timing to scene metadata
  - Update timeline to show transitions
  - Modify video compilation logic
- **Effort**: 4-5 days

#### 8. **Accept Payments** (MEDIUM Complexity)
- **What**: Monetization via Stripe
- **Current State**: Free beta
- **Implementation**:
  - Integrate Stripe checkout
  - Add subscription tiers to database
  - Implement usage limits/quotas
  - Create billing dashboard
- **Effort**: 3-4 days

#### 9. **Web Agent Production Fix** (HIGH Complexity)
- **What**: Replace Playwright-based web scraping with production-compatible solution
- **Current State**: Uses Playwright which only works in dev, fails on Vercel serverless
- **Root Cause**: Vercel serverless functions can't run Playwright due to:
  - 50MB size limit (Playwright + Chrome = ~400MB)
  - Missing system dependencies for browser automation
  - Serverless can't spawn browser processes
- **User Problems**:
  - Cannot paste website URLs in production
  - Feature is advertised but doesn't work for real users
  - Lost opportunity for easy content generation from websites
- **Solution Options**:
  - **Option A**: Use dedicated scraping API (Browserless, ScrapingBee, Apify)
  - **Option B**: Simple fetch + Cheerio for static sites
  - **Option C**: Deploy separate scraping service (Railway/Render)
  - **Option D**: Use Vercel Edge Functions with lighter scraping
- **Recommended Implementation** (Option A + B hybrid):
  - Try simple fetch first for static sites
  - Fall back to external API for JavaScript-heavy sites
  - Cache results aggressively in R2
- **Technical Approach**:
  ```typescript
  // Replace Playwright with:
  async function fetchWebContent(url: string) {
    // 1. Try simple fetch
    const response = await fetch(url);
    const html = await response.text();
    
    // 2. If static content found, parse with Cheerio
    if (hasContent(html)) {
      return parseWithCheerio(html);
    }
    
    // 3. Fall back to external API for JS sites
    return await browserlessApi.scrape(url);
  }
  ```
- **Success Metrics**:
  - Web agent works 100% in production
  - 90% of sites work with simple fetch (fast)
  - 10% use external API (slower but works)
  - Clear error messages for blocked sites
- **Effort**: 3-4 days

### 🟡 MEDIUM PRIORITY - Enhancement Features

#### 10. **Color Palette System** (MEDIUM Complexity)
- **What**: Global color palette management for consistent video theming
- **Current State**: Colors defined per scene without global consistency
- **User Need**: Users have specific brand colors (primary, secondary, tertiary) they want applied across all scenes
- **Implementation Options** (without new panels):
  - **Option A**: Color palette selector in chat interface
    - Add color picker command like `/palette #FF0000 #00FF00 #0000FF`
    - Show current palette as persistent chip above chat input
  - **Option B**: Project settings modal
    - Add "Color Theme" tab to existing project settings
    - Primary, secondary, tertiary color pickers with hex input
    - "Apply to all scenes" vs "Apply to new scenes" toggle
  - **Option C**: Smart color extraction from chat
    - Detect hex codes or color names in prompts
    - Auto-suggest palette based on user descriptions
  - **Technical Implementation**:
    - Store palette in project metadata
    - Add palette to Brain Orchestrator context
    - Update CODE_GENERATOR prompt to respect palette
    - Create updateSceneColors tool for batch updates
- **Effort**: 2-3 days

#### 11. **Download File Options** (LOW Complexity)
- **What**: Export as WebM, GIF, not just MP4
- **Current State**: MP4 only
- **Implementation**:
  - Add format selector to export modal
  - Update Lambda render settings
  - Adjust quality settings per format
- **Effort**: 1 day

#### 12. **Duplicate Scene** (LOW Complexity)
- **What**: Copy existing scene as starting point
- **Current State**: Only new or edit
- **Implementation**:
  - Add duplicate button to scene cards
  - Clone scene with new ID
  - Update scene order/position
- **Effort**: 0.5 days

#### 13. **Typography Agent** (HIGH Complexity)
- **What**: Specialized AI for text/typography
- **Current State**: General AI handles everything
- **Implementation**:
  - Create specialized typography prompt
  - Add font pairing logic
  - Implement text hierarchy rules
  - Integration with main Brain
- **Effort**: 3-4 days

#### 14. **Transition Agent** (HIGH Complexity)
- **What**: AI specialized in transitions
- **Current State**: No transition support
- **Implementation**:
  - Create transition-focused prompts
  - Build transition template library
  - Add timing/easing expertise
- **Effort**: 3-4 days

#### 15. **Multi-Scene Selection** (MEDIUM Complexity)
- **What**: Select multiple scenes for batch ops
- **Current State**: Single scene operations
- **Implementation**:
  - Add checkbox selection UI
  - Implement batch operations (delete, reorder)
  - Update state management
- **Effort**: 2 days

#### 16. **User Database Management** (MEDIUM Complexity)
- **What**: Better content organization
- **Current State**: Basic project list
- **Implementation**:
  - Add folders/categories
  - Implement search/filter
  - Add tags and metadata
  - Create archive functionality
- **Effort**: 2-3 days

#### 17. **Community Projects** (HIGH Complexity)
- **What**: Public template gallery
- **Current State**: Private projects only
- **Implementation**:
  - Add public/private toggle
  - Create gallery UI
  - Implement likes/saves
  - Add template forking
- **Effort**: 4-5 days

#### 18. **Audio & Voice Integration** (HIGH Complexity)
- **What**: Complete audio solution including music, voiceovers, and AI voices
- **Current State**: Silent videos only
- **Core Features**:
  - Background music upload and library
  - ElevenLabs AI voice integration for narration
  - Voice-over recording capability
  - Multi-track audio support (music + voice)
- **ElevenLabs Integration**:
  - Text-to-speech for scene narration
  - Multiple voice options (male/female/accents)
  - Sync AI voice with text animations
  - Natural language commands: "Add a British female voice reading the title"
  - Emotion and pacing control
- **Implementation Details**:
  - Audio upload to R2 storage (mp3, wav, m4a)
  - ElevenLabs API integration with streaming
  - Audio waveform visualization in timeline
  - Volume mixing controls (music vs voice levels)
  - Fade in/out for scene transitions
  - Lip-sync timing for character animations
  - Audio preview before rendering
- **Use Cases**:
  - Product demo narrations
  - Educational content with voice explanations
  - Story-telling videos with character voices
  - Background music for mood setting
  - Sound effects library integration
- **Technical Approach**:
  ```typescript
  interface AudioTrack {
    type: 'music' | 'voiceover' | 'ai-voice' | 'sfx';
    source: 'upload' | 'elevenlabs' | 'library';
    url?: string;
    text?: string; // for TTS
    voice?: ElevenLabsVoiceId;
    volume: number;
    fadeIn?: number;
    fadeOut?: number;
    startTime: number;
    duration: number;
  }
  ```
- **Effort**: 5-6 days

#### 19. **Multi-Step Tool Execution** (HIGH Complexity)
- **What**: Execute multiple operations from single natural language command
- **Current State**: Single tool execution only
- **User Problems**:
  - "Update all backgrounds to black" - system doesn't understand "all"
  - "Delete all scenes with text" - can't filter and batch operate
  - "Make all animations faster" - can't apply to multiple scenes
- **Implementation**:
  - Create BatchOperationPlanner in Brain Orchestrator
  - Add scene filtering/selection logic
  - Implement transaction-like execution (all or nothing)
  - Add progress feedback for long operations
  - Example flow: "Change all backgrounds" → Find all scenes → Edit each → Report results
- **Technical Details**:
  ```typescript
  // New workflow types
  interface BatchOperation {
    filter: SceneFilter; // which scenes to affect
    operation: ToolOperation; // what to do
    confirmation?: boolean; // ask before destructive ops
  }
  ```
- **Effort**: 4-5 days

#### 20. **Batch Scene Operations** (MEDIUM Complexity)
- **What**: UI and backend support for operations on multiple scenes
- **Current State**: Can only edit one scene at a time
- **User Needs**:
  - Select multiple scenes with checkboxes
  - Batch delete with confirmation
  - Batch style updates (colors, fonts, timing)
  - "Apply to all" option when editing
- **Implementation**:
  - Add selection state to VideoState
  - Create batch operation UI in scene cards
  - Implement batch MCP tools (batchEdit, batchDelete)
  - Transaction support for atomicity
- **Effort**: 2-3 days

#### 21. **Smart Pattern Recognition** (MEDIUM Complexity)
- **What**: AI understands patterns like "all", "every", "scenes with X"
- **Current State**: Literal interpretation only
- **Examples to Support**:
  - "Delete all text scenes" → Analyze scenes, find text-only ones
  - "Update every third scene" → Pattern-based selection
  - "Change all blue elements to red" → Content-aware editing
  - "Remove scenes shorter than 2 seconds" → Conditional operations
- **Implementation**:
  - Enhance Brain Orchestrator with pattern matching
  - Add scene analysis capabilities
  - Create filter DSL for complex queries
  - Natural language to filter translation
- **Effort**: 3 days

### 🟢 LOW PRIORITY - Nice-to-Have Features

#### 22. **Playback Speed Control** (LOW Complexity) ✅ **COMPLETED**
- **What**: 0.5x, 1x, 2x preview speed
- **Status**: ✅ **IMPLEMENTED** - January 2, 2025
- **Implementation Summary**:
  - ✅ Added PlaybackSpeedControl component with 7 speed presets (0.25x to 2x)
  - ✅ Integrated into preview panel header (next to refresh button)
  - ✅ Uses Remotion Player's native playbackRate prop
  - ✅ Saves user preference to localStorage
  - ✅ Clean dropdown UI with just numbers (no descriptive text)
- **Files Created/Modified**:
  - `/src/components/ui/PlaybackSpeedControl.tsx` - Speed control dropdown
  - `/src/app/projects/[id]/generate/workspace/WorkspaceContentAreaG.tsx` - Header integration
  - `/src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx` - Speed state management
  - `/src/app/projects/[id]/generate/components/RemotionPreview.tsx` - Player prop integration
- **Key Features Delivered**:
  - Speed presets: 0.25x, 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
  - Event-based communication between components
  - Persistent speed preference across sessions
  - Narrow dropdown (w-24) for compact UI
- **Documentation**: See `/memory-bank/sprints/sprint66_feature_roadmap/022-playback-speed-control-completed.md`
- **Effort**: 0.5 days ✅ Completed in estimated time

#### 23. **GitHub Integration** (MEDIUM Complexity)
- **What**: Sync video code to GitHub
- **Current State**: No version control
- **Implementation**:
  - Add GitHub OAuth
  - Create sync functionality
  - Handle merge conflicts
  - Show commit history
- **Effort**: 3 days

#### 24. **Loop Control** (LOW Complexity) ✅ **COMPLETED**
- **What**: Video and scene loop control with three-state system
- **Status**: ✅ **IMPLEMENTED** - January 3, 2025
- **Implementation Summary**:
  - ✅ Three-state loop system: video loop → off → scene loop
  - ✅ Scene selector dropdown (matching code panel UI pattern)
  - ✅ Proper icon system (Repeat for video, Repeat1 for scene)
  - ✅ Fixed default autoloop behavior
  - ✅ Fixed drag handler blocking loop button clicks
  - ✅ Used Remotion's native inFrame/outFrame props for clean implementation
- **Files Modified**:
  - `/src/components/ui/LoopToggle.tsx` - Complete rewrite for three-state system
  - `/src/app/projects/[id]/generate/workspace/WorkspaceContentAreaG.tsx` - Updated state management
  - `/src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx` - Scene loop implementation
- **Key Features Delivered**:
  - Default: Autoloop entire video (Repeat icon active)
  - Click once: Turn off loop (Repeat icon greyed out)
  - Click again: Loop single scene (Repeat1 icon active + scene dropdown)
  - Scene selector only appears in scene loop mode
  - Uses same "Scene 1, Scene 2" naming as code panel
  - Persistent state across sessions via localStorage
- **Documentation**: See `/memory-bank/sprints/sprint66_feature_roadmap/024-loop-control.md`
- **Effort**: 1 day ✅ Completed in estimated time

#### 25. **Panel Usage Analytics** (MEDIUM Complexity)
- **What**: Track which workspace panels users actually use and for how long
- **Current State**: No visibility into user workflow preferences
- **Why This Matters**:
  - Understand if code panel is being used at all
  - See real panel distribution (e.g., 48% chat, 48% preview, 4% templates)
  - Identify power users (code + preview) vs casual users (chat + preview only)
  - Make data-driven decisions about UI improvements
- **Data to Track**:
  - Panel open/close events with timestamps
  - Active panel time (which panel has focus)
  - Panel resize events
  - Panel combinations (e.g., chat+preview vs code+preview)
  - Session-based analysis (panel usage patterns per session)
- **Implementation**:
  - Add analytics events to panel visibility toggles
  - Track active panel focus time
  - Store in analytics table with user/session context
  - Create admin dashboard visualization
  - Privacy-conscious: aggregate data only
- **Example Insights**:
  - "85% of users never open code panel"
  - "Power users spend 60% time in code, 40% in preview"
  - "Template panel average open time: 2.5 minutes"
  - "Most common layout: 50/50 chat/preview"
- **Technical Approach**:
  ```typescript
  // Track panel states
  interface PanelMetrics {
    userId: string;
    sessionId: string;
    panelStates: {
      chat: { open: boolean; widthPercent: number };
      preview: { open: boolean; widthPercent: number };
      code: { open: boolean; widthPercent: number };
      templates: { open: boolean; widthPercent: number };
      storyboard: { open: boolean; widthPercent: number };
    };
    timestamp: Date;
    event: 'open' | 'close' | 'resize' | 'focus';
  }
  ```
- **Effort**: 2-3 days

#### 26. **Chat History Export & Analysis** (MEDIUM Complexity) ✅ **COMPLETED**
- **What**: Export and analyze all user chat conversations for insights
- **Status**: ✅ **IMPLEMENTED** - January 2, 2025
- **Implementation Summary**:
  - ✅ Complete admin dashboard with analytics overview
  - ✅ Export functionality with JSON, CSV, JSONL formats
  - ✅ Data anonymization and privacy controls
  - ✅ Real-time analytics with error rates, peak hours, common intents
  - ✅ TypeScript types and tRPC endpoints
  - ✅ Admin navigation integration
- **Files Created**:
  - `/src/lib/types/api/chat-export.types.ts` - TypeScript definitions
  - `/src/server/api/routers/admin/chat-export-helpers.ts` - Data processing
  - `/src/server/api/routers/admin/chat-analytics.ts` - Analytics computation
  - `/src/app/admin/chat-export/page.tsx` - Admin UI
  - Updated `/src/server/api/routers/admin.ts` - API endpoints
- **Key Features Delivered**:
  - Export formats: JSON (analysis), CSV (Excel), JSONL (LLM training)
  - Analytics: Total conversations, avg length, error rates, peak usage hours
  - Privacy: Full anonymization option for PII removal
  - Insights: Top user phrases, common intents, success patterns
- **Documentation**: See `/memory-bank/sprints/sprint66_feature_roadmap/026-chat-export-implementation-final.md`

#### 27. **Admin Authentication Security** (CRITICAL - HIGH Priority) ✅ **COMPLETED**
- **What**: Secure the entire admin section behind proper authentication
- **Status**: ✅ **IMPLEMENTED** - January 2, 2025
- **Implementation Summary**:
  - ✅ Multi-layer security architecture (middleware → layout → auth checks)
  - ✅ Middleware-level route protection with instant redirects
  - ✅ Server-side authentication verification in admin layout
  - ✅ 403 forbidden page for unauthorized access
  - ✅ NextAuth.js integration with admin status in sessions
  - ✅ Zero admin UI leakage to non-admin users
- **Files Modified**:
  - `middleware.ts` - Added admin route protection
  - `/src/app/403/page.tsx` - Created 403 forbidden page
  - `/src/app/admin/layout.tsx` - Added server-side auth verification
  - `/src/server/auth/config.ts` - Extended session types and JWT callbacks
- **Security Features Delivered**:
  - Edge-level protection: < 100ms redirect for unauthorized access
  - Database-verified admin status in JWT tokens
  - Clean UX: No flashing or partial admin content loads
  - Comprehensive protection: All /admin/* routes secured
- **Checklist** ✅ **ALL COMPLETED**:
  - ✅ /admin - requires admin auth
  - ✅ /admin/users - requires admin auth  
  - ✅ /admin/analytics - requires admin auth
  - ✅ /admin/feedback - requires admin auth
  - ✅ /admin/exports - requires admin auth
  - ✅ /admin/chat-export - requires admin auth (new)
  - ✅ No admin navigation visible to non-admins
  - ✅ API routes protected with adminOnlyProcedure
- **Documentation**: See `/memory-bank/sprints/sprint66_feature_roadmap/027-admin-security-implementation-final.md`

#### 28. **Remove Template Limit** (LOW Complexity)
- **What**: Remove the 8 template maximum limit to allow unlimited templates
- **Current State**: System enforces maximum of 8 templates
- **Why This Matters**:
  - User flexibility: Allow users to create as many templates as needed
  - Business growth: More templates = more variety for users
  - Seasonal content: Can add holiday/event-specific templates without removing others
  - Community contributions: Enable user-submitted templates in future
- **Implementation**:
  - Remove validation check in template creation endpoint
  - Update UI to handle pagination/scrolling for many templates
  - Add search/filter functionality for template discovery
  - Implement lazy loading for performance
- **Technical Approach**:
  ```typescript
  // Remove or comment out template limit check
  // const TEMPLATE_LIMIT = 8; // REMOVED
  
  // Add pagination to template fetching
  const templates = await db
    .select()
    .from(templates)
    .where(eq(templates.isActive, true))
    .orderBy(desc(templates.createdAt))
    .limit(input.limit || 20)
    .offset(input.offset || 0);
  ```
- **UI Improvements Needed**:
  - Add template search bar
  - Implement infinite scroll or pagination
  - Add category filters
  - Show template count without limit
  - Add "Load More" button if using pagination
- **Performance Considerations**:
  - Lazy load template thumbnails
  - Cache template metadata
  - Consider virtualized scrolling for 50+ templates
  - Add template indexing for search
- **Effort**: 1-2 days

#### 29. **Video Export/Render Improvements** (MEDIUM Complexity)
- **What**: Improve the video export experience with better UX, labeling, and functionality
- **Current State**: Export has confusing labels, redirect issues, and missing assets
- **User Problems**:
  - Quality labels (high/medium/low) are unclear - should show actual resolution
  - Manual download required after export completes
  - "Export" terminology sets wrong expectations - should be "Render"
  - about:blank redirect prevents download permission popup
  - Filename looks suspicious/virus-like
  - Icons/assets missing from rendered video
  - Quality settings produce same resolution with minimal visual difference
- **Implementation Tasks**:
  1. **Resolution Labels**:
     - Replace "Low Quality" → "480p"
     - Replace "Medium Quality" → "720p" 
     - Replace "High Quality" → "1080p"
     - Show file size estimates next to each option
  2. **Auto-Download**:
     - Trigger download immediately when render completes
     - Show toast notification: "Your video is downloading..."
     - Keep progress UI visible during download
  3. **Terminology Update**:
     - Change all "Export" buttons/text to "Render"
     - Update loading messages: "Rendering your video..."
     - Set expectations: "This may take 30-60 seconds"
  4. **Fix Download Flow**:
     - Remove about:blank redirect
     - Use direct download link with proper headers
     - Ensure browser download permissions work correctly
  5. **Clean Filenames**:
     ```typescript
     // Current: remotion-render-abc123xyz789.mp4
     // New format: projectName-YYYY-MM-DD-quality.mp4
     const filename = `${sanitize(projectTitle)}-${format(new Date(), 'yyyy-MM-dd')}-${quality}.mp4`;
     // Example: my-awesome-video-2025-01-15-1080p.mp4
     ```
  6. **Fix Missing Icons**:
     - Ensure all assets are included in Lambda bundle
     - Check R2 URLs are accessible during render
     - Add asset preloading before render starts
     - Debug with render logs to identify missing resources
  7. **Quality Differences**:
     - Low (480p): 480p resolution, lower bitrate
     - Medium (720p): 720p resolution, medium bitrate  
     - High (1080p): 1080p resolution, high bitrate
     - Add tooltip explaining: "All exports are optimized. Higher quality = larger file size & better detail retention"
- **Technical Implementation**:
  ```typescript
  // Update export modal
  const qualityOptions = [
    { value: 'low', label: '480p', description: 'Smallest file size' },
    { value: 'medium', label: '720p', description: 'Balanced quality' },
    { value: 'high', label: '1080p', description: 'Best quality' }
  ];
  
  // Auto-download implementation
  onRenderComplete: async (result) => {
    const link = document.createElement('a');
    link.href = result.url;
    link.download = generateCleanFilename(project, quality);
    link.click();
    
    toast.success('Your video is ready!');
  }
  ```
- **UI/UX Updates**:
  - Show estimated render time based on video length
  - Display file size estimates for each quality option
  - Add "What's the difference?" tooltip for quality options
  - Progress bar with percentage during render
  - Success animation when complete
- **Effort**: 2-3 days

#### 30. **Conditional Restore & Trim Tool Improvements** (MEDIUM Complexity)
- **What**: Smart restore functionality that only shows when applicable, and improve trim tool naming/behavior
- **Current State**: 
  - Restore button shows for all operations but doesn't work for trim/duration changes
  - Users get "restore successful" toast but nothing actually restores
  - Trim tool only changes duration, not actual scene content
  - Confusing UX when restore appears but doesn't work
- **User Problems**:
  - Restore button appears for trim operations where it can't work
  - False success messages when restore fails silently
  - "Trim" terminology suggests content editing but only affects duration
  - No clear indication of what operations support restore
- **Implementation**:
  1. **Conditional Restore Logic**:
     ```typescript
     interface MessageWithRestore {
       id: string;
       operationType: 'create' | 'edit' | 'delete' | 'trim' | 'paste';
       hasCodeChange: boolean; // true for operations that modify scene.tsxCode
       canRestore: boolean;    // computed based on operation type
     }
     
     // Show restore only for operations that modify actual code
     const canRestore = (operation: string) => {
       return ['create', 'edit', 'delete'].includes(operation) && 
              !['trim', 'duration'].includes(operation);
     };
     ```
  2. **Message Type Detection**:
     - Track operation type in message metadata
     - Differentiate between code changes vs duration/metadata changes
     - Store previous scene versions only for code-modifying operations
  3. **Trim Tool Renaming**:
     - Change "Trim" → "Adjust Duration" or "Set Duration"
     - Update tool description: "Change how long this scene plays"
     - Make it clear it's duration-only, not content editing
  4. **UI Improvements**:
     - Hide restore button for non-restorable operations
     - Add tooltip: "Restore previous version" (only when available)
     - Show different icons for different operation types:
       - ✏️ Edit (can restore)
       - ⏱️ Duration change (cannot restore)
       - 📋 Paste (can restore to pre-paste version)
  5. **Database Tracking**:
     ```typescript
     // Add to sceneIterations or message metadata
     interface OperationMetadata {
       type: 'code_change' | 'duration_change' | 'metadata_change';
       previousCode?: string;  // only store for code changes
       previousDuration?: number; // for duration changes
       canRestore: boolean;
     }
     ```
- **Technical Implementation**:
  ```typescript
  // In message component
  const showRestoreButton = useMemo(() => {
    return message.metadata?.operationType === 'edit' || 
           message.metadata?.operationType === 'create' ||
           (message.metadata?.operationType === 'delete' && message.metadata?.hasBackup);
  }, [message]);
  
  // In trim tool
  export const trimTool = {
    name: 'adjustDuration', // renamed from 'trim'
    description: 'Adjust scene duration without changing content',
    canRestore: false,
    // ... rest of implementation
  };
  ```
- **Error Prevention**:
  - Remove restore option from trim/duration operations
  - Clear success/failure messages based on actual restore capability
  - Add validation before attempting restore
  - Log restore attempts for debugging
- **User Experience**:
  - Clear visual distinction between content edits and duration changes
  - Consistent messaging about what each operation does
  - No false positive restore success messages
  - Better operation labeling in chat history
- **Edge Cases to Handle**:
  - Pasted code operations (should allow restore to pre-paste state)
  - Multiple rapid operations (which version to restore to?)
  - Operations that fail partway through
  - Concurrent users editing same scene
- **Effort**: 2 days

#### 31. **Fix First Scene Context Issue** (MEDIUM Complexity) ✅ **COMPLETED**
- **What**: Remove previous scene context contamination causing all first scenes to look similar (purple theme)
- **Status**: ✅ **IMPLEMENTED** - January 3, 2025
- **Root Cause Found**: 
  - CODE_GENERATOR prompt had specific purple gradient as default: `#f093fb to #f5576c`
  - This was being used as the "warm" gradient option for all first scenes
- **Implementation Summary**:
  - ✅ Updated CODE_GENERATOR prompt to remove purple bias
  - ✅ Added emphasis on matching user's prompt context for colors
  - ✅ Provided variety of gradient examples without defaulting to purple
  - ✅ Added "FIRST SCENE VARIETY" section to prompt
  - ✅ Kept previousSceneContext logic intact (it was already correct)
- **Files Modified**:
  - `/src/config/prompts/active/code-generator.ts` - Removed purple bias, added variety
- **Key Changes**:
  ```typescript
  // OLD: Specific purple gradient
  Warm: linear-gradient from #f093fb to #f5576c
  
  // NEW: Context-driven color selection
  - Consider the tone and context of what they're creating
  - Professional blues/grays for business content
  - Vibrant colors for fun content
  - Variety of gradient examples (no purple default)
  ```
- **Expected Results**:
  - First scenes now match user prompt context
  - No more default purple bias
  - Each project starts with unique visual identity
  - Better variety across different projects
- **Effort**: 0.5 days ✅ Completed quickly once root cause identified

#### 32. **Fix Double Refresh on Scene Updates** (MEDIUM Complexity)
- **What**: Eliminate redundant preview panel refreshes when scenes are added/updated
- **Current State**: Preview refreshes twice for every scene update (template add, edit, etc.)
- **Root Cause**: 
  - First refresh: Direct state update via `addScene()` in videoState
  - Second refresh: Database fetch + `updateAndRefresh()` in `handleSceneGenerated`
- **User Problems**:
  - Jarring visual experience with double flicker
  - Performance impact from compiling scenes twice
  - Potential race conditions between refreshes
  - Confusing for users who see content flash/reload
- **Implementation Options**:
  - **Option A**: Remove optimistic updates, only update after DB fetch
  - **Option B**: Check if scene exists in state before fetching from DB (recommended)
  - **Option C**: Debounce refresh mechanism to prevent rapid updates
- **Recommended Solution** (Option B):
  ```typescript
  // In handleSceneGenerated
  const existingScene = getCurrentProps()?.scenes.find(s => s.id === sceneId);
  if (existingScene) {
    console.log('[WorkspaceContentAreaG] Scene already in state, skipping DB fetch');
    setSelectedSceneId(sceneId);
    return;
  }
  // Only fetch if scene not in state
  ```
- **Technical Details**:
  - TemplatesPanelG adds scene optimistically via `addScene()`
  - Then calls `onSceneGenerated` callback
  - Callback fetches ALL scenes from DB and replaces state
  - This causes PreviewPanelG's effect to fire twice
- **Success Metrics**:
  - Single refresh per scene update
  - No visual flicker/flash
  - Faster perceived performance
  - Consistent state between panels
- **Edge Cases to Handle**:
  - Scene updates from other sources (SSE, polling)
  - Concurrent edits from multiple panels
  - Failed optimistic updates needing rollback
- **Effort**: 1 day

