# 🎬 Complete URL-to-Video Flow Documentation

## Executive Summary
When a user types a URL (e.g., `https://elhub.no`), the system performs brand extraction and generates a video. However, the current implementation uses hardcoded narrative structures and deterministic template selection, resulting in repetitive outputs.

---

## 📍 Phase 1: URL Input & Detection

### 1.1 User Input
**Location**: `/src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx`
- User types: `https://elhub.no`
- ChatPanelG detects URL pattern
- Sends to backend via tRPC mutation

### 1.2 API Router
**Location**: `/src/server/api/routers/generation.universal.ts`
```typescript
generateScene: protectedProcedure
  .input(generateSceneSchema)
  .mutation(async ({ input, ctx }) => {
    // Receives: { prompt: "https://elhub.no", projectId: "..." }
    const result = await orchestrator.process(input);
  })
```

### 1.3 Brain Orchestrator
**Location**: `/src/brain/orchestratorNEW.ts`
```typescript
async process(input: OrchestrationInput) {
  // Step 1: Build context
  const context = await this.contextBuilder.buildContext(input);
  
  // Step 2: Analyze intent
  const decision = await this.analyzeIntent(input, context);
  // Returns: { toolName: 'websiteToVideo', websiteUrl: 'https://elhub.no' }
}
```

### 1.4 Context Builder URL Detection
**Location**: `/src/brain/orchestrator_functions/contextBuilder.ts` (Lines 173-198)

**CRITICAL LOGIC**:
```typescript
const targetUrl = extractFirstValidUrl(input.prompt); // "https://elhub.no"
const promptIsJustUrl = cleanPrompt === targetUrl;

if (promptIsJustUrl) {
  // Plain URL → Skip context building, let websiteToVideo handle it
  return undefined;
}
```

---

## 🌐 Phase 2: Brand Extraction

### 2.1 WebsiteToVideo Tool Activation
**Location**: `/src/tools/website/websiteToVideoHandler.ts`
```typescript
async handleWebsiteToVideo(input: WebsiteToVideoInput) {
  // Main orchestration point for website-to-video conversion
}
```

### 2.2 Web Analysis V4
**Location**: `/src/tools/webAnalysis/WebAnalysisAgentV4.ts`

**Process**:
1. **Browser Automation** (Playwright)
   ```typescript
   const browser = await playwright.chromium.launch();
   await page.goto('https://elhub.no');
   ```

2. **Screenshot Capture**
   - Desktop: 1920x1080
   - Mobile: 390x844
   - Uploaded to R2 storage

3. **Content Extraction**
   ```typescript
   const pageContent = await page.evaluate(() => ({
     title: document.title,
     headings: Array.from(document.querySelectorAll('h1,h2,h3')),
     buttons: Array.from(document.querySelectorAll('button')),
     text: document.body.innerText
   }));
   ```

4. **LLM Analysis** (Claude Sonnet 4)
   - Sends screenshots + content
   - Extracts comprehensive brand data
   - Returns `ExtractedBrandDataV4`

### 2.3 Extracted Data Structure
```typescript
ExtractedBrandDataV4 {
  brand: {
    identity: {
      name: "Elhub",
      tagline: "Digital infrastructure for the energy market",
      mission: "Enabling efficient energy data exchange",
      values: ["transparency", "innovation", "reliability"]
    },
    visual: {
      colors: {
        primary: "#0066CC",
        secondary: "#00A859",
        accent: "#FFB800"
      },
      typography: {
        headingFont: "Inter",
        bodyFont: "Inter"
      }
    }
  },
  product: {
    problem: "Complex energy data management",
    value_prop: {
      headline: "Streamline Energy Data Exchange",
      subhead: "Connect, manage, and optimize"
    },
    features: [
      { title: "Real-time data", desc: "Instant energy metrics" },
      { title: "Secure platform", desc: "Enterprise-grade security" }
    ]
  },
  screenshots: [
    { url: "https://r2.../desktop.png", type: "desktop" },
    { url: "https://r2.../mobile.png", type: "mobile" }
  ]
}
```

---

## 🎭 Phase 3: Narrative Arc Generation

### 3.1 Current Implementation (PROBLEM)
**Location**: `/src/tools/narrative/herosJourney.ts`

**Issue**: HARDCODED structure - ALWAYS returns:
1. "The Old World" (problem) - 3 seconds
2. "The Discovery" (discovery) - 2 seconds  
3. "The New Powers" (transformation) - 5 seconds
4. "The Success" (triumph) - 3 seconds
5. "Your Journey Starts Now" (invitation) - 2 seconds

