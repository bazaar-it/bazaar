# Component-Specific Animation System

## Overview
Allow users to reference their actual GitHub components and generate animations based on their real code.

## How It Works

### 1. User Flow
```
User: "Animate my sidebar with a slide-in effect"
         ↓
System: Searches connected repos for sidebar component
         ↓
System: Extracts component structure, styles, content
         ↓
System: Generates Remotion animation matching exact component
         ↓
User: Sees THEIR sidebar animated, not generic
```

## Technical Implementation

### Phase 1: Component Discovery Service

```typescript
// src/server/services/github/component-finder.service.ts

export async function findComponent(
  userId: string,
  componentQuery: string, // "sidebar", "navbar", "header"
  context?: string // Additional context from user prompt
) {
  // 1. Get user's connected repos and access token
  const connection = await getUserGitHubConnection(userId);
  
  // 2. Smart search strategies
  const searchStrategies = [
    // A. Direct file name match
    `filename:${componentQuery}.tsx`,
    `filename:${componentQuery}.jsx`,
    `filename:${componentQuery}.vue`,
    
    // B. Component name match
    `"export function ${capitalize(componentQuery)}"`,
    `"export const ${capitalize(componentQuery)}"`,
    `"class ${capitalize(componentQuery)} extends"`,
    
    // C. Common patterns
    `path:components/${componentQuery}`,
    `path:src/components/${componentQuery}`,
    `path:app/components/${componentQuery}`,
  ];
  
  // 3. Search across connected repos
  const results = await searchRepos({
    repos: connection.repos,
    queries: searchStrategies,
    token: connection.accessToken,
  });
  
  // 4. Parse and extract component
  return await extractComponentDetails(results[0]);
}
```

### Phase 2: Component Parser

```typescript
// src/server/services/github/component-parser.service.ts

interface ExtractedComponent {
  name: string;
  filePath: string;
  repository: string;
  
  // Structure
  jsx: string; // The actual JSX/template
  props: Record<string, any>;
  state: Record<string, any>;
  
  // Styling
  styles: {
    inline: Record<string, any>;
    classes: string[];
    cssModules?: Record<string, string>;
    styledComponents?: string;
    tailwindClasses?: string[];
  };
  
  // Content
  text: string[]; // Text content found
  images: string[]; // Image sources
  icons: string[]; // Icon names/components
  
  // Behavior
  animations: string[]; // Existing animations found
  interactions: string[]; // onClick, onHover, etc.
  
  // Dependencies
  imports: string[];
  hooks: string[];
  libraries: string[];
}

export async function extractComponentDetails(
  fileContent: string,
  filePath: string
): Promise<ExtractedComponent> {
  // Use AST parsing for accuracy
  const ast = parse(fileContent, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });
  
  // Extract different aspects
  const structure = extractJSXStructure(ast);
  const styles = extractStyles(ast, fileContent);
  const content = extractContent(ast);
  
  // Smart inference
  const purpose = inferComponentPurpose(structure, content);
  const animationPotential = analyzeAnimationOpportunities(structure);
  
  return {
    jsx: structure.jsx,
    styles: styles,
    content: content,
    purpose: purpose, // 'navigation', 'display', 'form', etc.
    animationPotential: animationPotential, // What can be animated
  };
}
```

### Phase 3: Animation Generator

