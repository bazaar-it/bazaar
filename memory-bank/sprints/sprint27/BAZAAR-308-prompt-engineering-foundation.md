# BAZAAR-308: Prompt Engineering System Foundation

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
**Enhance the NEW generate page with advanced prompt engineering capabilities** to improve animation quality, enable easy model switching, and provide systematic generation optimization.

### 📋 Approach
1. **Focus Exclusively on `/generate` Page**: All prompt engineering features enhance the modern workspace
2. **Enhance Chat Experience**: Improve the chat-driven generation with better prompts and model options
3. **Preserve Legacy System**: Keep `/edit` page unchanged for backward compatibility
4. **Documentation Reference**: Sprint 24-26 folders contain chat panel implementation and generation router details

### ⚙️ Integration Strategy
- **Chat Panel**: Model selection UI and prompt template suggestions
- **Generation Router**: Enhanced prompt templates and A/B testing infrastructure
- **Storyboard Panel**: Quality metrics and generation success tracking
- **Code Panel**: Show prompt effectiveness and model performance data

---

**Priority**: P1 - Core Feature  
**Estimate**: 12-16 hours  
**Sprint**: 27  
**Status**: Planning  
**Depends On**: BAZAAR-305 (Architecture Cleanup)  

## 🎯 Objective

Build a flexible prompt engineering system that makes it easy to change models, improve animation focus, and iterate on generation quality. Focus on developer experience and rapid experimentation.

## 🎨 Vision

Create a system where prompt engineering becomes a first-class citizen, allowing easy model switching, prompt versioning, and systematic improvement of generation quality through data-driven iteration.

## 📋 MVP Scope (Ship Fast, Iterate)

### Core Features
1. **Model Management**: Easy switching between OpenAI models
2. **Prompt Templates**: Structured, versioned prompt system
3. **Animation Focus**: Enhanced prompts for better animation generation
4. **A/B Testing**: Compare prompt variations systematically
5. **Quality Metrics**: Track generation success rates and quality

## 🔧 Technical Implementation Strategy

### Phase 1: Model Management System (4h)
- [ ] **Model Configuration**
  - Centralized model configuration system
  - Environment-based model selection
  - Runtime model switching capability
  - Model-specific parameter tuning

- [ ] **Model Registry**
  - Support for multiple OpenAI models (GPT-4, GPT-4-turbo, o1-mini, etc.)
  - Model capability mapping (vision, function calling, etc.)
  - Cost and performance tracking per model
  - Fallback model configuration

### Phase 2: Prompt Template System (6h)
- [ ] **Template Architecture**
  - Structured prompt templates with variables
  - Version control for prompt iterations
  - Template inheritance and composition
  - Dynamic prompt assembly based on context

- [ ] **Animation-Focused Templates**
  - Specialized prompts for different animation types
  - Enhanced scene generation prompts
  - Component generation improvements
  - Style-aware prompt variations

### Phase 3: Experimentation Framework (6h)
- [ ] **A/B Testing Infrastructure**
  - Prompt variation testing
  - Success rate tracking
  - Quality scoring system
  - Statistical significance testing

- [ ] **Analytics & Monitoring**
  - Generation success metrics
  - Model performance tracking
  - Cost optimization insights
  - Quality trend analysis

## 🚀 MVP Implementation Details

