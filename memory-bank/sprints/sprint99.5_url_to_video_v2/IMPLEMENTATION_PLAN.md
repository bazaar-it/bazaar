# URL to Video V2 - Implementation Plan

## Overview
Enhance the existing URL-to-video pipeline (Sprint 99) to achieve ~90% fidelity through evidence-based extraction, metadata-driven template selection, and brand-aware scene generation.

## Existing Infrastructure We're Building On

### Already Implemented (Sprint 99)
- ✅ `/src/tools/webAnalysis/WebAnalysisAgentV4.ts` - Brand extraction
- ✅ `/src/tools/narrative/herosJourney.ts` - Story creation
- ✅ `/src/server/services/website/template-selector.ts` - Basic selection
- ✅ `/src/tools/edit/edit.ts` - Scene generation tool
- ✅ `/src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx` - Player
- ✅ `/src/templates/registry.ts` - 45+ templates
- ✅ `/src/templates/metadata.ts` - Template metadata system

## Phase 1: Enhanced Extraction (Week 1) 🏗️

### Day 1-2: Enhance WebAnalysisAgent
```typescript
// Enhance /src/tools/webAnalysis/WebAnalysisAgentV4.ts
class EnhancedWebAnalysisAgent extends WebAnalysisAgentV4 {
  // Add to existing extraction:
  // 1. Full-page screenshot slicing
  // 2. Section-based captures
  // 3. Element-level screenshots
  // 4. Computed styles extraction
  // 5. Evidence tracking for all claims
}
```

**Tasks:**
- [ ] Set up Playwright with proper viewport (1920x1080 @2x)
- [ ] Implement full-page screenshot with slicing
- [ ] Add section detection using DOM landmarks
- [ ] Extract computed styles for key elements
- [ ] Handle cookie walls and overlays
- [ ] Add retry logic and error handling
- [ ] Store screenshots in R2/S3

**Files to create:**
```
/src/server/services/extraction/
├── webExtractor.ts
├── screenshotService.ts
├── styleExtractor.ts
├── domAnalyzer.ts
└── types.ts
```

### Day 3-4: Enhance Brand & Visual Analysis
```typescript
// Enhance existing extraction with evidence tracking and visual classification
interface BrandJSONWithEvidence extends BrandJSON {
  sections: Array<Section & {
    evidence: {
      screenshotId: string
      domSelector?: string
      confidence: number
    }
    visualElements: {
      photos: Array<{id: string, message: string}>
      uiComponents: Array<{
        id: string
        type: string
        rebuildSpec: RebuildSpec
      }>
    }
  }>
}
```

**Tasks:**
- [ ] Enhance BrandJSON schema with evidence tracking
- [ ] Add visual element classification (photos vs UI)
- [ ] Generate rebuild-ready UI descriptions
- [ ] Add multi-pass validation to WebAnalysisAgent
- [ ] Implement confidence scoring
- [ ] Add section detection using DOM landmarks
- [ ] Extract UI components with precise rebuild specs
- [ ] Validate all claims have evidence

**Files to enhance:**
```
/src/tools/webAnalysis/
├── WebAnalysisAgentV4.ts (add evidence)
├── types.ts (add evidence interfaces)
└── brandDataAdapter.ts (enhance mapping)
```

### Day 5: Database Schema
```sql
-- New tables for V2 pipeline
CREATE TABLE extraction_jobs (
  id UUID PRIMARY KEY,
  url TEXT NOT NULL,
  status VARCHAR(50),
  extraction_payload JSONB,
  created_at TIMESTAMP
);

CREATE TABLE brand_analysis (
  id UUID PRIMARY KEY,
  extraction_id UUID REFERENCES extraction_jobs(id),
  brand_json JSONB,
  confidence FLOAT,
  created_at TIMESTAMP
);

CREATE TABLE scene_plans (
  id UUID PRIMARY KEY,
  brand_id UUID REFERENCES brand_analysis(id),
  scenes JSONB,
  total_duration INT,
  created_at TIMESTAMP
);

CREATE TABLE edit_instructions (
  id UUID PRIMARY KEY,
  scene_plan_id UUID REFERENCES scene_plans(id),
  instructions JSONB,
  created_at TIMESTAMP
);
```

**Tasks:**
- [ ] Create migration files
- [ ] Add Drizzle schemas
- [ ] Create repository classes
- [ ] Add indexes for performance

## Phase 2: Intelligence (Week 2) 🧠

### Day 6-7: Enhance Hero's Journey
```typescript
// Enhance /src/tools/narrative/herosJourney.ts
interface EnhancedScenePlan extends ScenePlan {
  sources: {
    sectionIds: string[]  // From BrandJSON
    componentIds: string[]
    screenshotIds: string[]
  }
  templateCandidates: string[]  // From registry
}
```

