# Sprint 52: Intelligent Web Agent for Brand-Aware Video Generation

## Overview

Implement an autonomous web agent that can analyze user websites through browser automation, extract brand identity, and provide contextual information to enhance video generation with perfect brand alignment.

## Core Concept

```
User Input: "Create a video for my startup: https://mysite.com"
    ↓
Web Agent: Visit site → Screenshots → Brand Analysis → Context
    ↓
Enhanced Generation: Video matches exact brand colors, fonts, messaging
```

## Technical Architecture

### Web Analysis Agent
```typescript
// /src/tools/webAnalysis/WebAnalysisAgent.ts
export class WebAnalysisAgent {
  private browser: Browser;
  private analysisService: OpenAIService;
  
  async analyzeWebsite(url: string): Promise<WebAnalysisResult> {
    // 1. Browser automation
    const page = await this.createPage(url);
    
    // 2. Multi-section screenshot capture
    const screenshots = await this.captureScreenshots(page);
    
    // 3. Structured data extraction
    const pageData = await this.extractPageData(page);
    
    // 4. AI-powered visual analysis
    const brandAnalysis = await this.analyzeBrand(screenshots, pageData);
    
    // 5. Generate video context
    return this.generateVideoContext(brandAnalysis);
  }
  
  private async captureScreenshots(page: Page) {
    return {
      hero: await this.captureHeroSection(page),
      navigation: await this.captureNavigation(page),
      features: await this.captureFeatures(page),
      footer: await this.captureFooter(page),
      fullPage: await page.screenshot({ fullPage: true }),
      mobile: await this.captureMobile(page)
    };
  }
  
  private async extractPageData(page: Page) {
    return await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content,
      headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.textContent),
      colors: this.extractColors(),
      fonts: this.extractFonts(),
      structure: this.analyzeLayout(),
      ctaButtons: this.extractCTAs(),
      brandElements: this.extractBrandElements()
    }));
  }
}
```

### Integration with Existing System

#### Context Builder Integration
```typescript
// /src/brain/orchestrator_functions/contextBuilder.ts

export async function buildWebContext(
  chatHistory: ChatMessage[],
  currentProjectId: string
): Promise<WebContext> {
  // Extract URLs from chat history
  const urls = extractWebUrls(chatHistory);
  
  if (urls.length === 0) return null;
  
  // Analyze most recent or relevant URL
  const webAgent = new WebAnalysisAgent();
  const analysis = await webAgent.analyzeWebsite(urls[0]);
  
  return {
    originalUrl: urls[0],
    brandIdentity: analysis.brandIdentity,
    screenshots: analysis.screenshots,
    designPatterns: analysis.designPatterns,
    contentThemes: analysis.contentThemes,
    visualStyle: analysis.visualStyle
  };
}
```

#### Brain Orchestrator Enhancement
```typescript
// /src/brain/orchestratorNEW.ts

async process(input: GenerateSceneInput): Promise<GenerationResult> {
  // Build enhanced context including web analysis
  const context = await this.contextBuilder.buildContext(
    input.chatHistory,
    input.projectId,
    input.currentState,
    { includeWebAnalysis: true } // NEW: Web context
  );
  
  // Rest of orchestrator logic unchanged
  const intent = await this.analyzeIntent(input.prompt, context);
  const tools = this.selectTools(intent);
  
  return await this.executeTools(tools, context);
}
```

#### Enhanced Tool Context
```typescript
// /src/tools/add/add.ts

export async function addScene(
  input: AddSceneInput,
  context: EnhancedContext // Now includes WebContext
): Promise<AddSceneResult> {
  
  // Build generation prompt with web context
  const prompt = buildPrompt({
    userRequest: input.prompt,
    sceneContext: context.scenes,
    webContext: context.web, // NEW: Brand-aware generation
    imageContext: context.images,
    preferences: context.preferences
  });
  
  // Generate scene code with brand alignment
  const sceneCode = await generateSceneCode(prompt);
  
  return {
    sceneCode,
    brandAlignment: context.web?.brandIdentity,
    styleMatching: true
  };
}
```

## Feature Specifications

### Web Analysis Capabilities

