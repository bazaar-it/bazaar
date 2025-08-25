# Sprint 99.5: Comprehensive Test Strategy
## URL to Video V2 - "Film the website, don't imagine it"

**Mission**: Create a 100-test production-ready validation suite that ensures 85%+ fidelity through evidence-based extraction, visual element classification, and UI template preference.

---

## 🎯 Production Readiness Criteria

**When these 168 tests are 100% passing, Sprint 99.5 is production-ready.**

### Core Success Metrics
- **Fidelity Score**: 85%+ elements match source website
- **Processing Time**: <60s end-to-end
- **Evidence Coverage**: 100% claims have source references
- **UI Template Accuracy**: 95%+ correct UI vs text template selection
- **Visual Classification**: 90%+ accurate photo vs UI distinction
- **Brand Consistency**: 90%+ colors and fonts preserved

---

## 📊 Test Architecture Overview

### Test Categories (168 Total Tests)
- **Golden Dataset Tests**: 68 tests - Baseline validation on real sites
- **Golden Strict Tests**: 68 tests - Exact validation after manual verification
- **Unit Tests**: 20 tests - Individual component validation
- **Integration Tests**: 8 tests - Component interaction validation
- **Performance Tests**: 4 tests - Speed and efficiency validation

---

## 🎯 Golden Dataset Testing Framework

### 68-Site Production Validation Suite
Building on the proven JSON-based golden dataset approach with **68 well-known software sites** across all major verticals:

**Verticals Covered**:
- **Fintech** (15 sites): Stripe, Ramp, Revolut, Brex, Mercury, Wise, Monzo, etc.
- **Productivity** (18 sites): Linear, Notion, Airtable, Asana, Monday.com, etc.
- **Design** (4 sites): Figma, Framer, Webflow, Canva
- **DevTools** (12 sites): Vercel, Netlify, GitHub, GitLab, Supabase, etc.
- **Analytics** (7 sites): PostHog, Segment, Amplitude, Mixpanel, Hotjar, etc.
- **HR** (6 sites): Rippling, Deel, Gusto, Personio, Remote, etc.
- **Security** (4 sites): Okta, Auth0, 1Password, Dashlane
- **Commerce** (2 sites): Shopify, Squarespace

### Baseline vs Strict Validation

#### Phase 1: Baseline Checks (Immediate Implementation)
```typescript
interface BaselineExpectations {
  hero: {
    require_headline: true
    min_ctas: 1
  }
  sections: {
    require_any_of: ["features", "benefits", "testimonials", "pricing", "cta"]
  }
  style: {
    require_palette: true
    require_typography: true
  }
}
```

#### Phase 2: Strict Validation (After Manual Verification)
```typescript
interface StrictExpectations {
  hero_headline_regex: string
  cta_labels_anyof: string[]
  primary_color_hex_anyof: string[]
  font_families_anyof: string[]
  min_feature_cards: number
  has_pricing: boolean
  has_testimonials: boolean
  logo_row_min: number
}
```

### Automated Scoring System
```typescript
interface GoldenDatasetScorer {
  // Baseline scoring (100 points total)
  hero_headline_present: 25      // BrandJSON.sections[hero].content.headline exists with Evidence
  cta_minimum: 15                // Button(s) ≥ min_ctas in hero (Evidence+href)
  section_detection: 30          // At least one required section parsed with components
  palette_present: 15            // Style-Lock palette defined with ≥ primary + text
  typography_present: 15         // Style-Lock typography (headings + body) detected
  
  // Enhanced V2 scoring (additional 100 points)
  visual_classification: 20      // Photos vs UI elements correctly classified
  ui_template_preference: 20     // UI templates selected when UI elements present
  evidence_coverage: 20          // 100% content has source references
  rebuild_spec_quality: 20       // UI descriptions are rebuild-ready
  brand_fidelity: 20            // Colors/fonts match source within tolerance
}
```

### Implementation Workflow

#### 1. Immediate Baseline Testing (68 Tests)
```bash
# Run baseline validation on all 68 sites
npm run test:golden-baseline

# Expected output:
# ✅ stripe.com: 85/100 (hero: 25, cta: 15, sections: 20, palette: 15, typography: 10)
# ✅ figma.com: 90/100 (hero: 25, cta: 15, sections: 30, palette: 15, typography: 5)
# ❌ notion.so: 60/100 (hero: 0, cta: 15, sections: 30, palette: 15, typography: 0)
```