**Tasks:**
- [ ] Add source reference system to scenes
- [ ] Implement section-aware composition
- [ ] Add duration allocation (15-30s total)
- [ ] Link scenes to BrandJSON evidence
- [ ] Add template candidate selection

**Files to enhance:**
```
/src/tools/narrative/
├── herosJourney.ts (add source refs)
└── types.ts (enhance interfaces)
```

### Day 8-9: Template Router System with UI Preference
```typescript
// Enhance /src/server/services/website/template-selector.ts
class EnhancedTemplateRouter {
  async routeTemplate(
    scene: ScenePlan,
    registry: TemplateRegistry,
    metadata: TemplateMetadata
  ): TemplateSelection {
    // 1. Check for UI elements in scene
    // 2. Prefer UI templates when UI refs exist
    // 3. Filter by technical requirements
    // 4. Score by metadata match
    // 5. Select best template (UI templates get bonus)
    // 6. Prepare Edit tool context with rebuild specs
  }
}
```

**Tasks:**
- [ ] Enhance template metadata for all 45+ templates
- [ ] Add template type classification (ui/text/animation)
- [ ] Implement UI template preference logic
- [ ] Add technical requirements to metadata
- [ ] Implement capability-based scoring with UI bonus
- [ ] Create Edit tool context builder with rebuild specs
- [ ] Add fallback template strategies

**Files to enhance:**
```
/src/templates/
├── metadata.ts (enhance all entries)
├── registry.ts (add requirements)
/src/server/services/website/
└── template-selector.ts (enhance routing)
```

### Day 10: Style Lock System
```typescript
// /src/server/services/style/styleLock.ts
class StyleLockService {
  async createManifest(brandJson: BrandJSON): Promise<StyleManifest> {
    // 1. Extract design tokens
    // 2. Map fonts to available
    // 3. Create color palette
    // 4. Lock spacing system
    // 5. Generate manifest
  }
}
```

**Tasks:**
- [ ] Build font mapping system
- [ ] Create color normalization
- [ ] Implement fallback strategies
- [ ] Add validation rules

## Phase 3: Execution (Week 3) ⚡

### Day 11-12: Edit Tool Enhancement with Rebuild Specs
```typescript
// Enhance /src/tools/edit/edit.ts context handling
interface EnhancedEditContext {
  visualElements?: {
    photos?: Array<{url: string, message: string}>
    uiComponents?: Array<{
      type: string
      rebuildSpec: RebuildSpec
    }>
  }
  tsxCode: string  // Template code
  userPrompt: string  // Scene requirements
  webContext: {
    originalUrl: string
    pageData: BrandJSONWithEvidence
  }
  imageUrls: string[]  // Screenshot URLs with bbox
  referenceScenes?: Scene[]  // For style consistency
}
```

**Tasks:**
- [ ] Enhance Edit tool context handling
- [ ] Add evidence-based content injection
- [ ] Improve brand style application
- [ ] Add screenshot cropping support
- [ ] Implement style consistency across scenes

### Day 13-14: Preview Panel Integration
```typescript
// Enhance /src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx
interface ScenePreviewState {
  scenes: TSXScene[]
  currentScene: number
  isCompiling: boolean
  errors: CompilationError[]
}
```

**Tasks:**
- [ ] Enhance scene compilation handling
- [ ] Add progress indicators for generation
- [ ] Improve error display and recovery
- [ ] Add scene navigation controls
- [ ] Optimize Remotion player performance

### Day 15: Quality Assurance
```typescript
// /src/server/services/quality/qualityGates.ts
class QualityGateService {
  async validate(pipeline: PipelineState): Promise<ValidationResult> {
    // 1. Check contrast ratios
    // 2. Verify text readability
    // 3. Validate asset resolution
    // 4. Check timing constraints
    // 5. Score fidelity
  }
}
```

**Tasks:**
- [ ] Implement contrast checking
- [ ] Add readability scoring
- [ ] Build asset validation
- [ ] Create timing checks
- [ ] Generate quality reports

## Phase 4: Integration (Week 4) 🔌

### Day 16-17: API Endpoints
```typescript
// /src/server/api/routers/urlToVideoV2.ts
export const urlToVideoV2Router = createTRPCRouter({
  startPipeline: protectedProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ input }) => {
      // Start extraction job
    }),
    
  getJobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      // Return job progress
    }),
    
  getPreview: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      // Return preview frames
    })
});
```

