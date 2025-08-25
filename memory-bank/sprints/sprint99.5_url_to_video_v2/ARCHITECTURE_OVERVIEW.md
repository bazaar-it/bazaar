# URL to Video V2 - Architecture Overview

## 🎯 Core Philosophy
**"Film the website, don't imagine it"**

Transform any URL into a 15-30 second motion graphics video that faithfully represents the actual website's design, content, and brand - not a generic interpretation.

## 🏗️ High-Level Pipeline

```mermaid
graph TB
    subgraph "1. Web Extraction (Enhanced)"
        URL[URL Input] --> Extract[Full Page Extraction]
        Extract --> HTML[HTML + DOM]
        Extract --> Screenshots[Desktop Screenshots]
        Extract --> Styles[Computed Styles]
    end
    
    subgraph "2. Brand & Visual Analysis (Enhanced)"
        HTML --> WebAgent[WebAnalysisAgentV4]
        Screenshots --> WebAgent
        Styles --> WebAgent
        WebAgent --> BrandJSON[Rich Brand JSON]
        WebAgent --> VisualAnalysis[Visual Element Classification]
    end
    
    subgraph "3. Story Composition (Existing)"
        BrandJSON --> HeroLLM[Hero's Journey LLM]
        HeroLLM --> ScenePlan[Scene Plan]
    end
    
    subgraph "4. Template Selection (Enhanced)"
        ScenePlan --> Router[Template Router]
        BrandJSON --> Router
        Metadata[Enhanced Metadata] --> Router
        Router --> Templates[Selected Templates + Context]
    end
    
    subgraph "5. Scene Generation via Edit Tool"
        ScenePlan --> Templates[Template Selection]
        Templates --> EditTool[Edit Tool (LLM)]
        BrandJSON --> EditTool
        ScenePlan --> EditTool
        EditTool --> TSXCode[TSX Code for Each Scene]
        TSXCode --> Compile[Remotion Compilation]
        Compile --> Preview[PreviewPanelG]
        Preview --> Project[Project Scenes in DB]
    end
```

## 🏗️ Building on Existing Infrastructure

### What We Already Have (Sprint 99)
- ✅ **WebAnalysisAgentV4** - Brand extraction from URLs
- ✅ **HeroJourneyGenerator** - Narrative creation
- ✅ **TemplateSelector** - Basic template matching
- ✅ **Edit Tool** - Scene code generation
- ✅ **Preview Panel** - Remotion player integration
- ✅ **Templates Registry** - 45+ templates with metadata
- ✅ **Website Pipeline Router** - Orchestration logic

### What We're Enhancing (Building on Sprint 99)
- 🔧 **WebAnalysisAgentV4**: Add evidence tracking & screenshot slicing
- 🔧 **Visual Analysis**: Distinguish photos/illustrations vs UI elements with rebuild-ready descriptions
- 🔧 **BrandJSON Schema**: Add evidence fields, confidence scores & visual element types
- 🔧 **Template Metadata**: Add technical requirements & capability manifests
- 🔧 **Template Router**: Implement metadata-driven selection with UI template preference
- 🔧 **Edit Tool Context**: Inject brand context & rebuild-ready UI descriptions
- 🔧 **PreviewPanelG**: Optimize compilation & error handling

## 📊 Key Differences from V1

| Aspect | V1 (Current) | V2 (Enhanced) |
|--------|--------------|---------------|
| **Extraction** | Basic HTML + 1-2 screenshots | Full page screenshots + sections + computed styles |
| **Visual Analysis** | No distinction | Photos/illustrations vs UI elements classified |
| **UI Descriptions** | Generic/vague | Rebuild-ready with precise layout/styling |
| **Analysis** | Single pass extraction | Multi-pass with evidence tracking |
| **Brand Data** | ~25% utilization | 100% evidence-based |
| **Scene Planning** | Generic Hero's Journey | Section-aware composition |
| **Template Selection** | Random/keyword matching | Metadata-driven + UI template preference |
| **Edit Tool Context** | Minimal brand awareness | Full brand context + rebuild instructions |
| **Fidelity** | ~40% match to original | ~90% match to original |
| **Duration** | 60-90s | 15-30s focused |
| **Output** | Rendered video file | TSX scenes in PreviewPanelG (no rendering) |

## 🔄 Data Flow

```
URL
 ↓
ExtractionPayload {
  html: string
  screenshots: Array<{id, path, bbox}>
  styles: ComputedStyles
  metadata: PageMeta
}
 ↓
BrandJSON {
  sections: Section[] // Natural page divisions
  visualElements: {
    photos: Photo[] // Images with one-line message
    uiComponents: UIComponent[] // Rebuild-ready descriptions
  }
  palette: Color[] // Extracted colors
  fonts: Font[] // Actual fonts used
  voice: string[] // Detected tone
}
 ↓
ScenePlan[] {
  sceneId: string
  purpose: 'hook'|'problem'|'solution'|etc
  sourceRefs: string[] // Links to BrandJSON
  duration: number
  templateCandidates: string[]
}
 ↓
TemplateSelection {
  templateId: string  // From registry (UI templates preferred)
  metadata: TemplateMetadata
  requirements: TemplateRequirements
  templateType: 'ui' | 'text' | 'animation'
}
 ↓
EditToolInput {
  tsxCode: string  // Template code
  userPrompt: string  // Scene requirements
  webContext: BrandJSON  // Brand data
  imageUrls: string[]  // Screenshots
}
 ↓
TSXCode[] (1-n scenes)
 ↓
RemotionCompilation (validates & builds)
 ↓
PreviewPanelG (displays in Remotion Player)
 ↓
Project Scenes (stored in DB via videoState)
```

