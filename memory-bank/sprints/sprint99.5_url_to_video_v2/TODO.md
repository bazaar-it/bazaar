# URL to Video V2 - Implementation TODO

## ✅ COMPLETED (As of 2025-08-25)

### Extraction & Analysis Infrastructure
- [x] WebAnalysisAgentV4 working in production
- [x] Full page screenshot capture (9MB+ screenshots working)
- [x] Hero/viewport screenshot capture
- [x] R2 storage integration for screenshots
- [x] BrandAnalyzerV2 comprehensive analysis with GPT-4.1-mini
- [x] Visual analysis extraction (TEXT_CONTENT, BRAND_IDENTITY, UI_COMPONENTS, etc.)
- [x] Database storage for extractions
- [x] Extraction Lab UI at `/admin/extraction-lab`
- [x] Copy button for one-click JSON copying
- [x] Saved extractions history with load functionality
- [x] Story arc generation from saved extractions
- [x] Tested on real sites: Vercel, Ramp (85% confidence)

### Testing Infrastructure
- [x] Created 10 real integration tests (not mock tests)
- [x] Fixed WebAnalysisAgentV4 interface issues
- [x] Test structure for web extraction, visual classification, template selection
- [x] End-to-end pipeline tests
- [x] Fidelity scoring tests

## 🚨 Immediate (Today/Tomorrow)

### Setup & Infrastructure
- [x] ~~Create `/src/server/services/v2/` directory structure~~ (using existing structure)
- [x] ~~Install Playwright~~ (using playwright-core)
- [x] ~~Set up Playwright configuration~~ (using Browserless)
- [ ] Create base service classes with error handling
- [x] ~~Set up R2/S3 bucket for V2 screenshots~~ (using existing R2)

### Proof of Concept
- [x] ~~Build minimal web extractor that captures full page screenshot~~ ✅
- [x] ~~Test extraction on 3 sample sites~~ (Vercel, Ramp tested)
- [x] ~~Verify screenshot quality and coverage~~ ✅
- [x] ~~Create simple viewer to inspect extractions~~ (Extraction Lab)

## 🎯 NEXT STEPS (Priority Order)

### 1. Logo Extraction (✅ COMPLETED)
- [x] Added comprehensive logo extraction to WebAnalysisAgentV4
- [x] Supports IMG, SVG, and background-image logos
- [x] Falls back to favicon if no logo found
- [x] Includes dimensions, alt text, and type information
- [x] Updated ExtractedBrandDataV4 type definition

### 2. Fix Visual Element Classification
- [ ] Update BrandAnalyzerV2 to properly classify photos vs UI components
- [ ] Add rebuild-ready UI descriptions (layout, styling, components)
- [ ] Extract one-line messages for photos/illustrations
- [ ] Improve visual element extraction in GPT-4 prompt

### 2. Enhanced Scene Composition
- [ ] Connect story arc generation to actual video generation
- [ ] Implement scene-to-template matching with UI preference
- [ ] Add duration allocation logic
- [ ] Build source reference system (link scenes to BrandJSON evidence)

### 3. Template Matching with UI Preference  
- [ ] Create template capability manifests
- [ ] Implement UI template preference when UI refs exist
- [ ] Build scoring algorithm with UI template bonus
- [ ] Create binding generator with rebuild specs

### 4. Integration with Generation Pipeline
- [ ] Connect extraction results to generation tools
- [ ] Pass brand data to scene composition
- [ ] Use extracted colors/fonts in generated scenes
- [ ] Implement "film the website" approach

## 📅 Week 1: Foundation (Partially Complete)

### Day 1-2: Web Extraction
- [ ] Implement `WebExtractorService` class
- [ ] Add viewport configuration (1920x1080 @2x)
- [ ] Implement full-page screenshot with slicing
- [ ] Add section detection using DOM landmarks
- [ ] Create element crop extraction (CTAs, logos, cards)
- [ ] Add computed styles extraction
- [ ] Implement cookie/modal hiding without interaction
- [ ] Add lazy loading handler (scroll + wait)
- [ ] Create retry logic with exponential backoff
- [ ] Store screenshots in R2 with proper naming