### Database Schema
```sql
-- Prompt engineering tables
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL, -- scene_generation, component_creation, etc.
  template_content TEXT NOT NULL,
  variables JSONB NOT NULL, -- template variable definitions
  model_requirements JSONB, -- required model capabilities
  is_active BOOLEAN DEFAULT false,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, version)
);

CREATE TABLE model_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL, -- openai, anthropic, etc.
  model_id VARCHAR(100) NOT NULL, -- gpt-4-turbo, claude-3, etc.
  capabilities JSONB NOT NULL, -- vision, function_calling, etc.
  parameters JSONB NOT NULL, -- temperature, max_tokens, etc.
  cost_per_token DECIMAL(10,8),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE generation_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  prompt_template_id UUID REFERENCES prompt_templates(id),
  model_config_id UUID REFERENCES model_configurations(id),
  test_parameters JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- active, paused, completed
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE generation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES generation_experiments(id),
  project_id UUID REFERENCES projects(id),
  user_id VARCHAR(255) NOT NULL,
  prompt_used TEXT NOT NULL,
  model_used VARCHAR(100) NOT NULL,
  input_data JSONB NOT NULL,
  output_data JSONB,
  success BOOLEAN NOT NULL,
  quality_score DECIMAL(3,2), -- 0.00 to 1.00
  execution_time_ms INTEGER,
  token_usage JSONB,
  cost_usd DECIMAL(10,6),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Prompt Template System
```typescript
interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  category: 'scene_generation' | 'component_creation' | 'style_analysis';
  template: string;
  variables: Record<string, PromptVariable>;
  modelRequirements: ModelCapability[];
  isActive: boolean;
}

interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: any;
  description: string;
  validation?: string; // regex or validation rule
}