## 🎯 Design Principles

### 1. Evidence-Based Everything
- Every claim in BrandJSON must have `sourceRefs[]` pointing to screenshots/DOM
- No hallucinated UI elements or copy
- Confidence scores on extracted data

### 2. Visual Element Classification
- **Photos/Illustrations**: Extract one-line message they communicate
- **UI Elements**: Precise, rebuild-ready descriptions (layout, styling, icons)
- Clear distinction between decorative and functional elements

### 3. Faithful Representation
- UI elements match exactly (not "similar to")
- Colors and fonts preserved or mapped deterministically
- Copy is verbatim, never paraphrased
- Rebuild-ready descriptions for accurate recreation

### 4. Template Selection Intelligence
- **UI Template Preference**: When UI references exist, prefer UI animation templates
- **Capability Matching**: Templates selected by what they can do, not keywords
- **Type-Based Routing**: UI elements → UI templates, Photos → Visual templates

### 5. Deterministic Pipeline
- Same URL → Same video structure (with minor variations)
- Style-lock manifest ensures consistency
- Capability-based template matching (not random)

### 6. Quality Gates
- Pre-render validation (contrast, CTA presence, evidence)
- Fidelity scoring per scene
- Fallback strategies for missing data

## 🚀 Implementation Phases

### Phase 1: Core Pipeline (Week 1)
- [ ] Web Extractor with Playwright
- [ ] BrandJSON schema and analyzer
- [ ] Basic Hero's Journey composer
- [ ] Template capability manifests

### Phase 2: Fidelity (Week 2)
- [ ] Evidence tracking system
- [ ] Style-lock manifest
- [ ] Computed styles extraction
- [ ] Font fallback mapping

### Phase 3: Polish (Week 3)
- [ ] Quality gates
- [ ] Inspector UI
- [ ] Performance optimization
- [ ] Error recovery

## 📈 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Fidelity Score** | >85% | % of elements matching source |
| **Processing Time** | <60s | End-to-end pipeline |
| **Template Match Rate** | >95% | Successful template selection |
| **Render Success** | >90% | Videos without errors |
| **Brand Accuracy** | >90% | Colors/fonts/copy matching |

## 🔧 Technical Stack

### Existing Infrastructure (Sprint 99 Foundation)
- ✅ **Edit Tool**: `/src/tools/edit/edit.ts` - Already accepts TSX code & context
- ✅ **PreviewPanelG**: `/src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx` - Displays scenes
- ✅ **Templates Registry**: `/src/templates/registry.ts` - 45+ ready templates
- ✅ **Template Metadata**: `/src/templates/metadata.ts` - Partially enhanced in Sprint 99
- ✅ **WebAnalysisAgentV4**: `/src/tools/webAnalysis/WebAnalysisAgentV4.ts` - Brand extraction working
- ✅ **Hero's Journey**: `/src/tools/narrative/herosJourney.ts` - Scene planning functional
- ✅ **Template Selector**: `/src/server/services/website/template-selector.ts` - Basic matching
- ✅ **Website Pipeline**: `/src/tools/website/websiteToVideoHandler.ts` - Orchestration

### Components to Enhance (Not Build from Scratch)
- **WebAnalysisAgentV4**: Add evidence tracking to existing extraction
- **Template Metadata**: Complete capability manifests for all 45 templates
- **Template Selector**: Upgrade from basic to metadata-driven routing
- **Edit Tool Prompts**: Add conditional context injection logic
- **BrandDataAdapter**: Map evidence to Edit tool context
- **PreviewPanelG**: Optimize scene compilation pipeline

## 🎬 Example Output

For a fintech homepage:
1. **Hook (4s)**: Hero with exact headline + CTA
2. **Problem (3s)**: Pain points from features section
3. **Solution (5s)**: Product UI from screenshots
4. **Features (6s)**: Feature cards grid
5. **Social Proof (4s)**: Logo marquee + testimonial
6. **CTA (3s)**: Pricing + signup button

Total: 25s of brand-accurate TSX scenes displayed in PreviewPanelG

## Key Implementation Notes

### No Video Rendering
- The pipeline outputs TSX code, not rendered videos
- PreviewPanelG displays scenes using Remotion Player
- Users can export videos separately if needed

### Building on Sprint 99
- We're enhancing existing components, not creating new ones
- Focus on metadata enhancement and evidence tracking
- The core pipeline already works - we're improving fidelity