#### 1. Visual Analysis
- **Screenshot Capture**: Hero, navigation, key sections, mobile view
- **Color Extraction**: Primary, secondary, accent colors with hex codes
- **Typography Analysis**: Font families, sizes, weights, hierarchy
- **Layout Patterns**: Grid systems, spacing, composition rules
- **Visual Elements**: Logos, icons, imagery style, brand elements

#### 2. Content Analysis
- **Messaging Extraction**: Headlines, value propositions, CTAs
- **Content Themes**: Business type, industry, tone of voice
- **User Journey**: Flow through site, key conversion points
- **Competitive Context**: Market positioning, differentiation

#### 3. Technical Analysis
- **Performance Metrics**: Load times, optimization level
- **Responsive Design**: Mobile adaptation, breakpoints
- **SEO Elements**: Meta tags, structured data, keywords
- **Technology Stack**: Framework detection, feature analysis

### Brand Identity Extraction

```typescript
interface BrandIdentity {
  colors: {
    primary: string[];
    secondary: string[];
    accent: string[];
    background: string[];
  };
  typography: {
    headings: FontAnalysis;
    body: FontAnalysis;
    accent: FontAnalysis;
  };
  visualStyle: {
    modern: boolean;
    minimalist: boolean;
    playful: boolean;
    professional: boolean;
    creative: boolean;
  };
  messaging: {
    tone: 'professional' | 'casual' | 'friendly' | 'authoritative';
    valueProps: string[];
    keywords: string[];
  };
  layoutPatterns: {
    gridSystem: string;
    spacing: string;
    hierarchy: string;
  };
}
```

### Video Generation Enhancement

#### Brand-Aware Prompts
```typescript
const enhancedPrompt = `
Create a video scene that matches this brand identity:

BRAND COLORS: ${webContext.colors.primary.join(', ')}
VISUAL STYLE: ${webContext.visualStyle}
MESSAGING TONE: ${webContext.messaging.tone}
LAYOUT PREFERENCE: ${webContext.layoutPatterns}

USER REQUEST: ${userPrompt}

Generate Remotion code that maintains brand consistency...
`;
```

#### Style Transfer
- Apply extracted colors to generated elements
- Match typography hierarchy and spacing
- Replicate visual composition patterns
- Align animation style with brand personality

## Implementation Plan

### Phase 1: Core Web Agent (4 hours)
1. **Browser Automation Setup**
   - Install Playwright/Puppeteer
   - Create page navigation and screenshot system
   - Handle common website patterns and edge cases

2. **Data Extraction System**
   - DOM analysis for structured data
   - Color and font extraction algorithms
   - Layout pattern recognition

3. **AI Analysis Integration**
   - OpenAI Vision API for screenshot analysis
   - Brand identity classification
   - Style pattern recognition

### Phase 2: Context Integration (2 hours)
1. **Context Builder Enhancement**
   - Add web context building to existing system
   - URL detection and extraction from chat
   - Cache analysis results for performance

2. **Tool Enhancement**
   - Update Add Scene tool with web context
   - Update Edit Scene tool with brand awareness
   - Enhance generation prompts

### Phase 3: User Experience (2 hours)
1. **Chat Interface Updates**
   - URL detection and preview
   - Progress indicators during analysis
   - Brand identity display in chat

2. **Error Handling**
   - Network timeout handling
   - Invalid URL handling
   - Privacy/access restriction handling

### Phase 4: Advanced Features (4 hours)
1. **Multi-page Analysis**
   - Analyze multiple pages (about, pricing, features)
   - Comprehensive brand understanding
   - Content theme extraction

2. **Performance Optimization**
   - Caching system for analyzed sites
   - Parallel screenshot capture
   - Efficient browser resource management

3. **Storage & Persistence**
   - Store screenshots in Cloudflare R2
   - Save brand analysis in project memory
   - Enable brand reference in future generations

## Technical Requirements

### Dependencies
```json
{
  "playwright": "^1.40.0",
  "sharp": "^0.32.0",
  "canvas": "^2.11.0",
  "color-thief": "^2.4.0",
  "openai": "^4.20.0"
}
```