**Tasks:**
- [ ] Create tRPC router
- [ ] Add job queue system
- [ ] Implement SSE for progress
- [ ] Build preview system
- [ ] Add error handling

### Day 18-19: Inspector UI
```tsx
// /src/app/inspector/page.tsx
export default function InspectorPage() {
  return (
    <div>
      {/* Extraction viewer */}
      {/* BrandJSON explorer */}
      {/* Scene plan editor */}
      {/* Template matcher */}
      {/* Preview player */}
    </div>
  );
}
```

**Tasks:**
- [ ] Create inspection interface
- [ ] Add BrandJSON viewer
- [ ] Build scene plan editor
- [ ] Implement preview player
- [ ] Add quality metrics display

### Day 20: Migration & Testing
**Tasks:**
- [ ] Migrate existing URL endpoint
- [ ] Add feature flags
- [ ] Create test suite
- [ ] Run performance tests
- [ ] Document API changes

## Deliverables Checklist

### Core Services ✅
- [ ] WebExtractorService
- [ ] BrandAnalyzerService
- [ ] SceneComposerService
- [ ] TemplateMatcherService
- [ ] EditProcessorService
- [ ] RenderOrchestratorService
- [ ] QualityGateService

### Data Models ✅
- [ ] ExtractionPayload schema
- [ ] BrandJSON schema
- [ ] ScenePlan schema
- [ ] EditInstruction schema
- [ ] TemplateManifest schema

### Infrastructure ✅
- [ ] Database migrations
- [ ] R2/S3 storage setup
- [ ] Lambda configuration
- [ ] Queue system
- [ ] Monitoring

### User Interfaces ✅
- [ ] API endpoints
- [ ] Inspector UI
- [ ] Progress tracking
- [ ] Error reporting

## Success Criteria

### Fidelity Metrics
- [ ] 85%+ elements match source
- [ ] 90%+ colors preserved
- [ ] 95%+ text verbatim
- [ ] 100% evidence-based

### Performance Metrics
- [ ] <15s extraction
- [ ] <10s analysis
- [ ] <5s composition
- [ ] <20s rendering
- [ ] <60s total

### Quality Metrics
- [ ] 4.5:1+ contrast ratios
- [ ] 0 hallucinated elements
- [ ] 100% source attribution
- [ ] 90%+ template match rate

## Risk Mitigation

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Screenshot failures | High | Multiple capture strategies, fallbacks |
| LLM hallucination | High | Evidence requirements, validation |
| Template mismatch | Medium | Capability manifests, generic fallbacks |
| Render failures | Medium | Retry logic, progressive rendering |
| Performance issues | Low | Caching, parallelization, optimization |

### Business Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Copyright concerns | High | Only capture public content, attribution |
| Rate limiting | Medium | Implement queuing, respect robots.txt |
| Cost overruns | Medium | Monitor usage, implement limits |
| Quality issues | Low | Quality gates, preview system |

## Next Steps

### Immediate (This Week)
1. Set up Playwright extraction
2. Create BrandJSON schema
3. Build basic analyzer
4. Test with 5 sample sites

### Short Term (Next 2 Weeks)
1. Complete Phase 1 & 2
2. Integrate with existing pipeline
3. Run A/B tests
4. Gather feedback

### Long Term (Next Month)
1. Complete all phases
2. Deploy to production
3. Monitor metrics
4. Iterate based on usage

## Resources Needed

### Technical
- Playwright licenses
- GPT-4V API access
- Lambda compute budget
- R2/S3 storage quota

### Human
- 1 Senior engineer (full-time)
- 1 Frontend developer (part-time)
- 1 Designer (consulting)
- 1 QA tester (week 3-4)

## Appendix: File Structure

```
/src/server/services/v2/
├── extraction/
│   ├── webExtractor.ts
│   ├── screenshotService.ts
│   └── styleExtractor.ts
├── analysis/
│   ├── brandAnalyzer.ts
│   ├── sectionDetector.ts
│   └── componentExtractor.ts
├── composition/
│   ├── sceneComposer.ts
│   ├── storyTemplates.ts
│   └── durationAllocator.ts
├── matching/
│   ├── templateMatcher.ts
│   ├── templateManifests.ts
│   └── scoringEngine.ts
├── editing/
│   ├── editProcessor.ts
│   ├── bindingGenerator.ts
│   └── styleInjector.ts
├── rendering/
│   ├── renderOrchestrator.ts
│   ├── sceneProcessor.ts
│   └── audioMixer.ts
├── quality/
│   ├── qualityGates.ts
│   ├── contrastChecker.ts
│   └── fidelityScorer.ts
└── shared/
    ├── types.ts
    ├── schemas.ts
    └── constants.ts
```