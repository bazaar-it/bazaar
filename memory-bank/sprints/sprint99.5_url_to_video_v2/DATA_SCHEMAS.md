# URL to Video V2 - Data Schemas & Interfaces

## Note: Enhancing Existing Sprint 99 Schemas

These schemas build on existing infrastructure from Sprint 99. We're not creating new systems but enhancing:
- **BrandJSON**: Adding evidence tracking to existing extraction
- **Template Metadata**: Completing capability manifests for all 45 templates
- **Edit Tool Context**: Adding conditional brand injection
- **Scene Plans**: Linking to specific template requirements

## Core Type Definitions

```typescript
// Color representation
interface Color {
  hex: string           // #RRGGBB
  rgb?: [number, number, number]
  role?: 'primary' | 'secondary' | 'accent' | 'background' | 'text' | 'border'
  confidence?: number   // 0-1, how sure we are this is accurate
  source?: 'css' | 'computed' | 'image'
}

// Font specification
interface FontSpec {
  family: string        // e.g., "Inter"
  fallback?: string     // e.g., "sans-serif"
  weight: number        // 100-900
  size?: string         // e.g., "16px", "1.2rem"
  lineHeight?: string
  letterSpacing?: string
  source?: 'css' | 'computed'
}

// Bounding box for screenshots
interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

// Evidence tracking
interface Evidence {
  screenshotId?: string
  domSelector?: string
  bbox?: BoundingBox
  confidence: number    // 0-1
  extractedAt: string   // ISO timestamp
}
```

## 1. Extraction Schema

```typescript
interface WebExtractionRequest {
  url: string
  options?: {
    viewport?: { width: number; height: number }
    waitForSelector?: string
    scrollToBottom?: boolean
    blockResources?: string[]  // ['font', 'image', etc]
    userAgent?: string
    cookies?: Cookie[]
  }
}

interface WebExtractionResult {
  id: string
  url: string
  timestamp: string
  
  // HTML content
  html: {
    raw: string              // Original HTML
    cleaned: string          // Scripts/styles removed
    rendered: string         // Post-JS DOM snapshot
  }
  
  // Screenshots
  screenshots: Screenshot[]
  
  // Computed styles
  styles: {
    global: {
      palette: Color[]
      fonts: FontSpec[]
      cssVariables: Record<string, string>
    }
    elements: ElementStyle[]
  }
  
  // Page metadata
  metadata: {
    title?: string
    description?: string
    ogTags?: Record<string, string>
    viewport?: string
    language?: string
    favicon?: string
  }
  
  // Extraction metadata
  performance: {
    duration: number         // ms
    resourceCount: number
    errors: string[]
  }
}

interface Screenshot {
  id: string                 // Unique identifier
  type: 'full' | 'viewport' | 'section' | 'element'
  url: string                // R2/S3 URL
  
  // Location info
  location?: {
    selector?: string        // DOM selector
    bbox?: BoundingBox
    sectionId?: string       // Which section this belongs to
  }
  
  // Image metadata
  dimensions: {
    width: number
    height: number
  }
  format: 'png' | 'webp' | 'jpeg'
  size: number              // bytes
}

interface ElementStyle {
  selector: string
  computed: {
    // Typography
    fontFamily?: string
    fontSize?: string
    fontWeight?: string
    lineHeight?: string
    color?: string
    
    // Layout
    display?: string
    position?: string
    width?: string
    height?: string
    padding?: string
    margin?: string
    
    // Visual
    backgroundColor?: string
    backgroundImage?: string
    border?: string
    borderRadius?: string
    boxShadow?: string
  }
}
```

## 2. BrandJSON Schema

