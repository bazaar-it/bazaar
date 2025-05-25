# BAZAAR-306: GitHub Integration Foundation

## 🏗️ Context & Architecture Overview

### Current System Architecture
Bazaar-Vid operates with a **dual-page architecture** developed across multiple sprints:

**🆕 New System (Sprint 24-26)**: `/projects/[id]/generate/page.tsx`
- **Primary Focus**: Modern workspace with scene-first generation
- **Key Features**: Chat-driven scene creation, real-time preview, Monaco code editor
- **Architecture**: 4-panel workspace (Chat, Preview, Storyboard, Code)
- **State Management**: Zustand-based video state with tRPC integration
- **Development Period**: Sprints 24, 25, 26 - our latest and most advanced functionality

**🔄 Legacy System (Sprint 16-22)**: `/projects/[id]/edit/page.tsx`  
- **Purpose**: Original timeline-based editor with complex panel system
- **Features**: Timeline editing, custom components panel, scene planning history
- **Architecture**: Resizable panels with drag-and-drop, timeline-centric workflow
- **Development Period**: Sprints 16, 19, 20, 21, 22 - stable but older approach

### 🎯 Sprint 27 Goal
**Integrate GitHub style extraction into the NEW generate page workspace** to enable no-code developers to create branded videos from their deployed applications.

### 📋 Approach
1. **Focus Exclusively on `/generate` Page**: All GitHub features integrate with the modern workspace
2. **Enhance Existing Panels**: Add GitHub functionality to Chat, Preview, Storyboard panels
3. **Preserve Legacy System**: Keep `/edit` page unchanged for backward compatibility
4. **Documentation Reference**: Sprint 24-26 folders contain workspace architecture details

### 🎨 Integration Strategy
- **Chat Panel**: GitHub repo connection and style extraction commands
- **Storyboard Panel**: Style-aware scene generation with extracted branding
- **Preview Panel**: Real-time preview with applied GitHub styles
- **New GitHub Panel**: Optional dedicated panel for style management

---

**Priority**: P1 - Core Feature  
**Estimate**: 16-20 hours  
**Sprint**: 27  
**Status**: Planning  
**Depends On**: BAZAAR-305 (Architecture Cleanup)  

## 🎯 Objective

Build the foundational infrastructure for GitHub integration to extract visual DNA from deployed applications. Focus on MVP implementation that can be iterated quickly.

## 🎨 Vision

Enable no-code developers (Lovable, Bolt, Replit users) to connect their GitHub repos and automatically extract visual styling (colors, fonts, layouts) to generate promotional videos that match their app's branding.

## 📋 MVP Scope (Ship Fast, Iterate)

### Core User Flow
1. **Connect GitHub**: Simple OAuth integration
2. **Select Repository**: Choose from user's repos
3. **Extract Styles**: Analyze deployed app for visual properties
4. **Generate Prompt**: Create style-aware video generation prompts
5. **Apply Styling**: Use extracted styles in video generation

## 🔧 Technical Implementation Strategy

### Phase 1: GitHub Connection (6h)
- [ ] **GitHub OAuth Integration**
  - Add GitHub OAuth provider to NextAuth
  - Create GitHub app with appropriate permissions
  - Store GitHub tokens securely in database
  - Add GitHub connection UI in workspace

- [ ] **Repository Selection**
  - Fetch user's repositories via GitHub API
  - Filter for likely web app repos (has package.json, etc.)
  - Simple repository picker UI
  - Store selected repo metadata

### Phase 2: Style Extraction Engine (8h)
- [ ] **Deployment Detection**
  - Check for common deployment patterns (Vercel, Netlify, etc.)
  - Extract deployment URLs from repo metadata
  - Fallback to manual URL input
  - Validate accessible deployment

- [ ] **Visual Analysis Pipeline**
  - Screenshot capture of deployed app
  - Color palette extraction using image analysis
  - Typography detection from CSS/HTML
  - Layout pattern recognition (basic)
  - Store extracted style data

### Phase 3: Style Application (6h)
- [ ] **Style-Aware Prompt Generation**
  - Integrate extracted colors into generation prompts
  - Apply typography preferences to text scenes
  - Use layout patterns for scene composition
  - Create style-consistent animation choices

- [ ] **Workspace Integration**
  - Add "GitHub Styles" panel to workspace
  - Show extracted style preview
  - Allow manual style adjustments
  - Apply styles to existing scenes