#### 2. Progressive Golden Standard Creation
```typescript
// Admin workflow for creating golden standards:
// 1. Run extraction + BrandJSON on a site
// 2. In BrandJSON tab, click field → copy verified value
// 3. Paste into golden dataset's future_expectations
// 4. Enable strict mode for that site

// Example progression:
const stripeGolden = {
  "name": "Stripe",
  "domain": "stripe.com",
  "expected_baseline": { /* baseline checks */ },
  "future_expectations": {
    "hero_headline_regex": "^Financial infrastructure for the internet",
    "primary_color_hex_anyof": ["#635BFF", "#0066FF"],
    "font_families_anyof": ["Sohne", "Inter"],
    "cta_labels_anyof": ["Start now", "Get started", "Sign up"],
    "min_feature_cards": 3,
    "has_testimonials": true
  }
}
```

#### 3. Full Validation Suite (168 Total Tests)
```bash
# 68 Baseline + 68 Strict + 32 Enhancement tests
npm run test:golden-complete

# Production readiness: 168/168 tests passing
```

---

## 🧪 Unit Tests (30 Tests)

### Web Extraction Tests (10 Tests)
**Testing**: Enhanced WebAnalysisAgentV4 with Playwright extraction

#### 1. Screenshot Quality Tests (3 Tests)
```typescript
// Test: Full-page screenshot capture
expect(screenshot).toHave({
  width: 1920 * 2,  // @2x resolution
  height: '>3000',  // Full page
  format: 'png'
})

// Test: Section slicing accuracy
expect(sections).toContain(['hero', 'features', 'testimonials'])
expect(sectionScreenshots).toHaveLength('>=3')

// Test: Element-level crops
expect(elementCrops).toContain(['cta_button', 'logo', 'nav_menu'])
```

**Success Criteria**:
- ✅ Full-page screenshots at 1920x1080 @2x resolution
- ✅ Section detection identifies 3+ logical sections
- ✅ Element crops capture key UI components

#### 2. DOM Analysis Tests (3 Tests)
```typescript
// Test: Computed styles extraction
expect(extractedStyles).toHaveProperty('colors')
expect(extractedStyles.colors).toHaveLength('>=3')

// Test: Font detection accuracy
expect(extractedFonts).toContainFont('Inter', 'Arial', 'Helvetica')

// Test: Cookie/modal handling
expect(extraction.modalsHidden).toBe(true)
expect(extraction.cookieWallsHidden).toBe(true)
```

**Success Criteria**:
- ✅ Extract 5+ colors from computed styles
- ✅ Detect 2+ fonts actually used on page
- ✅ Automatically hide modals without interaction

#### 3. Evidence Tracking Tests (4 Tests)
```typescript
// Test: Every claim has evidence
expect(brandJson.sections).toAll(section => 
  section.evidence.screenshotIds.length > 0
)

// Test: Confidence scoring
expect(brandJson.confidence.overall).toBeGreaterThan(0.7)

// Test: DOM path tracking
expect(brandJson.sections[0].evidence.domPath).toMatch(/^[a-z]+/)

// Test: Bounding box accuracy
expect(boundingBox).toBeWithinPage()
```

**Success Criteria**:
- ✅ 100% of extracted content has screenshot evidence
- ✅ Confidence scores >70% for high-quality sites
- ✅ DOM selectors are valid and specific
- ✅ Bounding boxes are within screenshot bounds

### Visual Classification Tests (10 Tests)

#### 4. Photo vs UI Distinction (5 Tests)
```typescript
// Test: Photo classification accuracy
expect(classifyElement(heroImage)).toEqual({
  type: 'photo',
  message: 'Team collaboration in modern office',
  purpose: 'hero'
})

// Test: UI component classification
expect(classifyElement(dashboard)).toEqual({
  type: 'ui',
  category: 'dashboard',
  rebuildSpec: {
    layout: '3-column grid',
    components: ['charts', 'tables', 'filters']
  }
})

// Test: Mixed content sections
expect(featureSection.visualElements).toHave({
  photos: '>=1',
  uiComponents: '>=1'
})
```

**Success Criteria**:
- ✅ 90%+ accuracy distinguishing photos from UI
- ✅ One-line messages capture photo purpose
- ✅ UI components get rebuild-ready descriptions