```typescript
interface BrandJSON {
  id: string
  url: string
  extractionId: string
  createdAt: string
  
  // Brand identity
  brand: {
    name?: string
    tagline?: string
    archetype?: BrandArchetype
    voice: VoiceTone[]
    evidence: Evidence
  }
  
  // Design system
  design: {
    colors: {
      primary: Color
      secondary?: Color
      accent?: Color
      background: Color
      text: Color
      muted?: Color
      evidence: Evidence
    }
    
    typography: {
      headings: FontSpec
      body: FontSpec
      ui?: FontSpec
      code?: FontSpec
      evidence: Evidence
    }
    
    spacing: {
      unit: number           // Base unit in px
      scale: number[]        // e.g., [4, 8, 16, 24, 32]
    }
    
    borders: {
      radius: string         // e.g., "8px"
      width: string          // e.g., "1px"
      color: Color
    }
  }
  
  // Page sections
  sections: Section[]
  
  // Global confidence score
  confidence: {
    overall: number          // 0-1
    breakdown: {
      structure: number
      content: number
      visual: number
    }
  }
}

interface Section {
  id: string                 // e.g., "hero", "features", "testimonials"
  name: string
  type: SectionType
  order: number
  
  // Evidence & confidence
  evidence: Evidence
  
  // Visual Elements (New: classified)
  visualElements: {
    photos: PhotoElement[]
    uiComponents: UIComponentElement[]
  }
  
  // Content extraction
  content: {
    headline?: TextContent
    subheadline?: TextContent
    body?: TextContent[]
    bullets?: TextContent[]
    ctas?: CTA[]
  }
  
  // UI Components in this section
  components: UIComponent[]
  
  // Visual properties
  visual: {
    layout: LayoutType
    alignment: 'left' | 'center' | 'right'
    background?: {
      type: 'color' | 'gradient' | 'image'
      value: string
    }
    spacing: 'compact' | 'normal' | 'spacious'
    screenshots: string[]    // Screenshot IDs
  }
}

// Photo/Illustration element
interface PhotoElement {
  id: string
  screenshotRef: string
  message: string            // One-line description of what it communicates
  purpose: 'hero' | 'feature' | 'testimonial' | 'decoration' | 'product'
  evidence: Evidence
}

// UI Component element with rebuild specs
interface UIComponentElement {
  id: string
  type: 'dashboard' | 'card' | 'form' | 'chart' | 'interface' | 'widget'
  rebuildSpec: {
    layout: string           // e.g., "3-column grid", "vertical stack"
    styling: {
      borderRadius?: string
      shadows?: string
      spacing?: string
    }
    components: string[]     // e.g., ["search bar", "filter buttons", "data table"]
    interactions?: string[]  // e.g., ["hover states", "click to expand"]
  }
  evidence: Evidence
}

interface UIComponent {
  id: string
  type: ComponentType
  variant?: string           // e.g., "primary", "outlined"
  
  // Must have evidence
  evidence: Evidence
  
  // Component-specific content
  content: {
    // Text content
    title?: TextContent
    subtitle?: TextContent
    description?: TextContent
    items?: TextContent[]
    
    // Media
    image?: {
      screenshotId: string
      alt?: string
      crop?: BoundingBox
    }
    
    icon?: {
      type: string           // e.g., "check", "arrow"
      color?: Color
    }
    
    // Interactive
    button?: {
      label: string
      href?: string
      variant?: string
    }
  }
  
  // Visual style
  style: {
    colors: {
      background?: Color
      text?: Color
      border?: Color
    }
    typography?: {
      title?: FontSpec
      body?: FontSpec
    }
    dimensions?: {
      width?: string
      height?: string
      aspectRatio?: string
    }
    spacing?: {
      padding?: string
      margin?: string
      gap?: string
    }
  }
}

interface TextContent {
  text: string               // Verbatim text
  formatted?: string         // With HTML formatting
  tokens?: number            // For LLM context
  evidence: Evidence
}

interface CTA {
  label: string
  href?: string
  type: 'primary' | 'secondary' | 'text'
  icon?: string
  evidence: Evidence
}

// Enums
type SectionType = 
  | 'hero'
  | 'features'
  | 'benefits'
  | 'how-it-works'
  | 'testimonials'
  | 'pricing'
  | 'faq'
  | 'team'
  | 'stats'
  | 'cta'
  | 'footer'
  | 'other'

type ComponentType =
  | 'hero-banner'
  | 'feature-card'
  | 'testimonial-card'
  | 'pricing-card'
  | 'stat-block'
  | 'logo-marquee'
  | 'image-gallery'
  | 'video-player'
  | 'code-block'
  | 'comparison-table'
  | 'timeline'
  | 'accordion'
  | 'tabs'
  | 'form'
  | 'newsletter'
  | 'other'

type LayoutType =
  | 'single-column'
  | 'two-column'
  | 'three-column'
  | 'grid'
  | 'masonry'
  | 'carousel'
  | 'stack'

type VoiceTone =
  | 'professional'
  | 'casual'
  | 'playful'
  | 'serious'
  | 'minimal'
  | 'bold'
  | 'technical'
  | 'friendly'
  | 'premium'
  | 'approachable'

type BrandArchetype =
  | 'innovator'
  | 'authority'
  | 'challenger'
  | 'helper'
  | 'entertainer'
  | 'explorer'
  | 'creator'
  | 'ruler'
  | 'magician'
  | 'hero'
  | 'outlaw'
  | 'everyman'
```

