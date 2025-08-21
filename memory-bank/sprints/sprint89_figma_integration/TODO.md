# TODO: Figma Integration (Sprint 89)

## 🎯 Sprint Goal
Ship Figma integration MVP in 5 days, enhanced features in 10 days

---

## Phase 1: MVP (Days 1-5)

### Day 1: Foundation Setup ⏳
- [ ] **Environment Setup**
  - [ ] Create Figma app at https://www.figma.com/developers/apps
  - [ ] Add environment variables to `.env.local`:
    ```
    FIGMA_CLIENT_ID=
    FIGMA_CLIENT_SECRET=
    FIGMA_OAUTH_CALLBACK_URL=
    ```
  - [ ] Add Figma PAT for initial testing

- [ ] **Database Schema**
  - [ ] Create migration for `figma_connections` table
  - [ ] Create migration for `figma_file_cache` table
  - [ ] Create migration for `figma_imports` table
  - [ ] Run migrations on dev database

- [ ] **Service Structure**
  - [ ] Create `src/server/services/figma/` directory
  - [ ] Create `figma-auth.service.ts`
  - [ ] Create `figma-discovery.service.ts`
  - [ ] Create `figma-converter.service.ts`

- [ ] **Type Definitions**
  - [ ] Create `src/lib/types/figma.types.ts`
  - [ ] Define Figma API response types
  - [ ] Define component catalog types

### Day 2: API Integration ⏳
- [ ] **Authentication**
  - [ ] Implement OAuth flow in `figma-auth.service.ts`
  - [ ] Add PAT authentication option
  - [ ] Store encrypted tokens in database
  - [ ] Add token refresh logic

- [ ] **Figma API Client**
  - [ ] Implement `listTeams()` method
  - [ ] Implement `listProjects(teamId)` method
  - [ ] Implement `listFiles(projectId)` method
  - [ ] Implement `getFile(fileKey)` method
  - [ ] Add rate limiting (1 req/sec per file)

- [ ] **tRPC Router**
  - [ ] Create `src/server/api/routers/figma.router.ts`
  - [ ] Add `connect` mutation
  - [ ] Add `listFiles` query
  - [ ] Add `disconnect` mutation
  - [ ] Wire router to root

### Day 3: Component Indexing ⏳
- [ ] **Pattern Detection**
  - [ ] Port `COMPONENT_PATTERNS` from GitHub service
  - [ ] Adapt patterns for Figma naming conventions
  - [ ] Create Figma-specific scoring algorithm

- [ ] **File Processing**
  - [ ] Implement shallow file fetch (depth=1)
  - [ ] Extract frames and components
  - [ ] Filter by importance score
  - [ ] Group by categories

- [ ] **Catalog Generation**
  - [ ] Create `indexFile(fileKey)` method
  - [ ] Generate component catalog structure
  - [ ] Store catalog in database cache
  - [ ] Add thumbnail URL extraction

- [ ] **API Endpoints**
  - [ ] Add `indexFile` mutation to router
  - [ ] Add `getFileCatalog` query
  - [ ] Add progress tracking for indexing

### Day 4: UI Panel ⏳
- [ ] **Panel Component**
  - [ ] Create `FigmaDiscoveryPanel.tsx`
  - [ ] Add to panel registry in `WorkspaceContentAreaG.tsx`
  - [ ] Add sidebar button in `GenerateSidebar.tsx`

- [ ] **File Browser**
  - [ ] Build tree view for teams/projects/files
  - [ ] Add expand/collapse functionality
  - [ ] Show indexing status per file
  - [ ] Implement file selection

- [ ] **Component Grid**
  - [ ] Display categorized components
  - [ ] Show component thumbnails
  - [ ] Add category filter buttons
  - [ ] Implement search functionality

- [ ] **Visual States**
  - [ ] Not connected state
  - [ ] Loading/indexing state
  - [ ] Empty state (no components)
  - [ ] Error state handling

### Day 5: Chat Integration & Testing ⏳
- [ ] **Drag & Drop**
  - [ ] Make component cards draggable
  - [ ] Add drag preview
  - [ ] Create Figma drop payload structure
  - [ ] Add visual feedback during drag

- [ ] **Chat Input Integration**
  - [ ] Handle Figma component drops
  - [ ] Auto-generate animation prompt
  - [ ] Include Figma metadata in context
  - [ ] Wire to existing generation flow

- [ ] **Basic Conversion**
  - [ ] Create simple Figma-to-Remotion converter
  - [ ] Map basic shapes to React components
  - [ ] Handle text layers
  - [ ] Apply basic positioning

- [ ] **End-to-End Testing**
  - [ ] Test OAuth flow
  - [ ] Test file browsing
  - [ ] Test component indexing
  - [ ] Test drag-to-animate flow
  - [ ] Fix critical bugs

---

## Phase 2: Enhanced Features (Days 6-10)

### Day 6: Advanced Conversion ⏳
- [ ] **Design Token Extraction**
  - [ ] Extract color styles
  - [ ] Extract text styles
  - [ ] Extract effect styles
  - [ ] Map to CSS variables

