# URL to Video Pipeline - Simple Overview

## 🎯 Goal
Transform any website URL into a 15-30 second video that looks exactly like the website, not a generic interpretation.

## 📊 The 6-Step Pipeline

### Step 1: Crawl Website 🕷️
**Input:** URL  
**Action:** Fetch HTML and take full-page screenshots  
**Output:** Raw website data (HTML, screenshots, styles)  
**Tools:** Playwright (headless Chrome)

### Step 2: Extract Brand JSON 🎨
**Input:** HTML + Screenshots  
**Action:** Pull colors, fonts, logos, and visual style  
**Output:** Brand JSON with evidence links  
```json
{
  "colors": ["#0066FF", "#1A1A1A"],
  "fonts": ["Inter", "SF Pro Display"],
  "logo": "screenshot_ref_123",
  "tone": "professional, modern"
}
```

### Step 3: Analyze Homepage & Classify Visuals 📋
**Input:** Screenshots + HTML  
**Action:** LLM reviews and classifies visual elements  
**Output:** Structured analysis with:
- **Text content**: Headings, subheadings, CTAs (verbatim)
- **Visual Classification**:
  - **Photos/Illustrations** → One-line message they communicate
  - **UI Elements** → Rebuild-ready descriptions:
    - Precise layout (e.g., "3-column grid")
    - Exact styling (shadows, borders, spacing)
    - Component breakdown (buttons, inputs, cards)
- **Sections**: Hero, features, testimonials, pricing, etc.

### Step 4: Create Story (Hero's Journey) 📖
**Input:** Homepage analysis  
**Action:** Transform analysis into multi-scene narrative  
**Output:** Scene-by-scene plan where product is the hero
```
Scene 1: Hook (4s) - Hero headline with CTA
Scene 2: Problem (3s) - Pain points from features
Scene 3: Solution (5s) - Product UI showcase
Scene 4: Proof (4s) - Testimonials/logos
Scene 5: CTA (3s) - Final call to action
```

### Step 5: Smart Template Selection 🎯
**Input:** Individual scene descriptions + visual elements  
**Action:** Select best template for each scene  
**Rules:**
- **UI Template Preference**: When UI components exist → UI animation templates
- **Photo Template Match**: When photos exist → Visual/image templates
- **Capability Matching**: Template must support scene requirements
- **Brand Alignment**: Consider industry and style
**Output:** Scene ↔️ Template mapping with type preference

### Step 6: Generate Scenes with Rebuild Specs 🎬
**Input:** Brand JSON + Template + Scene description + Rebuild specs  
**Action:** Edit template code with:
- Actual content (verbatim text)
- Rebuild-ready UI descriptions
- Visual element context
**Output:** TSX code for each scene ready for Remotion

## 🔄 Data Flow Example

**Starting with:** `https://stripe.com`

1. **Crawl** → Screenshots of hero, features, pricing sections
2. **Brand** → `{colors: ["#635BFF", "#0A2540"], font: "Sohne"}`
3. **Analyze** → 
   - Text: "Financial infrastructure for the internet"
   - UI: Dashboard with charts (rebuild-ready specs)
   - Photos: Team collaboration (message: "Global reach")
4. **Story** → 5 scenes focusing on payment solutions
5. **Templates** → 
   - Scene 1 (has UI) → "DashboardAnimation" (UI template)
   - Scene 2 (has photo) → "ImageHero" (visual template)
6. **Generate** → TSX with exact Stripe content + rebuild specs

## ⚡ Key Principles

### ✅ DO
- Use **exact** text from the website
- Match **actual** colors and fonts
- Show **real** UI elements
- Keep videos **15-30 seconds**
- Preserve **brand identity**

### ❌ DON'T
- Make up content
- Use generic templates randomly
- Create long videos (60-90s)
- Paraphrase or interpret
- Add elements that don't exist

## 🎯 Success Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Fidelity** | 85%+ match | Videos look like the actual website |
| **Duration** | 15-30s | Focused, engaging content |
| **Processing** | <60s | Fast enough for user patience |
| **Evidence** | 100% | Every element traceable to source |

## 🚀 Implementation Status

### ✅ Already Built (Sprint 99)
- WebAnalysisAgentV4 (basic extraction)
- Hero's Journey generator
- Template selector (basic)
- Edit tool
- 45+ templates
- Preview panel

### 🔧 Key Enhancements Needed
- Better screenshot capture (Playwright)
- **Visual element classification** (photos vs UI)
- **Rebuild-ready UI descriptions**
- **UI template preference logic**
- Evidence tracking in Brand JSON
- Section-aware analysis
- Template capability metadata
- Metadata-driven template matching
- Brand context injection in Edit tool

## 💡 The Big Idea

Instead of creating a video "inspired by" a website, we're creating a video that **is** the website in motion. Every frame should be recognizable as coming from the original site.

**Before:** "Let me imagine what your site might look like animated"  
**After:** "Let me film your actual website with motion graphics"

---

*This is Sprint 99.5 - Building on Sprint 99's foundation to achieve true website fidelity.*