```typescript
generateNarrative(extraction: any): HeroJourneyScene[] {
  // Returns SAME 5 acts every time
  // Only text content varies slightly based on extraction
}
```

### 3.2 Unused LLM Generator
**Location**: `/src/tools/narrative/herosJourneyLLM.ts`

**What It Could Do**:
- 7 different narrative structures
- Brand personality analysis
- Dynamic act generation
- Creative storytelling

**Why It's Not Used**: 
- websiteToVideoHandler calls `HeroJourneyGenerator` instead of `heroJourneyLLM`
- Historical technical debt

---

## 🎨 Phase 4: Template Selection

### 4.1 Current Implementation (PROBLEM)
**Location**: `/src/server/services/website/template-selector.ts`

**Issue**: Deterministic selection
```typescript
// BEFORE changes:
const templateOptions = this.beatToTemplateMap[scene.emotionalBeat][style];
const templateName = templateOptions[0]; // ALWAYS first template!
```

**Result**: 
- problem → ALWAYS "GlitchText"
- discovery → ALWAYS "ScaleIn"
- transformation → ALWAYS "FloatingElements"
- triumph → ALWAYS "TeslaStockGraph"
- invitation → ALWAYS "PulsingCircles"

### 4.2 Template Mapping
```typescript
beatToTemplateMap = {
  problem: {
    minimal: ['DarkBGGradientText', 'FadeIn', 'DarkForestBG'],
    dynamic: ['GlitchText', 'MorphingText', 'DrawOn'],
    bold: ['ParticleExplosion', 'GlitchText', 'WaveAnimation']
  },
  // ... etc for each emotional beat
}
```

---

## 🤖 Phase 5: AI Customization

### 5.1 Template Customization
**Location**: `/src/server/services/website/template-customizer-ai.ts`

**Process**:
1. Takes selected template code
2. Sends to Edit tool with brand data
3. AI replaces colors, text, animations
4. Returns customized Remotion code

**Model Used**: Claude Sonnet 4 (via optimal-pack)
**Temperature**: 0.3
**Max Tokens**: 16,000

### 5.2 Customization Prompt
```typescript
const editPrompt = `Transform this template for ${websiteData.page.title}:

BRAND DATA JSON:
${JSON.stringify(websiteData)}

BRAND STYLE:
- Primary Color: ${brandStyle.colors.primary}
- Font: ${brandStyle.typography.primaryFont}

NARRATIVE CONTEXT:
- Scene: ${narrativeScene.title}
- Story: ${narrativeScene.narrative}

Replace ALL placeholder content...`;
```

---

## 💾 Phase 6: Database Persistence

### 6.1 Streaming Save
**Location**: `/src/tools/website/websiteToVideoHandler.ts` (Lines 220-239)

Each scene is saved immediately upon generation:
```typescript
await db.insert(scenes).values({
  id: randomUUID(),
  projectId: input.projectId,
  name: scene.name,
  tsxCode: scene.code,
  duration: scene.duration,
  order: index
});
```

---

## 📊 Final Output

### Example for Elhub:
| Scene | Template | Duration | Content |
|-------|----------|----------|---------|
| The Old World | GlitchText | 90 frames | "Complex energy data..." |
| The Discovery | ScaleIn | 60 frames | "Digital infrastructure..." |
| The New Powers | FloatingElements | 150 frames | Feature showcase |
| The Success | TeslaStockGraph | 90 frames | Growth metrics |
| Your Journey | PulsingCircles | 60 frames | "Get Started" CTA |

**Total**: 450 frames (15 seconds at 30fps)

---

## 🔴 Critical Problems

1. **Hardcoded Narrative Arc**
   - Always same 5-act structure
   - No creativity or variety
   - Ignores brand personality

2. **Deterministic Template Selection**
   - Always picks first template in array
   - No randomization
   - No AI-driven selection

3. **Underutilized LLM System**
   - HeroJourneyLLM exists but unused
   - Could generate unique narratives
   - Wasted potential

4. **Repetitive Output**
   - Every video feels the same
   - Only colors/text change
   - No storytelling variety

---

## ✅ Solution Implementation

See [DYNAMIC_GENERATION_FIX.md](./DYNAMIC_GENERATION_FIX.md) for the complete fix implementation plan.