#### 5. Rebuild Specification Tests (5 Tests)
```typescript
// Test: Layout description precision
expect(rebuildSpec.layout).toMatch(/\d+-column|grid|stack|horizontal/)

// Test: Styling completeness
expect(rebuildSpec.styling).toHaveProperties([
  'borderRadius', 'shadows', 'spacing'
])

// Test: Component breakdown
expect(rebuildSpec.components).toContainValidUIElements()

// Test: Interaction states
expect(rebuildSpec.interactions).toInclude('hover', 'click', 'focus')

// Test: Rebuild feasibility score
expect(calculateRebuildFeasibility(rebuildSpec)).toBeGreaterThan(0.8)
```

**Success Criteria**:
- ✅ Layout descriptions are implementable
- ✅ Styling details preserve visual fidelity
- ✅ Component breakdowns are complete
- ✅ Interaction states are documented
- ✅ 80%+ feasibility for UI recreation

### Template Selection Tests (10 Tests)

#### 6. UI Template Preference Tests (5 Tests)
```typescript
// Test: UI template selection when UI elements exist
expect(selectTemplate(sceneWithDashboard)).toHave({
  templateType: 'ui',
  templateId: expect.stringMatching(/Dashboard|Chart|Interface/)
})

// Test: Photo template selection when photos exist
expect(selectTemplate(sceneWithPhotos)).toHave({
  templateType: 'visual',
  templateId: expect.stringMatching(/Hero|Image|Visual/)
})

// Test: UI template bonus scoring
expect(calculateTemplateScore(uiTemplate, sceneWithUI)).toBeGreaterThan(
  calculateTemplateScore(textTemplate, sceneWithUI)
)
```

**Success Criteria**:
- ✅ 95%+ accuracy selecting UI templates for UI scenes
- ✅ UI templates get 20% scoring bonus when UI present
- ✅ Template type matches scene visual content

#### 7. Metadata-Driven Selection Tests (5 Tests)
```typescript
// Test: Technical requirements filtering
expect(eligibleTemplates).toAll(template =>
  template.requirements.duration.max >= scene.duration &&
  template.requirements.texts.headline.max >= scene.headline.length
)

// Test: Capability matching
expect(selectedTemplate.capabilities).toSupportScene(scene)

// Test: Industry alignment
expect(selectedTemplate.industries).toContain(brand.archetype)

// Test: Fallback template selection
expect(selectTemplate(problematicScene)).toHaveValidFallback()

// Test: Template variety across scenes
expect(selectedTemplates).toHaveUniqueTemplates('>=80%')
```

**Success Criteria**:
- ✅ Hard requirements filter out incompatible templates
- ✅ Selected templates can fulfill scene needs
- ✅ Industry matching improves template relevance
- ✅ Fallbacks prevent selection failures
- ✅ 80%+ template variety across video

---

## 🔗 Integration Tests (25 Tests)

### Pipeline Flow Tests (15 Tests)

#### 8. Extraction → Analysis Integration (5 Tests)
```typescript
// Test: Screenshots feed into brand analysis
expect(brandAnalysis.evidence.screenshotIds).toMatchExtractionOutput()

// Test: DOM data enhances visual analysis
expect(visualClassification).toUseDOMContext()

// Test: Style extraction informs brand colors
expect(brandJson.design.colors).toMatchExtractedStyles()

// Test: Section detection consistency
expect(brandJson.sections).toAlignWithScreenshotSections()

// Test: Evidence validation pipeline
expect(brandJson).toHaveValidatedEvidence()
```

**Success Criteria**:
- ✅ Screenshot data flows correctly to analysis
- ✅ Visual classification uses DOM context
- ✅ Extracted styles inform brand palette
- ✅ Sections align between extraction and analysis
- ✅ Invalid evidence gets filtered out

#### 9. Analysis → Scene Planning Integration (5 Tests)
```typescript
// Test: Brand data informs scene content
expect(scenePlan.content).toReflectBrandAnalysis(brandJson)

// Test: Visual elements influence scene types
expect(scenePlan.visualElements).toMatchAnalysisClassification()

// Test: Evidence links carry through
expect(scenePlan.sources).toReferenceAnalysisEvidence()

// Test: Hero's journey uses actual content
expect(scenePlan.narrative).toUseVerbatimText()

// Test: Duration allocation respects content volume
expect(scenePlan.duration).toReflectContentComplexity()
```

**Success Criteria**:
- ✅ Scene content reflects actual brand analysis
- ✅ Visual classification influences scene structure
- ✅ Evidence chain remains unbroken
- ✅ No hallucinated content in scenes
- ✅ Duration matches content complexity