### Day 3-4: Brand & Visual Analysis
- [ ] Create `BrandAnalyzerService` class
- [ ] Define BrandJSON schema with evidence tracking
- [ ] Implement Pass 1: Structure detection
- [ ] Implement Pass 2: Content extraction (verbatim only)
- [ ] Implement Pass 3: Visual analysis with element classification
- [ ] Add visual element classifier (photos vs UI components)
- [ ] Generate rebuild-ready UI descriptions (layout, styling, components)
- [ ] Extract one-line messages for photos/illustrations
- [ ] Add evidence validation (remove unevidenced claims)
- [ ] Build confidence scoring system
- [ ] Create section detector using DOM + screenshots
- [ ] Implement UI component extractor with rebuild specs
- [ ] Add color palette extraction from screenshots + CSS

### Day 5: Database & Storage
- [ ] Create database migration for V2 tables
- [ ] Add Drizzle schemas for new tables
- [ ] Create repository classes for CRUD operations
- [ ] Add indexes for performance
- [ ] Set up job queue table
- [ ] Implement artifact storage pattern

## 📅 Week 2: Intelligence

### Day 6-7: Scene Composition
- [ ] Create `SceneComposerService` class
- [ ] Define story arc templates (hook → problem → solution → etc)
- [ ] Implement scene planning algorithm
- [ ] Add duration allocation logic (15-30s total)
- [ ] Build source reference system (link scenes to BrandJSON)
- [ ] Create content selection algorithm
- [ ] Add scene validation (one key message per scene)
- [ ] Implement fallback strategies for missing content

### Day 8-9: Template Matching with UI Preference
- [ ] Create `TemplateMatcherService` class
- [ ] Define capability manifests for existing templates
- [ ] Add template type classification (ui/text/animation)
- [ ] Implement UI template preference when UI refs exist
- [ ] Implement requirement filtering (hard constraints)
- [ ] Build scoring algorithm with UI template bonus
- [ ] Create binding generator with rebuild specs
- [ ] Add validation checks (contrast, readability)
- [ ] Implement fallback template selection
- [ ] Create template manifest registry

### Day 10: Style Lock
- [ ] Create `StyleLockService` class
- [ ] Build font mapping system (actual → available)
- [ ] Implement color normalization
- [ ] Create spacing system extractor
- [ ] Add style manifest generator
- [ ] Build fallback strategies for unavailable fonts
- [ ] Create validation rules

## 📅 Week 3: Execution

### Day 11-12: Edit Processing with Rebuild Specs
- [ ] Create `EditProcessorService` class
- [ ] Implement binding application with UI rebuild specs
- [ ] Add visual element context injection
- [ ] Process rebuild-ready UI descriptions
- [ ] Add style injection into templates
- [ ] Create transition configuration
- [ ] Build validation pipeline
- [ ] Add error recovery for failed bindings
- [ ] Implement preview frame generation

### Day 13-14: Render Pipeline
- [ ] Create `RenderOrchestratorService` class
- [ ] Set up Remotion Lambda configuration
- [ ] Implement scene rendering queue
- [ ] Add progress tracking with SSE
- [ ] Build scene concatenation logic
- [ ] Add background music selection
- [ ] Implement final export pipeline
- [ ] Create render artifact storage

### Day 15: Quality Gates
- [ ] Create `QualityGateService` class
- [ ] Implement contrast ratio checker
- [ ] Add text readability scorer
- [ ] Build asset resolution validator
- [ ] Create timing constraint checks
- [ ] Implement fidelity scoring
- [ ] Add pre-render blocking conditions
- [ ] Create quality report generator

## 📅 Week 4: Integration

### Day 16-17: API Development
- [ ] Create tRPC router for V2 endpoints
- [ ] Implement `startPipeline` mutation
- [ ] Add `getJobStatus` query
- [ ] Create `getPreview` query
- [ ] Implement SSE for real-time progress
- [ ] Add error handling and retries
- [ ] Create rate limiting
- [ ] Build API documentation

### Day 18-19: Inspector UI
- [ ] Create `/app/inspector/[jobId]/page.tsx`
- [ ] Build extraction result viewer
- [ ] Create BrandJSON explorer with evidence links
- [ ] Add scene plan editor
- [ ] Implement template match viewer
- [ ] Build preview player with timeline
- [ ] Add quality metrics dashboard
- [ ] Create error log viewer