## 3. Scene Plan Schema

```typescript
interface ScenePlan {
  id: string
  order: number
  
  // Narrative structure
  narrative: {
    purpose: ScenePurpose
    title: string
    keyMessage: string       // One clear point
    emotionalBeat: EmotionalBeat
    voTone?: 'energetic' | 'calm' | 'serious' | 'playful'
  }
  
  // Source references (REQUIRED)
  sources: {
    sections: Array<{
      sectionId: string
      usage: 'primary' | 'supporting'
    }>
    components: Array<{
      componentId: string
      usage: 'full' | 'partial'
    }>
    screenshots: Array<{
      screenshotId: string
      purpose: 'background' | 'hero' | 'detail'
    }>
  }
  
  // Content specification
  content: {
    // On-screen text (verbatim from sources)
    onScreen: {
      headline?: {
        text: string
        source: string       // component/section ID
      }
      subtext?: {
        text: string[]
        source: string
      }
      bullets?: {
        items: string[]
        source: string
      }
    }
    
    // Optional voiceover
    voiceover?: {
      script: string
      duration: number       // ms
      timing: 'sync' | 'lead' | 'follow'
    }
    
    // Background music
    music?: {
      mood: MusicMood
      volume: number         // 0-1
      fadeIn?: number        // ms
      fadeOut?: number       // ms
    }
  }
  
  // Visual specification
  visual: {
    // Template selection
    templates: {
      preferred: string[]    // Ordered by preference
      required: TemplateRequirement[]
      forbidden: string[]    // Templates to avoid
    }
    
    // Layout preferences
    layout: {
      type: LayoutType
      alignment: 'left' | 'center' | 'right'
      density: 'sparse' | 'normal' | 'dense'
    }
    
    // Motion & animation
    motion: {
      style: MotionStyle
      speed: 'slow' | 'normal' | 'fast'
      complexity: 'simple' | 'moderate' | 'complex'
    }
    
    // Transitions
    transitions: {
      in: TransitionSpec
      out: TransitionSpec
    }
  }
  
  // Technical specifications
  specs: {
    duration: {
      target: number         // ms
      min: number
      max: number
    }
    aspectRatio: AspectRatio
    resolution: Resolution
    fps: number
  }
  
  // Quality requirements
  quality: {
    minFidelityScore: number // 0-1
    requiredElements: string[]
    forbiddenElements: string[]
  }
}

interface TransitionSpec {
  type: TransitionType
  duration: number           // ms
  easing: EasingFunction
}

interface TemplateRequirement {
  capability: string         // e.g., "multi-image", "data-viz"
  priority: 'must' | 'should' | 'nice'
}

// Enums
type ScenePurpose =
  | 'hook'
  | 'problem'
  | 'solution'
  | 'feature'
  | 'benefit'
  | 'social-proof'
  | 'how-it-works'
  | 'pricing'
  | 'cta'
  | 'outro'

type EmotionalBeat =
  | 'intrigue'
  | 'tension'
  | 'relief'
  | 'excitement'
  | 'trust'
  | 'urgency'
  | 'inspiration'
  | 'satisfaction'

type MotionStyle =
  | 'minimal'
  | 'smooth'
  | 'snappy'
  | 'bouncy'
  | 'dramatic'
  | 'glitch'
  | 'organic'

type TransitionType =
  | 'cut'
  | 'fade'
  | 'dissolve'
  | 'wipe'
  | 'slide'
  | 'push'
  | 'zoom'
  | 'morph'

type MusicMood =
  | 'upbeat'
  | 'corporate'
  | 'inspirational'
  | 'minimal'
  | 'epic'
  | 'playful'
  | 'serious'
  | 'ambient'

type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '21:9'
type Resolution = '720p' | '1080p' | '4k'
type EasingFunction = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier'
```

## 4. Edit Tool Context Schema

**This is what we pass to the existing Edit tool for brand-aware generation**

