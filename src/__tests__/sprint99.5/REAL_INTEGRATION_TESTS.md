# Sprint 99.5 REAL Integration Tests
## 🎯 Tests That Actually Validate Functionality

**Goal**: 5-10 tests that prove Sprint 99.5 works on real websites, not mocks.

---

## 🌍 Test Strategy: Real Websites, Real Results

Instead of testing mocks, we test **actual Sprint 99.5 components** against **real websites**:

- ✅ **Real WebAnalysisAgentV4** extraction
- ✅ **Real visual classification** accuracy  
- ✅ **Real template selection** logic
- ✅ **Real end-to-end pipeline** with fidelity scoring
- ✅ **Real "film the website, don't imagine it"** validation

---

## 📋 Test Plan (10 Real Tests)

### 1. **WebAnalysisAgentV4 Real Extraction Tests** (3 tests)
Test actual brand data extraction from real websites:

```typescript
test('WebAnalysisAgentV4 extracts Stripe brand data correctly', async () => {
  const brandData = await WebAnalysisAgentV4.extract('https://stripe.com');
  
  // Validate real extracted data
  expect(brandData.brand.identity.name).toContain('Stripe');
  expect(brandData.design.colors).toContainColor('#635BFF'); // Stripe purple
  expect(brandData.sections).toHaveSection('hero');
  expect(brandData.sections).toHaveSection('features');
});
```

### 2. **Visual Classification Accuracy Tests** (2 tests) 
Test photo vs UI classification on real websites:

```typescript
test('Visual classification correctly identifies Linear UI components', async () => {
  const brandData = await WebAnalysisAgentV4.extract('https://linear.app');
  
  // Linear is UI-heavy, should classify correctly
  const uiElements = brandData.visualElements.uiComponents;
  const photos = brandData.visualElements.photos;
  
  expect(uiElements.length).toBeGreaterThan(photos.length);
  expect(uiElements).toContainComponentType('dashboard');
  expect(uiElements).toContainComponentType('kanban');
});
```

### 3. **Template Selection Logic Tests** (2 tests)
Test real UI template preference:

```typescript
test('Template selector prefers UI templates for Linear scenes', async () => {
  const brandData = await WebAnalysisAgentV4.extract('https://linear.app');
  const sceneplan = await createScenePlan(brandData);
  
  const template = await selectTemplate(sceneplan.scenes[0]);
  
  expect(template.type).toBe('ui'); // Should prefer UI template
  expect(template.capabilities).toContain('dashboard');
});
```

### 4. **End-to-End Pipeline Tests** (2 tests)
Test complete URL to video pipeline:

```typescript
test('Complete URL to video pipeline processes Stripe successfully', async () => {
  const result = await websiteToVideoHandler.process('https://stripe.com');
  
  expect(result.success).toBe(true);
  expect(result.scenes).toHaveLength(5); // Expected scene count
  expect(result.totalDuration).toBeLessThan(900); // <30 seconds
  expect(result.processingTime).toBeLessThan(60000); // <60 seconds
});
```

### 5. **Fidelity Scoring Test** (1 test)
Test actual brand fidelity measurement:

```typescript
test('Generated scenes achieve >85% brand fidelity for Figma', async () => {
  const result = await websiteToVideoHandler.process('https://figma.com');
  const fidelityScore = await calculateBrandFidelity(result, 'https://figma.com');
  
  expect(fidelityScore.overall).toBeGreaterThan(0.85);
  expect(fidelityScore.colorAccuracy).toBeGreaterThan(0.9);
  expect(fidelityScore.contentAccuracy).toBeGreaterThan(0.95);
});
```

---

## 🎯 Target Websites for Testing

**Tier 1: High-Confidence Sites** (UI-heavy, clean design)
- `linear.app` - Perfect UI components for classification testing
- `stripe.com` - Clean fintech design, good brand extraction
- `figma.com` - Design tool with clear visual hierarchy

**Tier 2: Complex Sites** (Mixed content, challenging)
- `notion.so` - Mixed UI + photos, complex layouts  
- `github.com` - Developer tool, lots of UI components

**Tier 3: Edge Cases** (Challenging scenarios)
- `shopify.com` - Photo-heavy commerce site
- `airbnb.com` - Photo-dominant with some UI

---

## 🛠️ Test Infrastructure Needed

### Real Test Helpers
```typescript
// Real fidelity calculation
export async function calculateBrandFidelity(
  generatedScenes: Scene[], 
  originalUrl: string
): Promise<FidelityScore>;

// Real visual element validation  
export function validateVisualClassification(
  brandData: ExtractedBrandDataV4,
  expectedCounts: { ui: number, photos: number }
): boolean;

// Real template preference validation
export function validateTemplatePreference(
  scene: Scene,
  expectedTemplateType: 'ui' | 'visual' | 'text'
): boolean;
```

### Test Configuration
```typescript
const REAL_TEST_CONFIG = {
  timeout: 60000, // 60s for real web requests
  retries: 2, // Network can be flaky
  headless: false, // See what's happening during development
  slowMo: 1000, // Slow down for debugging
  websites: {
    tier1: ['linear.app', 'stripe.com', 'figma.com'],
    tier2: ['notion.so', 'github.com'], 
    tier3: ['shopify.com', 'airbnb.com']
  }
};
```

---

## 🚨 What These Tests Will Actually Prove

**✅ Sprint 99.5 Works:** Real websites → Real brand data → Real scenes  
**✅ Visual Classification Works:** Correctly identifies UI vs photos on live sites  
**✅ UI Template Preference Works:** Selects UI templates when UI components exist  
**✅ Fidelity Goal Met:** >85% brand accuracy on real websites  
**✅ Performance Target Met:** <60s end-to-end processing  
**✅ "Film the Website" Works:** Generated content matches source website  

**❌ What Mock Tests Proved:** Jest matchers work, mocks return mock data 🤡

---

## 📊 Success Criteria

**🎯 Production Ready When:**
- All 10 real tests pass consistently
- Fidelity scores >85% on Tier 1 sites
- Processing times <60s on all sites
- Visual classification accuracy >90% on UI-heavy sites
- Template preference accuracy >95% on known site types

This is **real validation** of Sprint 99.5 functionality, not mock theater.