- [ ] **Complex Elements**
  - [ ] Handle gradients and fills
  - [ ] Process masks and clips
  - [ ] Convert blend modes
  - [ ] Support auto-layout

- [ ] **Vector Processing**
  - [ ] Export as SVG when possible
  - [ ] Optimize path data
  - [ ] Handle boolean operations

### Day 7: Asset Management ⏳
- [ ] **Image Export**
  - [ ] Batch export images from designs
  - [ ] Optimize with compression
  - [ ] Store in R2 bucket
  - [ ] Generate CDN URLs

- [ ] **Font Handling**
  - [ ] Detect used fonts
  - [ ] Map to web fonts
  - [ ] Provide fallbacks
  - [ ] Load Google Fonts

- [ ] **Asset Reference System**
  - [ ] Track all exported assets
  - [ ] Clean up unused assets
  - [ ] Version asset URLs

### Day 8: Motion Templates ⏳
- [ ] **Category-Based Animations**
  - [ ] Auth components: Slide up with fade
  - [ ] Headers: Slide down
  - [ ] Cards: Stagger in
  - [ ] Modals: Scale and fade

- [ ] **Smart Animation Detection**
  - [ ] Analyze component structure
  - [ ] Apply appropriate motion
  - [ ] Respect component hierarchy
  - [ ] Add micro-interactions

- [ ] **Customization**
  - [ ] Allow timing adjustments
  - [ ] Support easing functions
  - [ ] Enable/disable animations
  - [ ] Preview in panel

### Day 9: Caching & Performance ⏳
- [ ] **Multi-Level Cache**
  - [ ] Implement memory cache (5 min TTL)
  - [ ] Database cache (24 hour TTL)
  - [ ] R2 image cache (7 day TTL)
  - [ ] Cache invalidation logic

- [ ] **Performance Optimizations**
  - [ ] Virtual scrolling for large lists
  - [ ] Lazy load thumbnails
  - [ ] Progressive file loading
  - [ ] Background indexing queue

- [ ] **Large File Handling**
  - [ ] Detect file size before fetch
  - [ ] Use pagination for components
  - [ ] Stream processing
  - [ ] Show progress indicators

### Day 10: Webhooks & Polish ⏳
- [ ] **Webhook Setup**
  - [ ] Register webhooks for file updates
  - [ ] Handle FILE_UPDATE events
  - [ ] Handle LIBRARY_PUBLISH events
  - [ ] Implement webhook verification

- [ ] **Auto-Sync**
  - [ ] Detect file changes
  - [ ] Re-index modified files
  - [ ] Notify users of updates
  - [ ] Update cached thumbnails

- [ ] **Polish & Bug Fixes**
  - [ ] Improve error messages
  - [ ] Add loading skeletons
  - [ ] Enhance animations
  - [ ] Fix reported bugs
  - [ ] Update documentation

---

## Phase 3: Advanced Features (Future)

### Figma Plugin 🔮
- [ ] Create plugin scaffold
- [ ] Add motion hint UI
- [ ] Implement tagging system
- [ ] Add batch export
- [ ] Submit for review

### Component Libraries 🔮
- [ ] Track published libraries
- [ ] Handle component instances
- [ ] Version management
- [ ] Cross-file references

### Dev Mode Integration 🔮
- [ ] Connect to MCP server
- [ ] Extract component props
- [ ] Generate TypeScript types
- [ ] Sync with codebase

### Advanced Workflows 🔮
- [ ] Batch import UI
- [ ] Auto-video from file
- [ ] Variant animations
- [ ] Responsive handling

---

## 🐛 Known Issues & Risks

### Technical Risks
- [ ] Rate limiting (1 req/sec per file)
- [ ] Large file timeouts
- [ ] Complex gradient conversion
- [ ] Font availability

### Mitigation Strategies
- [ ] Implement request queue
- [ ] Add timeout handling
- [ ] Simplification fallbacks
- [ ] Font substitution map

---

## 📝 Documentation Tasks

- [ ] Update main README with Figma feature
- [ ] Create Figma setup guide
- [ ] Document API endpoints
- [ ] Add troubleshooting section
- [ ] Create demo video

---

## 🎯 Definition of Done

### MVP Checklist
- [ ] Users can connect Figma account
- [ ] File browser shows all accessible files
- [ ] Components are correctly categorized
- [ ] Drag-to-chat creates valid prompt
- [ ] Basic animation generates successfully
- [ ] No critical bugs
- [ ] Performance acceptable (<10s index time)

### Phase 2 Checklist
- [ ] High-fidelity design conversion
- [ ] All asset types supported
- [ ] Motion templates working
- [ ] Caching improves performance
- [ ] Webhooks keep data fresh
- [ ] Polish complete

---

## 📊 Success Metrics

- **Adoption**: 10+ users connect Figma in first week
- **Quality**: 90%+ design fidelity
- **Performance**: <5s average import time
- **Reliability**: <1% error rate
- **Satisfaction**: Positive user feedback

---

**Sprint Status**: 🟡 Not Started  
**Last Updated**: 2025-01-10  
**Owner**: Development Team