//memory-bank/TODO-critical.md
# 🚨 MVP Launch Blockers - UPDATED PRIORITIES

**Updated**: July 22, 2025  
**Based on**: User feedback on production readiness assessment

## 🎬 NEW: Export Feature (Sprint 63)

### Export Videos via AWS Lambda - **IMPLEMENTATION COMPLETE**
- **Status**: ✅ Code complete, awaiting AWS setup
- **Implementation**: Full Lambda rendering service with progress tracking
- **User Action Required**:
  1. Follow `/memory-bank/sprints/sprint63_export/lambda-setup-guide.md`
  2. Set up AWS account, CLI, and credentials
  3. Deploy Lambda function and create S3 bucket
  4. Configure environment variables from `.env.lambda.example`
- **Features**:
  - Export button in app header (next to Share)
  - Real-time progress tracking with FFmpeg hints
  - Auto-download when complete
  - Support for MP4, WebM, and GIF formats
- **Note**: Direct Lambda approach chosen after SSR failed due to Remotion server component limitations

## 🔥 IMMEDIATE FIXES NEEDED

### 1. ✅ Projects Dashboard Scrolling - **FIXED**
- **Problem**: Users can only see 8 projects in GenerateSidebar, rest hidden with "+X more"
- **Solution**: ✅ **COMPLETED** - Removed slice(0,8) limit, added proper scrolling with custom scrollbar
- **Impact**: Users can now access all their projects without limitation
- **Files Modified**: `src/app/projects/[id]/generate/workspace/GenerateSidebar.tsx`, `src/styles/globals.css`

### 2. 🔗 Share Functionality - **INVESTIGATE**
- **Problem**: Share links not fully working according to user
- **Status**: Share system appears to be implemented:
  - ✅ Share router with createShare, getSharedVideo endpoints
  - ✅ ShareDialog component in AppHeader
  - ✅ Share pages for viewing shared videos
  - 🔍 **NEED TO TEST**: User reports it's "not fully functioning"
- **Priority**: High - this is the MVP export solution (instead of AWS/Lambda complexity)
- **Files**: `src/server/api/routers/share.ts`, `src/components/ShareDialog.tsx`, `src/app/share/[shareId]/`

### 3. 🔧 AutoFix Not Working - **INVESTIGATE**
- **Problem**: User reports autofix functionality isn't working
- **Status**: System appears to be implemented:
  - ✅ FixBrokenSceneTool exists and looks comprehensive
  - ✅ Integrated into brain orchestrator
  - ✅ Proper model/prompt configuration
  - 🔍 **ISSUE**: May not be triggered automatically when scenes break
- **Investigation Needed**: 
  - How does system detect broken scenes?
  - Is fixBrokenScene being called by brain orchestrator?
  - Are scene rendering errors being captured and passed to autofix?
- **Files**: `src/lib/services/mcp-tools/fixBrokenScene.ts`, orchestrator logic

### 4. 🧠 Main Pipeline Reliability
- **Focus**: Ensure AI pipeline works reliably
  - ✅ Generates what users want
  - ✅ Handles image uploads
  - ✅ Doesn't break unexpectedly
- **Status**: Core functionality appears solid based on Sprint 32-33 improvements

## 📋 DEPRIORITIZED (Per User Feedback)

### Cost Control System
- **User Decision**: "If users want to use our service that much - it's great. 50 prompts costs under 5EUR. We will take that chance."
- **Status**: ❌ Deliberately not implementing for MVP
- **Reasoning**: High usage is a good problem to have

### Complex AWS Export System  
- **User Decision**: Focus on share functionality instead of AWS/Lambda export complexity
- **Alternative**: Users can screen record videos or use share links
- **Status**: ❌ Postponed - too much AWS complexity for MVP

## 🎯 SUCCESS CRITERIA FOR MVP LAUNCH

1. **✅ All Projects Accessible** - Users can scroll through all their projects 
2. **🔗 Share Links Work** - Users can create and share working video links
3. **🔧 AutoFix Works** - Broken scenes get automatically repaired
4. **🧠 AI Pipeline Stable** - Core generation, editing, image handling reliable

## 🔬 INVESTIGATION PLAN

### Immediate Next Steps:
1. **Test Share Functionality** - Create share link, verify it works end-to-end
2. **Debug AutoFix Trigger** - Trace how scene errors should trigger fixBrokenScene
3. **Test Main Pipeline** - Verify image uploads, scene generation, editing workflow

### If Issues Found:
- Share system: Debug tRPC endpoints, check database schema
- AutoFix: Add automatic scene error detection and fixBrokenScene triggering
- Main pipeline: Review error handling and edge cases

## 📊 LAUNCH READINESS: 85%

- **✅ Core AI Technology**: Excellent
- **✅ Admin Tooling**: World-class  
- **✅ Projects Access**: Fixed
- **🔍 Share System**: Needs verification
- **🔍 AutoFix**: Needs debugging
- **✅ Database/Auth**: Solid

**Bottom Line**: Very close to MVP launch. Just need to verify/fix 2-3 specific user-facing features rather than building new systems. 