## 🚀 MVP Implementation Details

### Database Schema
```sql
-- GitHub integration tables
CREATE TABLE github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  github_user_id VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL, -- encrypted
  refresh_token TEXT, -- encrypted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE github_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES github_connections(id),
  repo_name VARCHAR(255) NOT NULL,
  repo_url VARCHAR(255) NOT NULL,
  deployment_url VARCHAR(255),
  last_analyzed TIMESTAMP,
  style_data JSONB, -- extracted visual properties
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Style Data Structure
```typescript
interface ExtractedStyles {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    palette: string[]; // full color palette
  };
  typography: {
    primaryFont: string;
    secondaryFont: string;
    fontSizes: number[];
    fontWeights: number[];
  };
  layout: {
    spacing: number[];
    borderRadius: number[];
    shadows: string[];
  };
  branding: {
    logo?: string;
    brandName?: string;
    tagline?: string;
  };
}
```

### API Endpoints (tRPC)
```typescript
// GitHub router
export const githubRouter = createTRPCRouter({
  // Connect GitHub account
  connect: protectedProcedure
    .mutation(async ({ ctx }) => { /* OAuth flow */ }),
  
  // List user repositories
  listRepos: protectedProcedure
    .query(async ({ ctx }) => { /* Fetch repos */ }),
  
  // Analyze repository for styles
  analyzeRepo: protectedProcedure
    .input(z.object({ repoId: z.string() }))
    .mutation(async ({ ctx, input }) => { /* Extract styles */ }),
  
  // Get extracted styles
  getStyles: protectedProcedure
    .input(z.object({ repoId: z.string() }))
    .query(async ({ ctx, input }) => { /* Return styles */ }),
});
```

## 🎯 Success Criteria

### Technical
- [ ] Users can connect GitHub account via OAuth
- [ ] Repository selection works for 90% of web app repos
- [ ] Style extraction produces usable color palettes
- [ ] Generated videos reflect extracted styling
- [ ] No breaking changes to existing workspace

### User Experience
- [ ] Connection flow takes < 2 minutes
- [ ] Style extraction completes in < 30 seconds
- [ ] Visual style preview is recognizable
- [ ] Generated content matches app branding
- [ ] Clear error messages for failed extractions

## 🚨 MVP Limitations (Iterate Later)

### What We're NOT Building Yet
- Advanced layout analysis
- Component-level style extraction
- Multiple deployment environment support
- Style version history
- Advanced typography matching
- Complex animation style transfer

### Known Edge Cases
- Private repositories (handle gracefully)
- Non-web applications (filter out)
- Apps without clear deployment URLs
- Complex CSS frameworks (basic extraction only)
- Dynamic styling (capture static state only)

## 🔧 Implementation Approach

### Week 1: Foundation
- GitHub OAuth integration
- Basic repository listing
- Database schema setup
- UI wireframes

### Week 2: Style Extraction
- Deployment URL detection
- Screenshot capture system
- Color palette extraction
- Basic style data structure

### Week 3: Integration
- Workspace panel integration
- Style-aware prompt generation
- Testing with real repositories
- Error handling and edge cases

## 📝 Technical Considerations

### Security
- Encrypt GitHub tokens at rest
- Scope permissions to minimum required
- Handle token refresh automatically
- Audit access patterns

### Performance
- Cache extracted styles
- Async style extraction with progress indicators
- Rate limit GitHub API calls
- Optimize screenshot capture

### Scalability
- Queue-based style extraction for heavy processing
- CDN for screenshot storage
- Efficient style data storage
- Background refresh of stale data

## 🔗 Integration Points

### Existing Systems
- **Workspace UI**: Add GitHub panel to existing layout
- **Video Generation**: Enhance prompts with style data
- **Project Management**: Associate repos with projects
- **User Authentication**: Extend with GitHub OAuth

### Future Features
- **Image Analysis**: Combine with uploaded image analysis
- **Prompt Engineering**: Use styles in advanced prompting
- **Component Library**: Generate style-consistent components

## 📊 Success Metrics

- GitHub connection success rate > 95%
- Style extraction success rate > 80%
- User retention after GitHub connection > 60%
- Generated videos using GitHub styles > 40%
- Time from connection to first styled video < 5 minutes 