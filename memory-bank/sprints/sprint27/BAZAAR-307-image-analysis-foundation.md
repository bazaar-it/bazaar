# BAZAAR-307: Image Analysis Foundation

## 🏗️ Context & Architecture Overview

### Current System Architecture
Bazaar-Vid operates with a **dual-page architecture** developed across multiple sprints:

**🆕 New System (Sprint 24-26)**: `/projects/[id]/generate/page.tsx`
- **Primary Focus**: Modern workspace with scene-first generation
- **Key Features**: Chat-driven scene creation, real-time preview, Monaco code editor
- **Architecture**: 4-panel workspace (Chat, Preview, Storyboard, Code)
- **State Management**: Zustand-based video state with tRPC integration
- **Development Period**: Sprints 24, 25, 26 - our latest and most advanced functionality

**🔄 Legacy System (Sprint 16-22)**: `/projects/[id]/edit/page.tsx`  
- **Purpose**: Original timeline-based editor with complex panel system
- **Features**: Timeline editing, custom components panel, scene planning history
- **Architecture**: Resizable panels with drag-and-drop, timeline-centric workflow
- **Development Period**: Sprints 16, 19, 20, 21, 22 - stable but older approach

### 🎯 Sprint 27 Goal
**Integrate AI-powered image analysis into the NEW generate page workspace** to enable users to upload images and generate matching video scenes with consistent visual styling.

### 📋 Approach
1. **Focus Exclusively on `/generate` Page**: All image analysis features integrate with the modern workspace
2. **Enhance Chat Workflow**: Add drag/drop image upload to existing chat interface
3. **Preserve Legacy System**: Keep `/edit` page unchanged for backward compatibility
4. **Documentation Reference**: Sprint 24-26 folders contain workspace architecture and chat panel implementation

### 🖼️ Integration Strategy
- **Chat Panel**: Drag/drop image upload with AI analysis integration
- **Storyboard Panel**: Generate scenes based on image analysis results
- **Preview Panel**: Real-time preview of image-inspired scenes
- **Code Panel**: Show generated code with extracted style properties

---

**Priority**: P1 - Core Feature  
**Estimate**: 14-18 hours  
**Sprint**: 27  
**Status**: Planning  
**Depends On**: BAZAAR-305 (Architecture Cleanup)  

## 🎯 Objective

Build foundational image analysis capabilities to allow users to upload images and generate matching video scenes. Focus on MVP that can extract visual properties and create style-consistent content.

## 🎨 Vision

Enable users to upload any image (screenshot, design, photo) and have AI analyze it to generate similar Remotion scenes with matching colors, layout, and visual style.

## 📋 MVP Scope (Ship Fast, Iterate)

### Core User Flow
1. **Upload Image**: Drag/drop or file picker in workspace
2. **Analyze Visual Properties**: Extract colors, layout, style elements
3. **Generate Scene Suggestions**: AI creates scene descriptions based on analysis
4. **Apply to Video**: Use extracted properties in video generation
5. **Iterate**: Allow manual adjustments and refinements

## 🔧 Technical Implementation Strategy

### Phase 1: Image Upload & Storage (4h)
- [ ] **File Upload System**
  - Add drag/drop zone to workspace chat panel
  - Support common image formats (PNG, JPG, WebP, SVG)
  - File size validation and compression
  - Store images in R2 with proper CDN access

- [ ] **Upload UI Integration**
  - Add upload button to chat interface
  - Drag/drop visual feedback
  - Upload progress indicators
  - Image preview thumbnails

### Phase 2: Visual Analysis Engine (8h)
- [ ] **AI Vision Integration**
  - Integrate OpenAI Vision API (GPT-4V)
  - Create structured analysis prompts
  - Extract color palettes, layout patterns, typography
  - Identify visual elements and composition

- [ ] **Analysis Pipeline**
  - Queue-based image processing
  - Structured data extraction
  - Error handling for unsupported images
  - Analysis result caching

### Phase 3: Scene Generation (6h)
- [ ] **Style-Aware Scene Creation**
  - Generate scene descriptions from analysis
  - Apply extracted colors to scene properties
  - Create layout-inspired compositions
  - Generate style-consistent animations

- [ ] **Workspace Integration**
  - Show analysis results in chat
  - Allow scene generation from analysis
  - Preview generated scenes
  - Manual refinement options

## 🚀 MVP Implementation Details