interface ModelConfiguration {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic';
  modelId: string;
  capabilities: ModelCapability[];
  parameters: {
    temperature: number;
    maxTokens: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  costPerToken: number;
  isActive: boolean;
}

type ModelCapability = 'vision' | 'function_calling' | 'json_mode' | 'streaming';
```

### Enhanced Animation Prompts
```typescript
const ANIMATION_FOCUSED_TEMPLATES = {
  scene_generation: {
    template: `
You are an expert Remotion animation designer. Create engaging animated scenes that prioritize MOVEMENT and VISUAL DYNAMICS over static text.

ANIMATION PRINCIPLES:
- Every element should have purposeful motion
- Use easing functions for natural movement
- Layer animations for visual depth
- Avoid text-heavy scenes - focus on visual storytelling

CONTEXT:
User Request: {{userRequest}}
Style Guidelines: {{styleGuidelines}}
Duration: {{duration}} frames at 30fps

REQUIREMENTS:
1. Generate {{sceneCount}} distinct animated scenes
2. Each scene must have at least 3 animated elements
3. Use colors from palette: {{colorPalette}}
4. Focus on {{animationType}} animation style

OUTPUT FORMAT:
Return a JSON array of scenes with detailed animation specifications.
`,
    variables: {
      userRequest: { type: 'string', required: true },
      styleGuidelines: { type: 'string', required: false },
      duration: { type: 'number', required: true, default: 90 },
      sceneCount: { type: 'number', required: true, default: 3 },
      colorPalette: { type: 'array', required: false },
      animationType: { type: 'string', required: false, default: 'smooth' }
    }
  },
  
  component_creation: {
    template: `
Create a Remotion component with sophisticated animations. Focus on VISUAL IMPACT and SMOOTH MOTION.

ANIMATION REQUIREMENTS:
- Use interpolate() for smooth value transitions
- Implement proper easing (Easing.bezier, Easing.elastic, etc.)
- Create layered animations with staggered timing
- Ensure 60fps-smooth performance

COMPONENT SPECS:
Type: {{componentType}}
Duration: {{duration}} frames
Style: {{styleProperties}}
Animation Focus: {{animationFocus}}

TECHNICAL REQUIREMENTS:
- Export as default function
- Use TypeScript with proper types
- Implement responsive design
- Optimize for performance

Generate production-ready TSX code with advanced animations.
`,
    variables: {
      componentType: { type: 'string', required: true },
      duration: { type: 'number', required: true },
      styleProperties: { type: 'object', required: false },
      animationFocus: { type: 'string', required: true }
    }
  }
};
```

### API Endpoints (tRPC)
```typescript
// Prompt engineering router
export const promptRouter = createTRPCRouter({
  // Model management
  listModels: protectedProcedure
    .query(async ({ ctx }) => { /* Return available models */ }),
  
  setActiveModel: protectedProcedure
    .input(z.object({ modelId: z.string() }))
    .mutation(async ({ ctx, input }) => { /* Set active model */ }),
  
  // Template management
  listTemplates: protectedProcedure
    .input(z.object({ category: z.string().optional() }))
    .query(async ({ ctx, input }) => { /* Return templates */ }),
  
  createTemplate: protectedProcedure
    .input(promptTemplateSchema)
    .mutation(async ({ ctx, input }) => { /* Create template */ }),
  
  updateTemplate: protectedProcedure
    .input(z.object({ id: z.string(), updates: promptTemplateSchema.partial() }))
    .mutation(async ({ ctx, input }) => { /* Update template */ }),
  
  // Experimentation
  createExperiment: protectedProcedure
    .input(experimentSchema)
    .mutation(async ({ ctx, input }) => { /* Create A/B test */ }),
  
  getExperimentResults: protectedProcedure
    .input(z.object({ experimentId: z.string() }))
    .query(async ({ ctx, input }) => { /* Return results */ }),
  
  // Analytics
  getGenerationMetrics: protectedProcedure
    .input(z.object({
      timeRange: z.enum(['24h', '7d', '30d']),
      category: z.string().optional()
    }))
    .query(async ({ ctx, input }) => { /* Return metrics */ }),
});
```

## 🎯 Success Criteria

### Technical
- [ ] Model switching works without code changes
- [ ] Prompt templates are version-controlled and testable
- [ ] A/B testing provides statistically significant results
- [ ] Generation quality improves measurably
- [ ] System handles model failures gracefully

### User Experience
- [ ] Developers can easily experiment with prompts
- [ ] Model performance is transparent and trackable
- [ ] Animation quality shows clear improvement
- [ ] Cost optimization is data-driven
- [ ] Debugging generation issues is straightforward

## 🚨 MVP Limitations (Iterate Later)

### What We're NOT Building Yet
- Advanced prompt optimization algorithms
- Multi-model ensemble generation
- Real-time prompt adaptation
- Complex prompt chaining workflows
- Advanced cost optimization algorithms

### Known Constraints
- Limited to OpenAI models initially
- Basic A/B testing (no advanced statistical methods)
- Manual prompt template creation
- Simple quality scoring
- Basic cost tracking

## 🔧 Implementation Approach

### Week 1: Foundation
- Model configuration system
- Basic prompt template structure
- Database schema implementation
- Simple model switching UI

### Week 2: Templates & Testing
- Animation-focused prompt templates
- A/B testing infrastructure
- Template versioning system
- Basic analytics dashboard

### Week 3: Integration & Optimization
- Workspace integration
- Quality metrics implementation
- Performance optimization
- Documentation and testing

## 📝 Technical Considerations

### Performance
- Cache compiled prompt templates
- Optimize model switching overhead
- Efficient experiment result storage
- Fast template variable substitution

### Quality
- Validate prompt templates before deployment
- Monitor generation success rates
- Track quality degradation over time
- Implement automatic fallbacks

### Cost Management
- Track token usage per model
- Optimize prompt length vs quality
- Implement cost budgets and alerts
- Analyze cost-effectiveness of models

## 🔗 Integration Points

### Existing Systems
- **Video Generation**: Enhanced prompts for better output
- **Chat Interface**: Model selection and prompt debugging
- **Component System**: Improved component generation
- **Analytics**: Generation quality tracking

### Future Features
- **GitHub Integration**: Style-aware prompt enhancement
- **Image Analysis**: Visual context in prompts
- **User Preferences**: Personalized prompt optimization

## 📊 Success Metrics

- Animation quality score improvement > 25%
- Generation success rate > 95%
- Model switching adoption > 60% of developers
- Prompt template usage > 80% of generations
- Cost per successful generation reduction > 15%

## 🎨 UI/UX Considerations

### Developer Interface
- Model selection dropdown in workspace
- Prompt template editor with syntax highlighting
- A/B test results visualization
- Real-time generation metrics dashboard

### Quality Feedback
- User rating system for generated content
- Automatic quality scoring based on success metrics
- Prompt effectiveness visualization
- Model performance comparison charts

### Debugging Tools
- Prompt execution tracing
- Model response analysis
- Error categorization and reporting
- Performance profiling for slow generations 