```typescript
interface EditToolContext {
  // Template code from registry
  tsxCode: string
  
  // Scene requirements from Hero's Journey
  userPrompt: string
  
  // Brand context for faithful generation
  webContext: {
    originalUrl: string
    pageData: BrandJSON       // With evidence tracking
    visualElements?: {
      photos?: Array<{
        url: string
        message: string       // One-line description
      }>
      uiComponents?: Array<{
        type: string
        rebuildSpec: {        // Precise rebuild instructions
          layout: string
          styling: CSSProperties
          components: string[]
        }
      }>
    }
  }
  
  // Screenshots for visual reference
  imageUrls: string[]          // R2 URLs
  
  // Template preference hint
  templatePreference?: 'ui' | 'text' | 'animation'
  
  // Previous scenes for consistency
  referenceScenes?: Array<{
    id: string
    tsxCode: string
  }>
}

interface EditInstruction {
  id: string
  sceneId: string
  templateId: string
  
  // Binding specification (all verbatim/direct)
  bindings: {
    // Text bindings (key = template slot, value = actual text)
    texts: Record<string, TextBinding>
    
    // Image bindings
    images: Record<string, ImageBinding>
    
    // Style bindings
    styles: {
      colors: Record<string, string>     // hex values
      fonts: Record<string, FontBinding>
      spacing: Record<string, string>    // px/rem values
    }
    
    // Data bindings (for charts/graphs)
    data?: Record<string, DataBinding>
  }
  
  // Animation configuration
  animation: {
    duration: number         // ms
    delay?: number
    easing: EasingFunction
    stagger?: {
      amount: number         // ms between elements
      from: 'start' | 'center' | 'end' | 'random'
    }
  }
  
  // Transition configuration
  transitions: {
    in: TransitionConfig
    out: TransitionConfig
  }
  
  // Validation results
  validation: {
    allRequiredBindings: boolean
    passesContrast: boolean
    passesReadability: boolean
    warnings: string[]
    score: number            // 0-100
  }
  
  // Render metadata
  render: {
    priority: number
    retryOnFail: boolean
    maxRetries: number
  }
}

interface TextBinding {
  value: string              // The actual text
  source: {
    type: 'section' | 'component'
    id: string
    field: string            // e.g., "headline", "cta.label"
  }
  truncate?: {
    maxLength: number
    ellipsis: boolean
  }
  transform?: 'uppercase' | 'lowercase' | 'capitalize'
}

interface ImageBinding {
  source: {
    type: 'screenshot' | 'asset' | 'generated'
    id: string
    url?: string
  }
  crop?: BoundingBox
  resize?: {
    width: number
    height: number
    fit: 'cover' | 'contain' | 'fill'
  }
  filters?: {
    blur?: number
    brightness?: number
    contrast?: number
    grayscale?: boolean
  }
}

interface FontBinding {
  family: string
  weight: number
  size: string
  lineHeight?: string
  letterSpacing?: string
  fallback: string           // System font fallback
}

interface DataBinding {
  type: 'number' | 'percentage' | 'currency' | 'array'
  value: any
  format?: string            // e.g., "0,0.00", "$0.00"
  source: {
    type: 'extracted' | 'computed'
    id: string
  }
}

interface TransitionConfig {
  type: TransitionType
  duration: number
  easing: EasingFunction
  direction?: 'left' | 'right' | 'up' | 'down'
  distance?: string          // e.g., "100px", "50%"
}
```

## 5. Template Manifest Schema (CRITICAL FOR ROUTER)

**This is the most important schema for V2 - it enables metadata-driven template selection**