### Infrastructure
- **Browser Pool**: Managed Playwright instances
- **Screenshot Storage**: Cloudflare R2 integration
- **Analysis Cache**: Redis for repeated URL analysis
- **Rate Limiting**: Prevent abuse and resource exhaustion

### Database Schema Extension
```sql
-- Add to existing schema
ALTER TABLE projects ADD COLUMN web_analysis_data JSONB;
ALTER TABLE projects ADD COLUMN analyzed_urls TEXT[];

-- New table for web analysis cache
CREATE TABLE web_analysis_cache (
  id SERIAL PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  analysis_data JSONB NOT NULL,
  screenshot_urls JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  INDEX(url),
  INDEX(expires_at)
);
```

## User Experience Flow

### 1. URL Detection
```
User: "Create a video for our SaaS: https://ourapp.com"
System: 🔍 Detected website URL - analyzing for brand context...
```

### 2. Analysis Progress
```
🌐 Visiting website...
📸 Capturing brand elements...
🎨 Extracting colors and fonts...
🧠 Understanding brand personality...
✨ Ready to create brand-aligned video!
```

### 3. Brand Context Display
```
📊 Brand Analysis Complete:
Colors: #2563EB, #1D4ED8, #F3F4F6
Style: Modern, Professional, Clean
Messaging: Efficient, Reliable, Innovative

Generating video that matches your brand...
```

### 4. Enhanced Generation
- Generated videos automatically use brand colors
- Typography matches website hierarchy
- Animation style aligns with brand personality
- Content themes reflect website messaging

## Success Metrics

### Technical Metrics
- **Analysis Speed**: < 10 seconds for standard websites
- **Accuracy**: 90%+ color extraction accuracy
- **Reliability**: Handle 95% of website types
- **Performance**: No impact on existing generation speed

### User Experience Metrics
- **Brand Alignment**: User satisfaction with brand matching
- **Adoption Rate**: Percentage of users providing URLs
- **Conversion**: Improved video quality ratings
- **Retention**: Increased usage after web analysis feature

## Security & Privacy Considerations

### Data Handling
- **Screenshot Storage**: Secure R2 storage with expiration
- **URL Validation**: Prevent malicious URL injection
- **Rate Limiting**: Prevent abuse of analysis system
- **Cache Management**: Automatic cleanup of old analyses

### Privacy Compliance
- **User Consent**: Clear disclosure of website analysis
- **Data Retention**: Automatic deletion of cached data
- **Third-party Sites**: Respect robots.txt and privacy policies
- **Sensitive Content**: Detection and filtering system

## Future Enhancements

### Advanced Analysis
- **Competitor Analysis**: Compare multiple websites
- **A/B Testing**: Analyze different page versions
- **Seasonal Adaptation**: Detect and adapt to seasonal themes
- **Industry Intelligence**: Sector-specific analysis patterns

### AI Improvements
- **Style Transfer**: Direct visual style application
- **Content Personalization**: Adapt messaging for different audiences
- **Performance Optimization**: Faster analysis with edge computing
- **Multi-modal Analysis**: Video, audio, and interactive element analysis

## Integration with Sprint 51 (Admin Separation)

This feature will be developed after the admin separation is complete:
- **Admin monitoring**: Web analysis usage analytics
- **Error tracking**: Monitor failed analyses
- **Performance metrics**: Track analysis speed and accuracy
- **User feedback**: Collect brand alignment satisfaction data

## Testing Strategy

### Unit Tests
- Web scraping accuracy
- Color extraction precision
- Font detection reliability
- Brand analysis consistency

### Integration Tests
- Full user flow from URL to video
- Context integration with existing tools
- Performance under load
- Error handling scenarios

### User Acceptance Tests
- Brand alignment quality
- Generation speed impact
- User interface usability
- Cross-browser compatibility

---

**Estimated Total Implementation Time: 12-16 hours**
**Priority: High (Killer feature for user experience)**
**Dependencies: Complete Sprint 51 (Admin Separation) first**

This feature transforms Bazaar-Vid from a generic video generator to a brand-aware video creation platform, significantly increasing user satisfaction and output quality.