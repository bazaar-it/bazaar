# Global Component Registry Architecture

## The Vision
Instead of each scene declaring its own components (causing conflicts), scenes contribute to and consume from a shared project component registry.

## How It Works

### 1. Component Extraction During Compilation
```typescript
// When AI generates or user edits a scene
async function compileSceneWithRegistry(
  tsxCode: string, 
  sceneId: string,
  projectId: string
): CompilationResult {
  
  // Step 1: Parse and extract reusable components
  const ast = parse(tsxCode);
  const components = extractComponents(ast); // Find all component declarations
  
  // Step 2: Register globally reusable components
  for (const component of components) {
    if (isReusable(component)) {
      await registerProjectComponent(projectId, {
        name: component.name,
        code: component.code,
        sceneId, // Track origin
        signature: getTypeSignature(component), // For type checking
      });
    }
  }
  
  // Step 3: Transform scene to use registry
  const transformedCode = transformToUseRegistry(ast, projectId);
  
  // Step 4: Compile with registry imports
  return compile(transformedCode);
}
```

### 2. Project Component Registry
```typescript
// Database schema
CREATE TABLE project_components (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  name VARCHAR(255),           -- Component name (e.g., "Button")
  canonical_code TEXT,          -- The best/latest version
  type_signature TEXT,          -- TypeScript signature
  originated_from_scene UUID,   -- Where it was first defined
  last_updated_by_scene UUID,   -- Latest update source
  usage_count INTEGER,          -- How many scenes use it
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  UNIQUE(project_id, name)     -- One Button per project
);

// Runtime access
const ProjectRegistry = {
  Button: function() { ... },
  PromptBox: function() { ... },
  AnimatedLogo: function() { ... },
  // Automatically populated from DB
};
```

### 3. Scene Code Transformation
```typescript
// Original scene code (what AI generates)
export default function Scene1() {
  const Button = ({ text }) => (
    <div className="px-4 py-2 bg-blue-500">{text}</div>
  );
  
  return <Button text="Click me" />;
}

// Transformed for execution (no conflicts!)
export default function Scene1() {
  const { Button } = ProjectRegistry;
  
  return <Button text="Click me" />;
}
```

### 4. Smart Conflict Resolution
When a scene defines a component that already exists:

```typescript
async function handleComponentConflict(
  existing: Component, 
  newVersion: Component
): Resolution {
  // Option 1: If signatures match, use existing (no conflict)
  if (signaturesMatch(existing, newVersion)) {
    return { action: 'use-existing' };
  }
  
  // Option 2: If new version is enhancement, update registry
  if (isEnhancement(existing, newVersion)) {
    return { 
      action: 'update-registry',
      reason: 'New version adds features'
    };
  }
  
  // Option 3: Create scene-specific variant
  return {
    action: 'create-variant',
    name: `${newVersion.name}_v2`
  };
}
```

## Benefits for AI Generation

### 1. Smoother Transitions
```typescript
// Scene 1: Introduction
const AnimatedLogo = () => { /* fancy animation */ };

// Scene 2: Can reference Scene 1's logo!
// AI knows about registered components
<AnimatedLogo style={{ transform: 'scale(0.8)' }} />
```

### 2. Consistent Design System
- AI learns project's visual language from registry
- Reuses existing buttons, cards, layouts
- Maintains design consistency automatically

### 3. No More Duplicate Declarations
- Each component defined once
- Scenes just reference what they need
- Zero naming conflicts

### 4. Progressive Enhancement
```typescript
// Scene 1 defines basic Button
const Button = ({ text }) => <div>{text}</div>;

// Scene 3 enhances it (AI sees the pattern)
const Button = ({ text, icon }) => (
  <div>
    {icon && <Icon name={icon} />}
    {text}
  </div>
);
// Registry updated with enhanced version
// All scenes benefit!
```

## Implementation Plan

### Phase 1: Namespace Isolation (Quick Fix)
- Add unique suffixes to all declarations
- Prevents immediate crashes
- 1-2 days work

### Phase 2: Component Extraction
- Parse scenes for reusable components  
- Store in project_components table
- Build registry on project load
- 3-5 days work

### Phase 3: AI Integration
- Teach AI about available components
- Include registry in generation context
- Enable component reuse across scenes
- 2-3 days work

### Phase 4: Visual Component Library
- UI showing all project components
- Drag & drop into scenes
- Version history
- 1 week work

## Why This Solves Everything

1. **No more conflicts**: Components have single definition
2. **Better AI output**: AI reuses existing components
3. **Smoother videos**: Consistent design across scenes
4. **Less code**: Reuse instead of redefine
5. **Type safety**: Can validate component usage
6. **Performance**: Compile once, use everywhere

## Example: Multi-Scene Video

```typescript
// PROJECT REGISTRY after 3 scenes generated:
{
  Logo: function() { /* shared */ },
  Button: function() { /* shared */ }, 
  Card: function() { /* shared */ },
  AnimatedText: function() { /* shared */ }
}

// Scene 1: Introduction
function Scene1() {
  const { Logo, AnimatedText } = ProjectRegistry;
  return (
    <AbsoluteFill>
      <Logo />
      <AnimatedText text="Welcome" />
    </AbsoluteFill>
  );
}

// Scene 2: Features (reuses Logo!)
function Scene2() {
  const { Logo, Card, Button } = ProjectRegistry;
  return (
    <AbsoluteFill>
      <Logo size="small" />
      <Card title="Feature 1" />
      <Button text="Learn More" />
    </AbsoluteFill>
  );
}

// Scene 3: Call to Action (consistent design!)
function Scene3() {
  const { Button, AnimatedText } = ProjectRegistry;
  return (
    <AbsoluteFill>
      <AnimatedText text="Get Started" />
      <Button text="Sign Up Now" primary />
    </AbsoluteFill>
  );
}
```

No conflicts. Perfect consistency. Smooth transitions.