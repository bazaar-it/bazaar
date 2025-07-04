# Feature 021: Smart Pattern Recognition

**Priority**: MEDIUM  
**Complexity**: MEDIUM  
**Effort**: 3 days  
**Dependencies**: Brain Orchestrator, Scene analysis system, MCP tools

## Overview

Enhance the AI system to understand and execute complex patterns in natural language commands. This feature enables users to perform operations using intuitive language like "all", "every", "scenes with X", making the system feel more intelligent and reducing the need for manual selection.

## Problem Statement

### Current Issues
- AI interprets commands literally without understanding patterns
- Cannot process collective operations ("all scenes", "every text")
- No content-aware filtering capabilities
- Users must manually select scenes for batch operations
- Natural language understanding is limited to single operations

### User Needs
- Use natural language for batch operations
- Filter scenes by content or properties
- Apply conditional operations based on scene characteristics
- Use patterns like "every third scene" or "all blue elements"
- Combine multiple criteria in single command

## Technical Specification

### Pattern Types to Support

#### 1. Universal Selectors
```typescript
interface UniversalPatterns {
  all: "all scenes" | "all text" | "all animations";
  every: "every scene" | "every other scene" | "every third scene";
  none: "no scenes" | "remove all";
}
```

#### 2. Content-Based Filters
```typescript
interface ContentFilters {
  containing: "scenes with text" | "scenes containing images";
  matching: "scenes matching brand colors" | "scenes like the first one";
  duration: "scenes longer than 3 seconds" | "short scenes";
  type: "text scenes" | "image scenes" | "animation scenes";
}
```

#### 3. Conditional Operations
```typescript
interface ConditionalPatterns {
  if: "if scene has text" | "if background is dark";
  where: "where duration > 2s" | "where color is blue";
  except: "all scenes except the last" | "every scene except titles";
}
```

### Brain Orchestrator Enhancement

#### 1. Pattern Recognition Module
```typescript
// New module for pattern analysis
class PatternRecognizer {
  async analyzePattern(prompt: string): Promise<PatternResult> {
    // Identify pattern type
    const patternType = this.identifyPatternType(prompt);
    
    // Extract criteria
    const criteria = this.extractCriteria(prompt);
    
    // Convert to scene filter
    const filter = this.buildSceneFilter(patternType, criteria);
    
    return {
      type: patternType,
      filter,
      originalPrompt: prompt,
      confidence: 0.95
    };
  }
  
  private identifyPatternType(prompt: string): PatternType {
    const patterns = {
      universal: /\b(all|every|each)\b/i,
      contentBased: /\b(with|containing|having)\b/i,
      conditional: /\b(if|where|when|except)\b/i,
      ordinal: /\b(first|last|second|third)\b/i,
      quantity: /\b(\d+|few|many|some)\b/i
    };
    
    // Return most specific pattern match
    return this.matchPattern(prompt, patterns);
  }
}
```

#### 2. Scene Analysis Engine
```typescript
// Analyze scene content for filtering
class SceneAnalyzer {
  async analyzeScene(scene: Scene): Promise<SceneMetadata> {
    const code = scene.code;
    
    return {
      hasText: this.detectText(code),
      hasImages: this.detectImages(code),
      hasAnimations: this.detectAnimations(code),
      colors: this.extractColors(code),
      duration: scene.duration,
      complexity: this.calculateComplexity(code),
      elements: this.extractElements(code)
    };
  }
  
  private detectText(code: string): boolean {
    return /<Text|<h[1-6]|<p|<span/.test(code);
  }
  
  private extractColors(code: string): string[] {
    const colorPattern = /#[0-9a-fA-F]{6}|rgb\([^)]+\)|[a-z]+(?=\s*[,}])/g;
    return [...new Set(code.match(colorPattern) || [])];
  }
}
```

#### 3. Filter DSL (Domain Specific Language)
```typescript
// Internal filter representation
interface SceneFilter {
  type: 'all' | 'some' | 'none';
  conditions: FilterCondition[];
  ordering?: 'nth' | 'range' | 'random';
  limit?: number;
}

interface FilterCondition {
  field: 'content' | 'duration' | 'color' | 'type' | 'position';
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'matches';
  value: any;
  negate?: boolean;
}

// Convert natural language to filter
class FilterBuilder {
  build(pattern: PatternResult): SceneFilter {
    return {
      type: this.getFilterType(pattern),
      conditions: this.buildConditions(pattern),
      ordering: this.getOrdering(pattern),
      limit: this.getLimit(pattern)
    };
  }
}
```

### Integration with MCP Tools

#### 1. Enhanced Tool Selection
```typescript
// Update BrainOrchestrator
class BrainOrchestrator {
  async process(input: GenerateInput) {
    // First, check for patterns
    const pattern = await this.patternRecognizer.analyzePattern(input.prompt);
    
    if (pattern.confidence > 0.8) {
      // Execute pattern-based operation
      return this.executePatternOperation(pattern, input);
    }
    
    // Fall back to existing logic
    return this.executeSingleOperation(input);
  }
  
  private async executePatternOperation(pattern: PatternResult, input: GenerateInput) {
    // Get all scenes
    const scenes = await this.getProjectScenes(input.projectId);
    
    // Apply filter
    const matchingScenes = await this.filterScenes(scenes, pattern.filter);
    
    // Determine operation
    const operation = this.extractOperation(input.prompt);
    
    // Execute on all matching scenes
    return this.batchExecute(matchingScenes, operation);
  }
}
```