#### 10. Scene Planning → Template Selection Integration (5 Tests)
```typescript
// Test: Visual elements drive template preference
expect(templateSelection).toPreferUIWhenUIElementsExist()

// Test: Brand context influences template scoring
expect(templateScore).toReflectBrandAlignment()

// Test: Scene requirements filter templates
expect(selectedTemplate).toMeetSceneRequirements()

// Test: Edit tool context preparation
expect(editContext).toContainRebuildSpecs()

// Test: Template variety across hero's journey
expect(selectedTemplates).toVaryAcrossNarrativeBeats()
```

**Success Criteria**:
- ✅ UI elements trigger UI template selection
- ✅ Brand context improves template relevance
- ✅ Template capabilities match scene needs
- ✅ Edit tool gets complete context
- ✅ Template variety maintains engagement

### Edit Tool Enhancement Tests (10 Tests)

#### 11. Context Injection Tests (5 Tests)
```typescript
// Test: Rebuild specs reach Edit tool
expect(editToolInput.visualElements.uiComponents).toHaveRebuildSpecs()

// Test: Photo messages included
expect(editToolInput.visualElements.photos).toHaveMessages()

// Test: Brand context completeness
expect(editToolInput.webContext.pageData).toBeComplete()

// Test: Template preference hints
expect(editToolInput.templatePreference).toMatchSceneVisuals()

// Test: Evidence-based generation
expect(editToolOutput).toOnlyUseEvidencedContent()
```

**Success Criteria**:
- ✅ Rebuild specifications reach Edit tool
- ✅ Photo context includes one-line messages
- ✅ Complete brand context available
- ✅ Template preferences guide generation
- ✅ Generated content is evidence-based

#### 12. Scene Generation Quality Tests (5 Tests)
```typescript
// Test: UI recreation fidelity
expect(generatedScene).toMatchUIRebuildSpecs('>=80%')

// Test: Brand consistency
expect(generatedScene.colors).toMatchBrandPalette()

// Test: Content verbatim usage
expect(generatedScene.text).toUseExactSourceText()

// Test: Visual element integration
expect(generatedScene.images).toUseClassifiedElements()

// Test: Template customization success
expect(generatedScene).toBeValidRemotionComponent()
```

**Success Criteria**:
- ✅ UI recreation matches source 80%+
- ✅ Brand colors and fonts preserved
- ✅ Text content is verbatim from source
- ✅ Visual elements properly integrated
- ✅ Generated TSX compiles successfully

---

## 🎨 Fidelity Tests (20 Tests)

### Visual Accuracy Tests (10 Tests)

#### 13. Element Matching Tests (5 Tests)
```typescript
// Test: Color fidelity
expect(compareColors(source, generated)).toHaveAccuracy('>=90%')

// Test: Font preservation
expect(compareFonts(source, generated)).toPreserveHierarchy()

// Test: Layout similarity
expect(compareLayouts(source, generated)).toMatchStructure('>=85%')

// Test: Spacing consistency
expect(compareSpacing(source, generated)).toMaintainProportions()

// Test: Visual hierarchy preservation
expect(compareHierarchy(source, generated)).toPreserveImportance()
```

**Success Criteria**:
- ✅ 90%+ color accuracy vs source
- ✅ Font hierarchy preserved
- ✅ 85%+ layout structure match
- ✅ Spacing proportions maintained
- ✅ Visual hierarchy preserved

#### 14. Content Accuracy Tests (5 Tests)
```typescript
// Test: Headline verbatim usage
expect(generated.headlines).toExactlyMatch(source.headlines)

// Test: CTA button text preservation
expect(generated.ctas).toPreserveCTAText()

// Test: Feature descriptions accuracy
expect(generated.features).toUseSourceDescriptions()

// Test: No hallucinated content
expect(generated.allText).toHaveSourceEvidence()

// Test: Content completeness
expect(generated.content).toCoverKeySourceMessages()
```

**Success Criteria**:
- ✅ Headlines are exactly verbatim
- ✅ CTA text matches source exactly
- ✅ Feature descriptions use source text
- ✅ Zero hallucinated content
- ✅ Key messages represented

### Brand Consistency Tests (10 Tests)

#### 15. Cross-Scene Consistency Tests (5 Tests)
```typescript
// Test: Color palette consistency
expect(scenes).toUseConsistentColorPalette()

// Test: Typography consistency
expect(scenes).toMaintainFontHierarchy()

// Test: Style lock enforcement
expect(scenes).toFollowStyleManifest()

// Test: Brand voice consistency
expect(scenes).toMaintainBrandVoice()

// Test: Visual style continuity
expect(scenes).toHaveVisualContinuity()
```