```typescript
// Enhanced from /src/templates/metadata.ts (Sprint 99)
interface TemplateManifest {
  id: string
  name: string
  version: string
  category: TemplateCategory
  
  // Technical Requirements (for Remotion compilation)
  requirements: {
    // Text requirements
    texts: {
      headline: SlotRequirement
      subheadline?: SlotRequirement
      body?: SlotRequirement
      bullets?: {
        min: number
        max: number
        itemLength: number
      }
      cta?: SlotRequirement
    }
    
    // Image requirements
    images: {
      hero?: ImageRequirement
      background?: ImageRequirement
      cards?: {
        min: number
        max: number
        aspectRatio?: string
      }
      logos?: {
        min: number
        max: number
      }
    }
    
    // Style requirements
    styles: {
      colors: string[]       // Required color keys
      fonts: string[]        // Required font keys
      customizable: boolean
    }
    
    // Data requirements (for data viz)
    data?: {
      type: 'series' | 'categories' | 'tree'
      format: string
    }
  }
  
  // What this template can do
  capabilities: {
    duration: {
      default: number
      min: number
      max: number
      step: number           // Increment size
    }
    
    aspectRatios: AspectRatio[]
    resolutions: Resolution[]
    
    motion: {
      styles: MotionStyle[]
      complexity: 1 | 2 | 3 | 4 | 5
      customizable: boolean
    }
    
    features: TemplateFeature[]
  }
  
  // Scoring hints for template router
  scoring: {
    preferredFor: ScenePurpose[]  // +40 points
    industries?: Industry[]        // +30 points
    archetypes?: BrandArchetype[]  // +25 points
    audiences?: string[]           // +20 points
  }
  
  // When to use this template
  usage: {
    bestFor: ScenePurpose[]
    industries?: Industry[]
    avoid?: string[]         // Scenarios to avoid
    pairs: string[]          // Templates that work well together
  }
  
  // Performance characteristics
  performance: {
    renderTime: 'fast' | 'moderate' | 'slow'
    cpuIntensive: boolean
    memoryUsage: 'low' | 'moderate' | 'high'
  }
}

interface SlotRequirement {
  required: boolean
  minLength?: number
  maxLength: number
  multiline?: boolean
  richText?: boolean
}

interface ImageRequirement {
  required: boolean
  aspectRatio?: string
  minResolution?: {
    width: number
    height: number
  }
  formats: string[]          // ['png', 'jpg', 'webp']
}

type TemplateCategory =
  | 'hero'
  | 'content'
  | 'data-viz'
  | 'social-proof'
  | 'cta'
  | 'transition'
  | 'outro'

type TemplateFeature =
  | 'responsive-text'
  | 'image-parallax'
  | 'data-animation'
  | 'particle-effects'
  | 'morphing'
  | 'masking'
  | '3d-transforms'
  | 'video-bg'

type Industry =
  | 'saas'
  | 'fintech'
  | 'healthcare'
  | 'education'
  | 'ecommerce'
  | 'marketing'
  | 'developer-tools'
  | 'enterprise'
  | 'consumer'
  | 'nonprofit'
```

## 6. Pipeline Output Schema (TSX Code, Not Video)

```typescript
interface PipelineOutput {
  id: string
  projectId: string
  
  // Generated TSX scenes (not rendered video)
  scenes: Array<{
    id: string
    order: number
    tsxCode: string            // Goes to PreviewPanelG
    compilationStatus: 'pending' | 'success' | 'error'
    errors?: string[]
  }>
  
  // Metadata for tracking
  metadata: {
    url: string
    brandJsonId: string
    scenePlanId: string
    totalDuration: number      // ms
    generatedAt: string
  }
}

interface PipelineJob {
  id: string
  url: string
  status: JobStatus
  
  // Job configuration
  config: {
    targetDuration?: number  // ms
    aspectRatio?: AspectRatio
    resolution?: Resolution
    style?: 'minimal' | 'balanced' | 'rich'
    music?: boolean
    voiceover?: boolean
  }
  
  // Artifacts produced (TSX code, not video)
  artifacts: {
    extractionId?: string
    brandJsonId?: string
    scenePlanId?: string
    editInstructionsId?: string
    tsxScenes?: string[]       // Array of scene IDs with TSX code
  }
  
  // Progress tracking
  progress: {
    stage: PipelineStage
    percentage: number       // 0-100
    message?: string
  }
  
  // Performance metrics
  metrics: {
    extraction?: StageMetrics
    analysis?: StageMetrics
    composition?: StageMetrics
    matching?: StageMetrics
    rendering?: StageMetrics
  }
  
  // Error handling
  errors: PipelineError[]
  retries: number
  
  // Timestamps
  createdAt: string
  startedAt?: string
  completedAt?: string
}

interface StageMetrics {
  duration: number           // ms
  success: boolean
  confidence?: number        // 0-1
  itemsProcessed?: number
  warnings?: string[]
}

interface PipelineError {
  stage: PipelineStage
  code: string
  message: string
  details?: any
  timestamp: string
  recoverable: boolean
}

type JobStatus =
  | 'pending'
  | 'extracting'
  | 'analyzing'
  | 'composing'
  | 'matching'
  | 'generating'      // Edit tool TSX generation
  | 'compiling'       // PreviewPanelG compilation
  | 'complete'
  | 'failed'
  | 'cancelled'

type PipelineStage =
  | 'initialization'
  | 'extraction'
  | 'analysis'
  | 'composition'
  | 'matching'
  | 'generation'       // Edit tool calls
  | 'compilation'      // TSX compilation in PreviewPanelG
  | 'finalization'
```