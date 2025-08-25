# Sprint 99.5 REAL Integration Tests
## ✅ Tests That Actually Validate Sprint 99.5 Functionality

**10 real tests that prove Sprint 99.5 works on actual websites**

---

## 🌍 What These Tests Actually Do

**Unlike the 55 useless mock tests**, these tests:

✅ **Use real Sprint 99.5 components** (WebAnalysisAgentV4, websiteToVideoHandler, etc.)  
✅ **Test against real websites** (Stripe, Linear, Figma, Shopify)  
✅ **Validate real functionality** (brand extraction, visual classification, template selection)  
✅ **Measure real fidelity** (>85% brand accuracy target)  
✅ **Check real performance** (<60s pipeline processing)  

❌ **Don't test mocks** (unlike the other 55 tests)

---

## 📋 Test Coverage (10 Real Tests)

### **Tests 1-3: Real WebAnalysisAgentV4 Extraction**
- `web-analysis-extraction.test.ts`
- Tests actual brand data extraction from Stripe, Linear, Figma
- Validates colors, sections, evidence tracking

### **Tests 4-5: Real Visual Classification**
- `visual-classification-accuracy.test.ts`  
- Tests photo vs UI classification on Linear (UI-heavy) and Shopify (photo-heavy)
- Validates rebuild specifications for UI components

### **Tests 6-7: Real Template Selection**
- `template-selection-logic.test.ts`
- Tests UI template preference with actual brand data and scene plans
- Validates template adaptation for different content types

### **Tests 8-9: Real End-to-End Pipeline**
- `end-to-end-pipeline.test.ts`
- Tests complete URL to video processing on Stripe and Figma
- Validates performance targets (<60s) and scene generation quality

### **Test 10: Real Fidelity Scoring**
- `fidelity-scoring.test.ts`
- Tests actual brand fidelity measurement (>85% target)
- Validates "film the website, don't imagine it" philosophy

---

## 🚀 Running Real Tests

```bash
# Run all real integration tests
npm test src/__tests__/sprint99.5/real

# Run specific test files
npm test src/__tests__/sprint99.5/real/web-analysis-extraction.test.ts
npm test src/__tests__/sprint99.5/real/visual-classification-accuracy.test.ts
npm test src/__tests__/sprint99.5/real/template-selection-logic.test.ts
npm test src/__tests__/sprint99.5/real/end-to-end-pipeline.test.ts
npm test src/__tests__/sprint99.5/real/fidelity-scoring.test.ts

# Debug specific website
npm test src/__tests__/sprint99.5/real -- --grep "Stripe"
```

### Test Configuration
- **Timeout**: 2 minutes per test (real web requests take time)
- **Retries**: 1 retry (network can be flaky)  
- **Concurrency**: Sequential (avoid rate limiting)
- **Real websites**: Stripe, Linear, Figma, Shopify

---

## 🎯 Success Criteria

**Sprint 99.5 is production-ready when all 10 tests pass:**

1. ✅ **Real brand extraction works** on major websites
2. ✅ **Visual classification accuracy >90%** on UI-heavy sites  
3. ✅ **UI template preference >95%** accuracy
4. ✅ **End-to-end pipeline <60s** processing time
5. ✅ **Brand fidelity >85%** on generated scenes
6. ✅ **Evidence-based content** (no hallucination)
7. ✅ **"Film the website, don't imagine it"** philosophy proven

---

## 🔍 What Real Tests Reveal

### **Example Test Output:**
```bash
✅ Stripe extraction successful: {
  brand: 'Stripe',
  sections: 4,
  colors: 5
}

✅ Linear classification successful: {
  uiRatio: '78%',
  hasProjectUI: true,
  rebuildableUI: 3
}

✅ Stripe pipeline successful: {
  sceneCount: 5,
  totalDuration: '720f',
  processingTime: '45s',
  brandDetected: 'Stripe'
}
```

### **Failure Examples:**
```bash
❌ Brand fidelity too low: 67% (target: 85%)
❌ Pipeline timeout: 75s (target: <60s)  
❌ Visual classification failed: UI/Photo ratio incorrect
```

---

## 💭 Why These Tests Matter

**Mock Tests (55 useless ones):**
- Test that mocks return mock data ✅
- Test that Jest matchers work ✅  
- Test that TypeScript compiles ✅
- **Test actual Sprint 99.5 functionality ❌**

**Real Tests (10 valuable ones):**
- **Test actual Sprint 99.5 functionality ✅**
- Prove the system works end-to-end ✅
- Validate performance targets ✅
- Measure real brand fidelity ✅

---

## 🛠️ Test Debugging

For debugging test failures:

```typescript
// Enable debug mode
test.skip('DEBUG: Extraction analysis', async () => {
  const brandData = await webAnalyzer.extract('https://example.com');
  console.log('🔍 DEBUG:', JSON.stringify(brandData, null, 2));
});
```

Common issues:
- **Network timeouts**: Increase timeout, add retries
- **Rate limiting**: Reduce concurrency, add delays
- **Brand data changes**: Websites change, update expectations
- **Performance variance**: CI environments can be slower

---

**These 10 tests provide real confidence that Sprint 99.5 actually works.** 

The other 55 mock tests are just expensive documentation. 🎭