**Success Criteria**:
- ✅ Same colors across all scenes
- ✅ Consistent font usage
- ✅ Style manifest followed
- ✅ Brand voice maintained
- ✅ Visual style coherent

#### 16. Source Fidelity Tests (5 Tests)
```typescript
// Test: Source recognition
expect(userFeedback.recognizesSource).toBeGreaterThan(0.85)

// Test: Brand authenticity
expect(userFeedback.feelsBrandAuthentic).toBeGreaterThan(0.90)

// Test: Visual similarity
expect(visualSimilarityScore).toBeGreaterThan(0.85)

// Test: Content authenticity
expect(contentAuthenticityScore).toBeGreaterThan(0.95)

// Test: Overall fidelity
expect(overallFidelityScore).toBeGreaterThan(0.85)
```

**Success Criteria**:
- ✅ 85%+ users recognize original source
- ✅ 90%+ feel brand authenticity
- ✅ 85%+ visual similarity to source
- ✅ 95%+ content authenticity
- ✅ 85%+ overall fidelity score

---

## ⚡ Performance Tests (10 Tests)

### Speed Benchmarks (5 Tests)

#### 17. Pipeline Performance Tests (5 Tests)
```typescript
// Test: Extraction speed
expect(extractionTime).toBeLessThan(20_000) // 20s

// Test: Analysis speed
expect(analysisTime).toBeLessThan(15_000) // 15s

// Test: Scene generation speed
expect(sceneGenerationTime).toBeLessThan(20_000) // 20s per scene

// Test: End-to-end speed
expect(totalPipelineTime).toBeLessThan(60_000) // 60s total

// Test: Streaming responsiveness
expect(firstSceneTime).toBeLessThan(30_000) // 30s to first scene
```

**Success Criteria**:
- ✅ Extraction completes in <20s
- ✅ Analysis completes in <15s
- ✅ Each scene generates in <20s
- ✅ Total pipeline <60s end-to-end
- ✅ First scene appears in <30s

### Resource Efficiency Tests (5 Tests)

#### 18. Resource Usage Tests (5 Tests)
```typescript
// Test: Memory usage
expect(memoryUsage).toBeLessThan('2GB')

// Test: Screenshot storage efficiency
expect(screenshotStorage).toBeLessThan('50MB')

// Test: Database query efficiency
expect(dbQueries).toBeLessThan(100)

// Test: API call optimization
expect(llmApiCalls).toBeLessThan(20)

// Test: Concurrent processing capability
expect(concurrentPipelines).toHandle(5)
```

**Success Criteria**:
- ✅ Memory usage <2GB per pipeline
- ✅ Screenshot storage <50MB per site
- ✅ <100 database queries per pipeline
- ✅ <20 LLM API calls per pipeline
- ✅ Handle 5 concurrent pipelines

---

## 🔄 E2E Pipeline Tests (10 Tests)

### Complete Workflow Tests (5 Tests)

#### 19. End-to-End Success Tests (5 Tests)
```typescript
// Test: Stripe.com complete pipeline
expect(processPipeline('https://stripe.com')).toSucceed()

// Test: Figma.com complete pipeline  
expect(processPipeline('https://figma.com')).toSucceed()

// Test: Linear.app complete pipeline
expect(processPipeline('https://linear.app')).toSucceed()

// Test: Notion.so complete pipeline
expect(processPipeline('https://notion.so')).toSucceed()

// Test: Custom enterprise site
expect(processPipeline('https://custom-enterprise.com')).toSucceed()
```

**Success Criteria**:
- ✅ 100% success rate on test sites
- ✅ All scenes generate successfully
- ✅ No pipeline failures
- ✅ Evidence tracking complete
- ✅ UI preference logic works

### Real-World Validation Tests (5 Tests)

#### 20. Production-Like Tests (5 Tests)
```typescript
// Test: High-traffic site handling
expect(processPipeline('https://github.com')).toHandleComplexity()

// Test: International site support
expect(processPipeline('https://spotify.com')).toHandleMultiRegion()

// Test: Mobile-first site handling
expect(processPipeline('https://whatsapp.com')).toHandleMobileSites()

// Test: B2B enterprise site
expect(processPipeline('https://salesforce.com')).toHandleComplexB2B()

// Test: E-commerce site
expect(processPipeline('https://shopify.com')).toHandleEcommerce()
```