### Database Schema
```sql
-- Image analysis tables
CREATE TABLE uploaded_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  project_id UUID REFERENCES projects(id),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  r2_url VARCHAR(500) NOT NULL,
  analysis_data JSONB, -- extracted visual properties
  analysis_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, complete, failed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE image_analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES uploaded_images(id),
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Analysis Data Structure
```typescript
interface ImageAnalysis {
  colors: {
    dominant: string[];
    palette: string[];
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  composition: {
    layout: 'centered' | 'grid' | 'asymmetric' | 'minimal';
    balance: 'symmetric' | 'asymmetric';
    focal_points: Array<{x: number, y: number, description: string}>;
    text_areas: Array<{x: number, y: number, width: number, height: number}>;
  };
  style: {
    aesthetic: 'modern' | 'classic' | 'minimal' | 'bold' | 'organic';
    mood: 'professional' | 'playful' | 'elegant' | 'energetic' | 'calm';
    typography_style?: 'serif' | 'sans-serif' | 'display' | 'script';
  };
  elements: {
    has_text: boolean;
    has_logo: boolean;
    has_people: boolean;
    has_products: boolean;
    primary_subject: string;
  };
  technical: {
    dimensions: {width: number, height: number};
    aspect_ratio: string;
    quality_score: number;
    complexity_score: number;
  };
}
```

### AI Vision Prompts
```typescript
const ANALYSIS_PROMPT = `
Analyze this image and extract visual properties for video generation:

1. COLOR ANALYSIS:
   - Identify the 5 most dominant colors (hex codes)
   - Determine primary, secondary, and accent colors
   - Assess overall color temperature (warm/cool)

2. COMPOSITION ANALYSIS:
   - Describe the layout structure
   - Identify focal points and visual hierarchy
   - Note text placement and sizing
   - Assess visual balance and symmetry

3. STYLE ANALYSIS:
   - Determine aesthetic style (modern, classic, minimal, etc.)
   - Assess mood and emotional tone
   - Identify typography characteristics if present
   - Note any distinctive design elements

4. CONTENT ANALYSIS:
   - Identify main subjects or elements
   - Note presence of text, logos, people, products
   - Describe the primary message or purpose

Return structured JSON matching the ImageAnalysis interface.
`;
```

### API Endpoints (tRPC)
```typescript
// Image analysis router
export const imageRouter = createTRPCRouter({
  // Upload image
  upload: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      filename: z.string(),
      fileSize: z.number(),
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => { /* Handle upload */ }),
  
  // Get upload URL for direct R2 upload
  getUploadUrl: protectedProcedure
    .input(z.object({
      filename: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => { /* Generate presigned URL */ }),
  
  // Analyze uploaded image
  analyze: protectedProcedure
    .input(z.object({ imageId: z.string() }))
    .mutation(async ({ ctx, input }) => { /* Start analysis */ }),
  
  // Get analysis results
  getAnalysis: protectedProcedure
    .input(z.object({ imageId: z.string() }))
    .query(async ({ ctx, input }) => { /* Return analysis */ }),
  
  // Generate scenes from analysis
  generateScenes: protectedProcedure
    .input(z.object({
      imageId: z.string(),
      sceneCount: z.number().default(3),
    }))
    .mutation(async ({ ctx, input }) => { /* Generate scenes */ }),
});
```

## 🎯 Success Criteria

### Technical
- [ ] Image upload works for 95% of common formats
- [ ] Analysis completes in < 60 seconds for typical images
- [ ] Color extraction accuracy > 85%
- [ ] Generated scenes reflect image style
- [ ] No impact on existing workspace performance

### User Experience
- [ ] Upload process is intuitive and fast
- [ ] Analysis results are visually clear
- [ ] Generated scenes are recognizably similar
- [ ] Error messages are helpful and actionable
- [ ] Integration feels natural in chat workflow

## 🚨 MVP Limitations (Iterate Later)

### What We're NOT Building Yet
- Advanced object detection
- Text extraction and OCR
- Multi-image analysis
- Style transfer algorithms
- Complex layout recreation
- Video-to-video analysis

### Known Edge Cases
- Very large images (handle with compression)
- Complex illustrations (basic analysis only)
- Low-quality images (graceful degradation)
- Abstract art (focus on colors/mood)
- Screenshots with UI elements (general analysis)

## 🔧 Implementation Approach

### Week 1: Upload Infrastructure
- R2 integration for image storage
- Upload UI in workspace
- File validation and processing
- Basic image metadata extraction

### Week 2: Analysis Engine
- OpenAI Vision API integration
- Structured analysis prompts
- Data extraction and storage
- Error handling and retries

### Week 3: Scene Generation
- Analysis-to-scene conversion
- Style application in generation
- UI for analysis results
- Testing with diverse images

## 📝 Technical Considerations

### Performance
- Async image processing with progress updates
- Image compression for faster analysis
- CDN delivery for uploaded images
- Efficient analysis result caching

### Quality
- Validate analysis results before storage
- Fallback prompts for unclear images
- Quality scoring for analysis confidence
- User feedback collection for improvements

### Security
- File type validation and sanitization
- Size limits and rate limiting
- Secure R2 access patterns
- User data privacy compliance

## 🔗 Integration Points

### Existing Systems
- **Chat Interface**: Add upload capabilities
- **Video Generation**: Enhance with visual analysis
- **R2 Storage**: Extend for image assets
- **Workspace UI**: Show analysis results

### Future Features
- **GitHub Integration**: Combine with repo analysis
- **Component Library**: Generate style-consistent components
- **Prompt Engineering**: Use analysis in advanced prompting

## 📊 Success Metrics

- Image upload success rate > 98%
- Analysis completion rate > 90%
- User satisfaction with generated scenes > 70%
- Time from upload to first generated scene < 3 minutes
- Feature adoption rate > 40% of active users

## 🎨 UI/UX Considerations

### Upload Experience
- Clear drag/drop zones with visual feedback
- Support for multiple images in one upload
- Progress indicators during upload and analysis
- Thumbnail previews in chat history

### Analysis Display
- Visual color palette display
- Style characteristics in readable format
- Confidence indicators for analysis quality
- Option to re-analyze with different prompts

### Scene Integration
- Preview generated scenes before applying
- Side-by-side comparison with original image
- Manual adjustment options for colors/style
- Easy application to existing project scenes 