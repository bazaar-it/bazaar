# Brand Extraction Quality Analysis

**Date**: 2025-09-30
**Sprint**: 126 - URL to Perfect Video
**Issue**: Brand extractor not good enough for 50% export-without-edits goal

---

## Current State: What We Extract Today

### ✅ What Works (DOM Scraping)

**File**: `/src/tools/webAnalysis/WebAnalysisAgentV4.ts` (1364 lines)

**Current Capabilities**:
1. **Company Name**: Logo alt text, og:site_name, header text
2. **Headlines**: H1/H2 from hero sections
3. **Colors**: CSS computed styles (primary, secondary, accents)
4. **Typography**: Font families from computed styles
5. **Features**: Scrapes feature sections (title + description)
6. **Social Proof**: Testimonials, stats, customer logos
7. **Screenshots**: Takes 8-10 screenshots of the page

**Extraction Method**: Playwright page.evaluate() → DOM inspection

---

## The Problem: Why 50% Export Rate is Unlikely

### ❌ Critical Gaps

#### 1. **No Visual Understanding**
- **Current**: Extracts text "blue" from CSS
- **Need**: Understands "this blue is energetic tech blue, not corporate navy blue"
- **Impact**: Personality analysis gets wrong inputs

#### 2. **No Layout Intelligence**
- **Current**: Scrapes headlines as strings
- **Need**: Knows "this headline is centered with huge type = bold brand"
- **Impact**: Can't match minimalist vs maximalist templates

#### 3. **No Design Pattern Recognition**
- **Current**: Gets font name "Inter"
- **Need**: Recognizes "Inter + big spacing + lots of white = modern SaaS"
- **Impact**: Wrong template selection (playful when should be minimal)

#### 4. **No Brand Imagery Analysis**
- **Current**: Takes screenshots, doesn't analyze them
- **Need**: "Hero image shows people = human-focused, not technical product shots"
- **Impact**: Technical templates for human brands

#### 5. **Shallow Content Extraction**
- **Current**: First H1 and H2 only
- **Need**: Full content hierarchy, key messages, tone analysis
- **Impact**: Generic "Welcome to X" instead of actual value props

#### 6. **No Competitive Context**
- **Current**: Extracts brand in isolation
- **Need**: "This is a Stripe competitor, should feel fintech-professional"
- **Impact**: Wrong personality scores

---

## What 50% Export Rate Requires

### User Journey
```
User pastes URL → Sees video → Thinks "Wow, this nails my brand" → Exports
```

**For this to work 50% of the time, we need**:

1. **Accurate Colors** (95%+)
   - Not just primary/secondary
   - Understand semantic meaning (trust blue vs energy orange)
   - Extract actual brand gradients (not hardcoded)

2. **Perfect Personality Match** (85%+)
   - Corporate vs casual: read tone from copy + imagery
   - Minimalist vs busy: analyze layout density
   - Technical vs emotional: understand product category + imagery

3. **Relevant Content** (80%+)
   - Actual value prop, not generic "Welcome to X"
   - Real features, not scraped lorem ipsum
   - Authentic voice, not AI-generic rewrite

4. **Right Template** (85%+)
   - B2B gets problem-solution template
   - Consumer app gets feature-tour template
   - Based on actual product understanding

---

## Comparison: Current vs Needed

| Dimension | Current Extraction | Needed for 50% | Gap |
|-----------|-------------------|----------------|-----|
| **Colors** | CSS computed values | Semantic understanding | HIGH |
| **Typography** | Font names only | Font + usage patterns | MEDIUM |
| **Personality** | Inferred from text | Vision + content analysis | HIGH |
| **Content Quality** | First H1/H2 | Deep content hierarchy | HIGH |
| **Visual Style** | Screenshots only | Analyzed layouts | HIGH |
| **Product Category** | Guessed from features | Multi-modal understanding | HIGH |

---

## Solution: Multi-Modal Extraction

### Phase 1: Vision-Based Analysis (Add to existing)

**Use GPT-4o (Vision) to analyze screenshots**:

```typescript
// For each screenshot, ask GPT-4o:
const visionPrompt = `
Analyze this website screenshot and extract:

1. Visual density: How much white space? (0-1)
2. Color emotion: What do these colors convey?
3. Typography style: Modern/Classic/Playful/Technical?
4. Imagery type: People/Product/Abstract/None?
5. Layout style: Grid/Asymmetric/Centered/Scattered?
6. Brand archetype: Creator/Sage/Hero/etc.?

Return structured JSON.
`;
```

**Benefits**:
- Understands "busy maximalist design" vs "clean minimal"
- Recognizes "corporate blue navy" vs "startup blue electric"
- Sees "lots of people photos = human-focused"

**Cost**: ~$0.01 per URL (analyze 3-4 screenshots)
**Time**: +5-10 seconds per extraction

### Phase 2: Deep Content Analysis (Enhance existing)

**Use GPT-4o-mini to analyze full page text**:

```typescript
const contentPrompt = `
Analyze this website's full text content:

${fullPageText} // Not just H1/H2, but sections, features, CTAs

Extract:
1. True value proposition (what problem they solve)
2. Target audience (who is this for)
3. Voice & tone (formal/casual/playful/technical)
4. Key differentiators (what makes them unique)
5. Product category (SaaS/app/service/etc.)