### Day 20: Testing & Migration
- [ ] Create comprehensive test suite
- [ ] Add integration tests for full pipeline
- [ ] Implement feature flags for V2
- [ ] Create A/B testing framework
- [ ] Build migration tools for V1 → V2
- [ ] Add performance benchmarks
- [ ] Create rollback procedures
- [ ] Document breaking changes

## 🧪 Testing Checklist

### Component Tests (Existing + Enhanced)
- [ ] WebAnalysisAgentV4 (enhanced with visual classification)
- [ ] template-selector.ts (enhanced with UI preference)
- [ ] Edit tool context injection with rebuild specs
- [ ] PreviewPanelG compilation
- [ ] Template metadata completeness
- [ ] Evidence tracking validation
- [ ] Visual element classification accuracy
- [ ] UI template preference logic

### Integration Tests
- [ ] Full pipeline flow
- [ ] Error recovery
- [ ] Fallback strategies
- [ ] Performance benchmarks

### Sample Sites for Testing
- [ ] Fintech: stripe.com, ramp.com
- [ ] SaaS: notion.so, linear.app
- [ ] Ecommerce: allbirds.com, warbyparker.com
- [ ] Developer: vercel.com, railway.app
- [ ] Healthcare: headspace.com, ro.co

## 📊 Monitoring Setup

- [ ] Add Sentry error tracking
- [ ] Implement performance monitoring
- [ ] Create pipeline metrics dashboard
- [ ] Add quality score tracking
- [ ] Set up alerting for failures
- [ ] Create usage analytics

## 📚 Documentation

- [ ] API documentation with examples
- [ ] Pipeline architecture diagram
- [ ] Troubleshooting guide
- [ ] Migration guide from V1
- [ ] Template manifest guide
- [ ] Quality standards document

## 🚀 Launch Checklist

### Pre-Launch
- [ ] All tests passing
- [ ] Performance targets met (<60s)
- [ ] Quality gates implemented
- [ ] Error handling complete
- [ ] Documentation complete

### Soft Launch
- [ ] Deploy to staging
- [ ] Internal team testing
- [ ] Fix critical issues
- [ ] Gather feedback

### Beta Launch
- [ ] Feature flag to 10% users
- [ ] Monitor metrics
- [ ] Gather user feedback
- [ ] Iterate on issues

### Full Launch
- [ ] Gradual rollout to 100%
- [ ] Deprecate V1 endpoints
- [ ] Migration complete
- [ ] Success metrics achieved

## 🎯 Success Criteria

Must achieve before full launch:
- [ ] 85%+ fidelity score on test sites
- [ ] <60s average processing time
- [ ] <5% error rate
- [ ] 90%+ template match success
- [ ] 100% evidence-based content
- [ ] 4.5:1+ contrast ratios
- [ ] Zero hallucinated content

## 📊 Current Status Summary

### ✅ What's Working Well
- **Web extraction**: Screenshots capture full page + hero perfectly
- **Brand analysis**: GPT-4.1-mini extracting comprehensive data
- **Logo extraction**: NEW - Comprehensive logo extraction with multiple strategies
- **Database storage**: All extractions saved and retrievable  
- **UI improvements**: Copy button, history, story arc generation
- **Testing setup**: Real integration tests created (need infrastructure)

### ⚠️ Areas Needing Work
- **Visual elements**: Not properly classified (photos vs UI components)
- **Evidence tracking**: Need to link content back to screenshots
- **Scene generation**: Story arcs created but not connected to video generation
- **Template matching**: No UI preference system implemented yet
- **Integration**: Extraction not yet feeding into generation pipeline

### 🔥 Critical Path
1. **Fix visual classification** → enables UI template preference
2. **Connect to generation** → makes extraction useful for videos
3. **Evidence linking** → ensures no hallucination
4. **Template matching** → selects appropriate templates based on content

## 📝 Notes

- ✅ POC validated - extraction approach works!
- ⚠️ Evidence tracking partially implemented
- ✅ Quality visible via confidence scores
- ✅ V1 still running in parallel
- ✅ Decisions documented in memory bank

---

**Updated Priority Order**:
1. ✅ Web extraction (foundation) - DONE
2. 🟨 Brand analysis (intelligence) - 70% complete
3. 🟨 Scene composition (storytelling) - 40% complete  
4. ❌ Template matching (visual) - Not started
5. ❌ Integration - Not started

**Remember**: Evidence-based, deterministic, high-fidelity. No hallucinations, no random selections, no generic content.