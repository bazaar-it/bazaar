# 🚀 Dynamic Generation Fix Implementation Plan

## Overview
Transform the repetitive, hardcoded video generation into a dynamic, creative system that produces unique narratives for every brand.

---

## 🎯 Goals

1. **Unique Narratives**: Different story structure for each brand
2. **Template Variety**: Random selection from appropriate templates
3. **Brand-Aware**: Story matches brand personality
4. **LLM-Powered**: Use AI for creative generation

---

## 📋 Implementation Steps

## Step 1: Add Randomization to Template Selection ✅
**File**: `/src/server/services/website/template-selector.ts`
**Status**: COMPLETED

### Changes Made:
```typescript
// OLD:
const templateName = templateOptions[0]; // Always first

// NEW:
const randomIndex = Math.floor(Math.random() * templateOptions.length);
const templateName = templateOptions[randomIndex];
```

### Additional Enhancement:
- Added duplicate prevention tracking
- Implemented AI-powered template matching
- Filter already-used templates for variety

---

## Step 2: Switch to HeroJourneyLLM ✅
**File**: `/src/tools/website/websiteToVideoHandler.ts`
**Status**: COMPLETED

### Changes Made:
```typescript
// OLD:
const storyGenerator = new HeroJourneyGenerator();
const narrativeScenes = storyGenerator.generateNarrative(websiteData);

// NEW:
const { heroJourneyLLM } = await import('../narrative/herosJourneyLLM');
const narrativeResult = await heroJourneyLLM.generateHeroJourney(
  websiteData,
  input.projectId,
  'websiteToVideo'
);
```

### Current Issue:
- LLM generates full 15-second scene, not 5 separate acts
- Need to parse the generated code to extract act structure
- Fallback to hardcoded generator for now

---

## Step 3: Dynamic Narrative Structures ✅
**File**: `/src/tools/narrative/herosJourneyLLM.ts`
**Status**: COMPLETED

### Changes Made:
Added 7 narrative structures:
1. Classic Hero's Journey
2. Rising Action
3. Emotional Rollercoaster
4. Product Demo Flow
5. Brand Story Arc
6. Customer Success Story
7. Problem-Agitate-Solve

### Smart Selection Logic:
```typescript
if (problem.includes('pain') || problem.includes('frustrat')) {
  selectedStructure = "Problem-Agitate-Solve";
} else if (brandName.includes('tech') || tagline.includes('innovat')) {
  selectedStructure = "Product Demo Flow";
} else if (mission?.includes('customer')) {
  selectedStructure = "Customer Success Story";
}
// ... etc
```

---

## Step 4: Context-Aware Template Matching ✅
**File**: `/src/server/services/website/template-selector.ts`
**Status**: COMPLETED

### Changes Made:
```typescript
// Use AI template matcher
const matches = await templateMatcher.findBestTemplates(
  `${scene.narrative} ${scene.emotionalBeat} ${brandStyle.keywords}`,
  5
);

// Pick randomly from top 2 matches
const selected = topMatches[Math.floor(Math.random() * 2)];
```

---

## 🔧 Next Steps Required

### Step 5: Parse LLM Output into Acts
**File**: `/src/tools/narrative/herosJourneyLLM.ts`
**Status**: TODO

**Problem**: LLM returns single 15-second scene, not 5 acts
**Solution**: Parse the generated code to extract temporal segments

```typescript
async generateHeroJourneyActs(extraction: ExtractedBrandDataV4) {
  // 1. Generate full scene
  const fullScene = await this.generateHeroJourney(extraction);
  
  // 2. Parse code to find frame-based segments
  const acts = this.parseActsFromCode(fullScene.code);
  
  // 3. Return as HeroJourneyScene[] array
  return acts;
}

private parseActsFromCode(code: string): HeroJourneyScene[] {
  // Extract sequences like:
  // {frame >= 0 && frame < 90 && ( ... )}  // Act 1
  // {frame >= 90 && frame < 150 && ( ... )} // Act 2
  // etc.
}
```

### Step 6: Hybrid Approach
**File**: `/src/tools/website/websiteToVideoHandler.ts`
**Status**: TODO

**Approach**: Use LLM for narrative structure, but keep 5-scene architecture

```typescript
// 1. Get narrative structure from LLM
const narrativeStructure = await heroJourneyLLM.selectNarrativeStructure(websiteData);

// 2. Generate 5 acts with that structure
const narrativeScenes = await heroJourneyLLM.generateActsWithStructure(
  websiteData,
  narrativeStructure
);

// 3. Continue with template selection
const selectedTemplates = await selector.selectTemplatesForJourney(
  narrativeScenes,
  style,
  websiteData
);
```

---

## 📊 Testing Plan

### Test Cases:
1. **Tech Company** (e.g., elhub.no)
   - Should get "Product Demo Flow" narrative
   - Technical templates (charts, data viz)

2. **Fashion Brand** 
   - Should get "Emotional Rollercoaster" narrative
   - Visual/aesthetic templates

3. **B2B Service**
   - Should get "Problem-Agitate-Solve" narrative
   - Professional templates

### Validation:
- Generate 3 videos for same URL
- Should have different templates each time
- Should maintain brand consistency

---

## 🚨 Risk Mitigation

### Fallback Strategy:
```typescript
try {
  // Try LLM generation
  const narrative = await heroJourneyLLM.generateHeroJourney();
} catch (error) {
  // Fallback to enhanced hardcoded generator
  const narrative = new HeroJourneyGenerator().generateNarrative();
  // But with randomization applied
}
```

### Performance Considerations:
- LLM call adds ~2-3 seconds
- Can be offset by better caching
- User experience improved by variety

---

## 📈 Success Metrics

1. **Template Diversity**: 
   - Measure: Unique templates per 10 generations
   - Target: >80% different

2. **Narrative Variety**:
   - Measure: Different narrative structures used
   - Target: All 7 structures used weekly

3. **User Satisfaction**:
   - Measure: Regeneration requests
   - Target: <20% request regeneration

---

## 🎯 Immediate Actions

1. **Test Current Changes** ✅
   - Verify randomization works
   - Check LLM integration

2. **Implement Act Parsing** 🔄
   - Parse LLM output into 5 acts
   - Maintain backward compatibility

3. **Deploy & Monitor** ⏳
   - Roll out incrementally
   - Monitor for errors
   - Collect variety metrics

---

## 💡 Future Enhancements

1. **User Preferences**
   - Let users choose narrative style
   - "Make it more dramatic/professional/fun"

2. **Industry Templates**
   - Tech → Data visualizations
   - Fashion → Aesthetic transitions
   - Finance → Charts and graphs

3. **Adaptive Learning**
   - Track which narratives perform best
   - Learn from user feedback
   - Improve selection algorithm

---

## 📝 Notes

- Changes are backward compatible
- Fallbacks ensure stability
- Can be toggled via feature flags
- Preserves all existing functionality

---

**Status**: Ready for testing and incremental deployment