```typescript
// src/server/services/animation/component-animator.service.ts

export async function generateComponentAnimation(
  component: ExtractedComponent,
  animationType: string, // "slide-in", "fade", "bounce", etc.
  userPrompt: string
): Promise<string> {
  // 1. Convert component to Remotion-compatible structure
  const remotionComponent = convertToRemotion(component);
  
  // 2. Apply animation based on type and structure
  const animatedComponent = applyAnimation({
    component: remotionComponent,
    animationType: animationType,
    
    // Smart animation based on component type
    hints: {
      isSidebar: component.purpose === 'navigation',
      hasMultipleItems: component.structure.childCount > 5,
      hasIcons: component.content.icons.length > 0,
      currentStyles: component.styles,
    },
  });
  
  // 3. Generate complete Remotion code
  return generateRemotionCode(animatedComponent);
}

// Example: Animating a real sidebar
function animateSidebar(sidebar: ExtractedComponent): string {
  const { jsx, styles, content } = sidebar;
  
  return `
    import { AbsoluteFill, interpolate, useCurrentFrame, spring } from 'remotion';
    
    export default function AnimatedSidebar() {
      const frame = useCurrentFrame();
      
      // Slide-in animation matching original sidebar width
      const slideIn = spring({
        frame,
        fps: 30,
        from: -${styles.width || 250},
        to: 0,
      });
      
      // Stagger animation for menu items
      const itemStagger = (index) => 
        interpolate(
          frame,
          [10 + index * 3, 20 + index * 3],
          [0, 1],
          { extrapolateRight: 'clamp' }
        );
      
      return (
        <AbsoluteFill>
          <div style={{
            ...${JSON.stringify(styles.inline)},
            transform: \`translateX(\${slideIn}px)\`,
          }}>
            ${transformJSXForAnimation(jsx)}
          </div>
        </AbsoluteFill>
      );
    }
  `;
}
```

### Phase 4: Intelligent Context Mapping

```typescript
// src/brain/tools/github-component-animator.ts

export const githubComponentAnimator = {
  name: 'github-component-animator',
  
  async execute(prompt: string, userId: string) {
    // 1. Parse user intent
    const intent = await parseAnimationIntent(prompt);
    // Example: { component: 'sidebar', animation: 'slide', details: '...' }
    
    // 2. Find the component in their repos
    const component = await findComponent(
      userId,
      intent.component,
      prompt
    );
    
    if (!component) {
      // Fallback to generic animation
      return generateGenericAnimation(intent);
    }
    
    // 3. Generate animation based on ACTUAL component
    const animation = await generateComponentAnimation(
      component,
      intent.animation,
      prompt
    );
    
    // 4. Include context about what was found
    return {
      code: animation,
      context: {
        foundComponent: component.name,
        fromRepo: component.repository,
        filePath: component.filePath,
        preservedStyles: component.styles,
        preservedContent: component.content,
      },
      message: `Animated your ${component.name} component from ${component.repository}`,
    };
  },
};
```

## Real-World Example

### User's Actual Sidebar (from their repo):
```tsx
// components/Sidebar.tsx
export function Sidebar({ isOpen, menuItems }) {
  return (
    <aside className="w-64 bg-gray-900 text-white h-full">
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Dashboard</h2>
        <nav>
          {menuItems.map((item, i) => (
            <a 
              key={i}
              href={item.href}
              className="flex items-center p-2 hover:bg-gray-800 rounded"
            >
              <Icon name={item.icon} />
              <span className="ml-3">{item.label}</span>
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
```

### Generated Animation (Remotion):
```tsx
export default function AnimatedSidebar() {
  const frame = useCurrentFrame();
  
  // Matches original width (w-64 = 16rem = 256px)
  const slideIn = spring({
    frame,
    fps: 30,
    from: -256,
    to: 0,
  });
  
  // Preserve original colors and styles
  const sidebarStyle = {
    width: 256,
    backgroundColor: '#111827', // bg-gray-900
    color: 'white',
    height: '100%',
    transform: `translateX(${slideIn}px)`,
  };
  
  // Actual menu items from their repo
  const menuItems = [
    { icon: 'dashboard', label: 'Dashboard' },
    { icon: 'users', label: 'Users' },
    { icon: 'settings', label: 'Settings' },
  ];
  
  return (
    <AbsoluteFill>
      <aside style={sidebarStyle}>
        <div style={{ padding: 16 }}>
          <h2 style={{
            fontSize: 20,
            fontWeight: 'bold',
            marginBottom: 16,
            opacity: interpolate(frame, [20, 30], [0, 1]),
          }}>
            Dashboard
          </h2>
          <nav>
            {menuItems.map((item, i) => (
              <a
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: 8,
                  borderRadius: 4,
                  opacity: interpolate(
                    frame,
                    [25 + i * 5, 35 + i * 5],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateX(${
                    interpolate(
                      frame,
                      [25 + i * 5, 35 + i * 5],
                      [20, 0],
                      { extrapolateRight: 'clamp' }
                    )
                  }px)`,
                }}
              >
                <Icon name={item.icon} />
                <span style={{ marginLeft: 12 }}>{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
      </aside>
    </AbsoluteFill>
  );
}
```

## Advanced Features

### 1. Multi-Component Scenes
```
User: "Show my navbar sliding down, then my sidebar sliding in"
System: Finds both components, creates orchestrated animation
```

### 2. Data-Aware Animations
```
User: "Animate my product cards with real data"
System: Finds ProductCard component + sample data from repo
```

### 3. Interaction Preservation
```
User: "Show how my dropdown menu works"
System: Preserves hover states, click interactions in animation
```

### 4. Full Page Reconstruction
```
User: "Animate my entire dashboard page"
System: Reconstructs page layout from multiple components
```

## Challenges & Solutions

### Challenge 1: Component Dependencies
**Problem**: Component uses custom hooks, context, etc.
**Solution**: Mock dependencies or extract static snapshot

### Challenge 2: Dynamic Data
**Problem**: Component expects props/data
**Solution**: Infer sample data from PropTypes/TypeScript/usage

### Challenge 3: Complex Styling
**Problem**: CSS-in-JS, CSS Modules, preprocessors
**Solution**: Extract computed styles or preserve class names

### Challenge 4: Large Codebases
**Problem**: Finding the right component
**Solution**: Intelligent search + user confirmation UI

## Implementation Timeline

### Phase 1: Basic Component Finding (1 day)
- GitHub search API integration
- Simple component detection
- Basic JSX extraction

### Phase 2: Smart Parsing (2 days)
- AST-based parser
- Style extraction
- Content detection

### Phase 3: Animation Generation (2 days)
- Component to Remotion converter
- Animation library
- Smart defaults

### Phase 4: Polish (1 day)
- Error handling
- Fallbacks
- UI feedback

**Total: ~1 week for full system**

## Why This Is Powerful

1. **Personalization**: Animations match user's exact design
2. **Time Saving**: No need to recreate components
3. **Accuracy**: Uses real code, not approximations
4. **Context**: Understands component purpose and structure
5. **Evolution**: Gets better as it learns from more repos

## Competitive Advantage

No other tool does this! It would be a unique feature that:
- Bridges code and animation
- Reduces friction dramatically
- Creates perfect brand alignment
- Feels like magic to users