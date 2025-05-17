//memory-bank/evaluation/automation/test-case-generation.md

# Test Case Generation for Component Evaluation

## Overview

This document describes the approach for generating diverse test cases to evaluate the component generation pipeline. The test case generation is designed to systematically cover different animation types, complexity levels, and edge cases to provide comprehensive evaluation metrics.

## Test Categories

### 1. Animation Type Categories

Test cases are categorized by animation type to ensure coverage across all supported animations:

| Category | Description | Examples |
|----------|-------------|----------|
| Text Animations | Animations focusing on text elements | Text reveal, typing effect, word-by-word animation |
| Shape Animations | Animations with geometric shapes | Morphing shapes, spinning objects, pattern formation |
| Transition Effects | Scene transitions and element transitions | Fade, slide, zoom, 3D rotation transitions |
| Data Visualization | Charts, graphs and data representations | Bar charts, pie charts, infographics with animation |
| Particle Effects | Animations with multiple small elements | Confetti, particle waves, smoke effects |
| Character Animations | Animated characters or mascots | Walking cycle, facial expressions, character interactions |
| Combined Effects | Multiple animation types in one component | Text with particle effects, charts with transitions |

### 2. Complexity Levels

Each test case is assigned a complexity level:

- **Level 1**: Simple animations (1-2 elements, single animation property)
- **Level 2**: Moderate complexity (3-5 elements, 2-3 animation properties)
- **Level 3**: Complex animations (6+ elements, multiple coordinated animations)
- **Level 4**: Advanced (multiple sequences, timing dependencies, physics)
- **Level 5**: Expert (highly complex, multiple techniques, precise choreography)

### 3. Edge Cases

Special test cases designed to test the limits of the system:

- **Long Text**: Components with unusually long text content
- **Special Characters**: Unicode, emojis, and special symbols
- **High Element Count**: Components with many elements (stress test)
- **Complex Timing**: Multiple overlapping animation sequences
- **Unusual Dimensions**: Non-standard aspect ratios or sizes
- **Complex Math**: Animations requiring complex calculations
- **External Assets**: Components requiring external images/fonts
- **API Integration**: Components that simulate API usage patterns
- **Complex State**: Components with complex internal state management

## Implementation

### Prompt Generator

The `prompt-generator.ts` script:

1. Selects random combinations of categories, complexity levels, and optional edge cases
2. Constructs natural language prompts for these combinations
3. Generates a set of test prompts covering the full spectrum of component types

```typescript
// Example prompt generator implementation
export async function generateTestPrompts(
  count: number,
  options?: {
    category?: AnimationCategory;
    complexity?: ComplexityLevel;
    includeEdgeCases?: boolean;
  }
): Promise<Array<{ prompt: string; metadata: TestCaseMetadata }>> {
  // Implementation that generates diverse prompts based on parameters
  // Returns array of prompts with associated metadata for tracking
}
```

### AnimationDesignBrief Generation

Test cases leverage the AnimationDesignBrief schema to create precise, structured tests:

```typescript
// Example design brief generation
export async function generateAnimationDesignBriefs(
  count: number,
  options?: TestGenerationOptions
): Promise<Array<{ brief: AnimationDesignBrief; metadata: TestCaseMetadata }>> {
  // Implementation that generates structured animation design briefs
  // for diverse test scenarios
}
```

### Test Case Storage

Test cases are stored in the database with:
- Generated prompt
- Expected animation type/style
- Complexity level
- Edge case flags
- Component type
- Expected rendering characteristics
- Created timestamp

## Usage in Test Harness

The test case generator is used by the test harness to:

1. Create a diverse set of test cases covering the full spectrum of component types
2. Balance the distribution across categories and complexity levels
3. Include specific edge cases that have historically caused issues
4. Generate test cases that target specific metrics

## Integration with A2A

Each generated test case is submitted as an A2A task with:
- Specific prompt or animation design brief
- Task metadata for categorization
- Expected output characteristics for validation

## Example Test Cases

```json
[
  {
    "prompt": "Create a text animation where each word of 'Welcome to Bazaar-Vid' flies in from different directions and assembles in the center",
    "category": "Text Animations",
    "complexity": 2,
    "edgeCases": []
  },
  {
    "prompt": "Create a loading spinner with 12 colored dots that fade in and out in sequence around a circle",
    "category": "Shape Animations",
    "complexity": 2,
    "edgeCases": ["Complex Timing"]
  },
  {
    "prompt": "Create a bar chart showing monthly data for 2023, where each bar grows from the bottom with a bouncing effect. Include labels that fade in after each bar appears.",
    "category": "Data Visualization",
    "complexity": 3,
    "edgeCases": ["Complex Timing", "High Element Count"]
  }
]
```

## Logging and Analysis

For each generated test case:
- Store the prompt and metadata
- Track success/failure rates by category and complexity
- Analyze which types of prompts lead to higher failure rates
- Identify patterns in edge cases that cause issues