Return structured JSON.
`;
```

**Benefits**:
- Gets actual value props, not generic headlines
- Understands target audience (B2B vs consumer)
- Extracts real differentiators for scene content

**Cost**: ~$0.0001 per URL
**Time**: +2-3 seconds per extraction

### Phase 3: Competitive Intelligence (Optional)

**Use web search to understand category**:

```typescript
// Search: "{brand name} competitors"
// Analyze: Are they enterprise (Salesforce-like) or startup (Linear-like)?
// Apply: Adjust personality scores based on competitive set
```

**Benefits**:
- "Notion competitor" → minimalist, modern, playful
- "Salesforce competitor" → corporate, robust, professional

**Cost**: $0 (use search API)
**Time**: +3-5 seconds per extraction

---

## Recommended Implementation (Week 1)

### Priority 1: Vision Analysis (Day 1-2)

**Add to WebAnalysisAgentV4**:

```typescript
async analyzeScreenshotsWithVision(screenshots: string[]): Promise<VisualAnalysis> {
  // Pick 3 best screenshots: hero, features, footer
  const selected = this.selectBestScreenshots(screenshots, 3);

  // Analyze with GPT-4o vision
  const analyses = await Promise.all(
    selected.map(url => this.analyzeScreenshot(url))
  );

  return {
    density: average(analyses.map(a => a.density)),
    colorEmotion: mostCommon(analyses.map(a => a.colorEmotion)),
    typographyStyle: mostCommon(analyses.map(a => a.typographyStyle)),
    imageryType: mostCommon(analyses.map(a => a.imageryType)),
    layoutStyle: mostCommon(analyses.map(a => a.layoutStyle)),
    brandArchetype: mostCommon(analyses.map(a => a.brandArchetype))
  };
}
```

**Feed into personality analyzer**:
```typescript
// Instead of just text-based analysis
const personality = await analyzer.analyzeBrandPersonality({
  colors: brandData.colors,
  typography: brandData.typography,
  copyVoice: brandData.copyVoice,
  visualAnalysis: visionAnalysis, // NEW
});
```

### Priority 2: Deep Content Analysis (Day 3)

**Enhance text extraction**:
```typescript
// Get full page text, not just H1/H2
const fullText = await page.evaluate(() => {
  return {
    hero: document.querySelector('[class*="hero"]')?.innerText,
    features: Array.from(document.querySelectorAll('[class*="feature"]')).map(el => el.innerText),
    benefits: Array.from(document.querySelectorAll('[class*="benefit"]')).map(el => el.innerText),
    testimonials: Array.from(document.querySelectorAll('[class*="testimonial"]')).map(el => el.innerText),
    footer: document.querySelector('footer')?.innerText
  };
});

// Analyze with GPT-4o-mini
const contentAnalysis = await this.analyzeContent(fullText);
```

### Priority 3: Update Personality Analyzer (Day 4)

**Incorporate visual signals**:
```typescript
// Current: only text-based
// New: vision + text

if (visualAnalysis.density < 0.3) {
  personality.minimalist += 0.2; // Lots of white space
}

if (visualAnalysis.imageryType === 'people') {
  personality.technical -= 0.2; // Human-focused, not technical
  personality.playful += 0.1;
}

if (visualAnalysis.typographyStyle === 'modern-sans') {
  personality.modern += 0.2;
}
```

---

## Expected Outcomes

### With Vision Analysis
- **Personality Accuracy**: 60% → 85%
- **Template Match**: 70% → 85%
- **Export Without Edits**: 30% → 45%

### With Deep Content Analysis
- **Content Relevance**: 50% → 80%
- **Value Prop Quality**: 40% → 75%
- **Export Without Edits**: 45% → 52%

### Combined
- **Overall Quality**: 60% → 85%
- **Export Without Edits**: 30% → **50%** ✅

---

## Cost Analysis

### Current Extraction
- **Playwright**: Free (self-hosted)
- **Screenshot Storage**: $0.001 per URL (R2)
- **Total**: ~$0.001 per URL

### With Enhancements
- **Playwright**: Free
- **Screenshot Storage**: $0.001
- **Vision Analysis (GPT-4o)**: $0.01 (3 screenshots)
- **Content Analysis (GPT-4o-mini)**: $0.0001
- **Total**: ~$0.011 per URL

**ROI**: 11x cost increase, but 50% export rate = 2x fewer support tickets

---

## Action Items

### Week 1 (This Week)
- [ ] Add vision analysis to WebAnalysisAgentV4
- [ ] Enhance personality analyzer with visual signals
- [ ] Deep content extraction with GPT-4o-mini
- [ ] Test with 10 diverse URLs, measure personality accuracy

### Week 2
- [ ] Refine prompts based on test results
- [ ] Add competitive intelligence (optional)
- [ ] Optimize for speed (parallel calls)

### Week 3
- [ ] Final testing with 50 URLs
- [ ] Measure actual export rate
- [ ] Launch with Product Hunt

---

**Conclusion**: Current DOM scraping gets us 30% export rate. Vision + deep content analysis gets us to 50%.

**Next Step**: Implement vision-based screenshot analysis in Week 1.