**Success Criteria**:
- ✅ Handle complex, high-traffic sites
- ✅ Support international/multi-region sites
- ✅ Process mobile-first designs
- ✅ Handle complex B2B interfaces
- ✅ Process e-commerce layouts

---

## 🚨 Edge Case Tests (5 Tests)

### Error Handling & Fallbacks (5 Tests)

#### 21. Resilience Tests (5 Tests)
```typescript
// Test: Network timeout handling
expect(handleNetworkTimeout()).toHaveGracefulFallback()

// Test: Malformed HTML handling
expect(handleMalformedHTML()).toRecoverGracefully()

// Test: Missing visual elements
expect(handleNoUIElements()).toFallbackToTextTemplates()

// Test: Low-quality screenshots
expect(handleLowQualityScreenshots()).toUseAlternativeAnalysis()

// Test: Template selection failure
expect(handleTemplateSelectionFailure()).toUseFallbackTemplate()
```

**Success Criteria**:
- ✅ Graceful network timeout handling
- ✅ Malformed HTML doesn't crash pipeline
- ✅ Fallback to text templates when no UI
- ✅ Alternative analysis for poor screenshots
- ✅ Fallback templates prevent failures

---

## 🎯 Production Readiness Gates

### Critical Success Metrics (Must be 100%)

#### Gate 1: Golden Dataset Validation (136 Tests)
- [ ] 68/68 Baseline golden tests passing (>80% average score)
- [ ] 68/68 Strict golden tests passing (where configured)
- [ ] All major verticals represented and validated

#### Gate 2: Core Functionality (20 Tests)
- [ ] 20/20 Unit tests passing
- [ ] Visual element classification >90% accurate
- [ ] UI template preference >95% accurate

#### Gate 3: Integration & Performance (12 Tests)
- [ ] 8/8 Integration tests passing
- [ ] 4/4 Performance tests passing
- [ ] <60s end-to-end processing
- [ ] <30s to first scene

#### Gate 4: Evidence-Based Quality
- [ ] 100% content has source evidence
- [ ] Zero hallucinated content
- [ ] Source recognition >85% on golden dataset

---

## 🛠️ Test Infrastructure Requirements

### Test Environment Setup
```typescript
// Required test fixtures
- createTestContext() // Real database
- createMockTestContext() // Mock testing
- testWebsites.fintech // Pre-configured profiles
- testWebsites.design
- testWebsites.developer
- testWebsites.ecommerce
- testWebsites.b2b

// Test utilities
- compareVisualFidelity()
- calculateSourceRecognition()
- measurePerformanceBenchmarks()
- validateEvidenceChain()
- scoreTemplateSelection()
```

### Test Data Requirements
```typescript
// Sample websites for testing
const testSites = {
  tier1: ['stripe.com', 'figma.com', 'linear.app'], // Known good
  tier2: ['notion.so', 'github.com', 'shopify.com'], // Complex
  tier3: ['custom-sites.com'], // Edge cases
  performance: ['heavy-sites.com'], // Performance testing
  international: ['non-english-sites.com'] // Multi-language
}
```

### Success Dashboard
```typescript
interface TestDashboard {
  overallHealth: '100% | 95% | 90% | FAILING'
  fidelityScore: '85%+ | 80-85% | <80%'
  performanceScore: '<60s | 60-90s | >90s'
  evidenceQuality: '100% | 95% | <95%'
  productionReadiness: 'READY | NEEDS WORK | NOT READY'
}
```

---

## 🚀 Test Execution Strategy

### Continuous Testing
- **Unit tests**: Run on every commit
- **Integration tests**: Run on PR creation
- **Fidelity tests**: Run on staging deploy
- **E2E tests**: Run on production deploy
- **Performance tests**: Run nightly

### Test Priorities
1. **P0 (Blocking)**: Core functionality, evidence tracking, fidelity
2. **P1 (High)**: UI preference, performance, brand consistency
3. **P2 (Medium)**: Edge cases, fallbacks, optimization

### Success Criteria Summary
**🎯 Production Ready When:**
- **168/168 tests passing** (100%)
- **Golden dataset** >80% average score
- **Fidelity score** >85%
- **Processing time** <60s
- **Evidence coverage** 100%
- **UI template accuracy** >95%
- **Zero hallucinated content**

---

*"When these 168 tests are 100% passing, we have 'filmed the website' with 85%+ fidelity and Sprint 99.5 is ready for production."*