#### 2. Natural Language Examples
```typescript
// Pattern matching examples
const patternExamples = [
  {
    input: "Delete all text scenes",
    pattern: { type: 'all', filter: { content: 'text' } },
    operation: 'delete'
  },
  {
    input: "Make every third scene blue",
    pattern: { type: 'nth', n: 3 },
    operation: 'edit',
    params: { backgroundColor: 'blue' }
  },
  {
    input: "Update all scenes with images to have fade transitions",
    pattern: { type: 'all', filter: { content: 'images' } },
    operation: 'edit',
    params: { transition: 'fade' }
  },
  {
    input: "Remove scenes shorter than 2 seconds",
    pattern: { type: 'conditional', condition: 'duration < 2' },
    operation: 'delete'
  }
];
```

### UI/UX Integration

#### 1. Visual Feedback
```typescript
// Show which scenes match pattern before execution
const PatternPreview = ({ pattern, matchingScenes }) => {
  return (
    <div className="pattern-preview">
      <p>Pattern: "{pattern.originalPrompt}"</p>
      <p>Matching {matchingScenes.length} scenes:</p>
      <div className="matched-scenes">
        {matchingScenes.map(scene => (
          <ScenePreview key={scene.id} scene={scene} highlighted />
        ))}
      </div>
      <Button onClick={confirm}>Confirm Operation</Button>
    </div>
  );
};
```

#### 2. Pattern Suggestions
```typescript
// Suggest patterns based on project content
const PatternSuggestions = ({ scenes }) => {
  const suggestions = generateSuggestions(scenes);
  
  return (
    <div className="pattern-suggestions">
      <p>Try these commands:</p>
      {suggestions.map(s => (
        <Chip onClick={() => executePattern(s.pattern)}>
          {s.text}
        </Chip>
      ))}
    </div>
  );
};
```

## Implementation Plan

### Phase 1: Pattern Recognition (Day 1)
1. Create PatternRecognizer class
2. Implement pattern type identification
3. Build natural language parsing
4. Create comprehensive test suite

### Phase 2: Scene Analysis (Day 1.5)
1. Implement SceneAnalyzer
2. Create content detection methods
3. Build metadata extraction
4. Cache analysis results for performance

### Phase 3: Integration (Day 2)
1. Update Brain Orchestrator
2. Connect to existing MCP tools
3. Implement batch execution logic
4. Add pattern preview UI

### Phase 4: Testing & Refinement (Day 2.5-3)
1. Test with real user patterns
2. Refine pattern matching accuracy
3. Handle edge cases
4. Optimize performance

## Success Metrics

- **Accuracy**: 90% pattern recognition accuracy
- **Coverage**: Support 95% of common user patterns
- **Performance**: Pattern analysis < 100ms
- **User Satisfaction**: 80% prefer pattern commands over manual selection

## Pattern Library

### Supported Patterns
```typescript
const supportedPatterns = {
  // Universal
  "all scenes": { type: 'all' },
  "every scene": { type: 'all' },
  "all text": { type: 'all', filter: 'text' },
  
  // Ordinal
  "every other scene": { type: 'nth', n: 2 },
  "every third scene": { type: 'nth', n: 3 },
  "first 5 scenes": { type: 'range', start: 0, count: 5 },
  "last scene": { type: 'position', position: -1 },
  
  // Content-based
  "scenes with images": { type: 'content', has: 'images' },
  "text-only scenes": { type: 'content', only: 'text' },
  "animated scenes": { type: 'content', has: 'animations' },
  
  // Conditional
  "scenes longer than 3 seconds": { type: 'duration', operator: '>', value: 3 },
  "short scenes": { type: 'duration', operator: '<', value: 2 },
  "scenes with blue backgrounds": { type: 'style', property: 'background', value: 'blue' },
  
  // Complex
  "all scenes except the first": { type: 'all', except: [0] },
  "every blue text scene": { type: 'all', filters: ['color:blue', 'content:text'] }
};
```

## Edge Cases & Considerations

1. **Ambiguous Patterns**
   - "Make it blue" - what is "it"?
   - Require confirmation for ambiguous commands
   - Suggest clarifications

2. **Performance**
   - Cache scene analysis results
   - Limit pattern complexity
   - Show progress for large operations

3. **Conflicting Patterns**
   - "All scenes except all scenes"
   - Handle logical contradictions gracefully

4. **Partial Matches**
   - Some scenes partially match criteria
   - Provide confidence scores
   - Allow user to refine

## Related Features

- Feature 20: Batch Scene Operations (execution backend)
- Feature 19: Multi-Step Tool Execution (complex patterns)
- Feature 4: AI Prompt Backend Improvements (better understanding)

## Future Enhancements

1. **Learning System**
   - Learn user's common patterns
   - Suggest personalized shortcuts
   - Improve accuracy over time

2. **Complex Queries**
   - Boolean operators (AND, OR, NOT)
   - Nested conditions
   - Regex pattern support

3. **Visual Pattern Builder**
   - GUI for creating complex patterns
   - Save and reuse patterns
   - Share patterns with community