# GitHub Component Discovery Panel

## The Vision 🎯
A panel that automatically discovers and catalogs all major UI components in a user's codebase, allowing drag-and-drop animation creation.

## Core Concept
"What if the system could automatically find Login, Signup, Paywall, Sidebar, Header, ChatInput, etc. and present them in a browsable panel?"

## UI Mock-up
```
┌─────────────────────────────────────┐
│ 📁 GitHub Components                 │
├─────────────────────────────────────┤
│ 🔍 Search components...              │
├─────────────────────────────────────┤
│ 📱 Core Components                   │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │ Header  │ │ Sidebar │ │ Footer  ││
│ │ 📄      │ │ 📄      │ │ 📄      ││
│ └─────────┘ └─────────┘ └─────────┘│
│                                      │
│ 🔐 Auth Components                   │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │ Login   │ │ Signup  │ │ Forgot  ││
│ │ 📄      │ │ 📄      │ │ 📄      ││
│ └─────────┘ └─────────┘ └─────────┘│
│                                      │
│ 💳 Commerce                          │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │ Paywall │ │Checkout │ │ Cart    ││
│ │ 📄      │ │ 📄      │ │ 📄      ││
│ └─────────┘ └─────────┘ └─────────┘│
│                                      │
│ 💬 Interactive                       │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │ChatInput│ │Comments │ │ Search  ││
│ │ 📄      │ │ 📄      │ │ 📄      ││
│ └─────────┘ └─────────┘ └─────────┘│
└─────────────────────────────────────┘

[Drag component to chat to animate]
```

## Component Discovery Strategies

### 1. Pattern-Based Detection
```typescript
const UI_PATTERNS = {
  auth: [
    { pattern: /Login|SignIn|Auth.*Form/i, category: 'Auth' },
    { pattern: /Register|SignUp|CreateAccount/i, category: 'Auth' },
    { pattern: /ForgotPassword|ResetPassword/i, category: 'Auth' },
  ],
  layout: [
    { pattern: /Header|NavBar|TopBar/i, category: 'Layout' },
    { pattern: /Sidebar|SideNav|LeftPanel/i, category: 'Layout' },
    { pattern: /Footer|BottomBar/i, category: 'Layout' },
  ],
  commerce: [
    { pattern: /Paywall|Pricing|Subscribe/i, category: 'Commerce' },
    { pattern: /Checkout|Payment|Billing/i, category: 'Commerce' },
    { pattern: /Cart|Basket|ShoppingBag/i, category: 'Commerce' },
  ],
  interactive: [
    { pattern: /Chat|Message|Conversation/i, category: 'Interactive' },
    { pattern: /Comment|Discussion|Reply/i, category: 'Interactive' },
    { pattern: /Search|Filter|Query/i, category: 'Interactive' },
  ],
  content: [
    { pattern: /Hero|Banner|Jumbotron/i, category: 'Content' },
    { pattern: /Card|Tile|Item/i, category: 'Content' },
    { pattern: /Modal|Dialog|Popup/i, category: 'Content' },
  ]
};
```

### 2. AST Analysis Approach
```typescript
class ComponentAnalyzer {
  async analyzeRepository(repoPath: string) {
    const components = [];
    
    // 1. Find all TSX/JSX files
    const files = await glob('**/*.{tsx,jsx}', { cwd: repoPath });
    
    for (const file of files) {
      const ast = parseAST(file);
      
      // 2. Look for export signatures
      if (hasReactComponent(ast)) {
        const analysis = {
          name: extractComponentName(ast),
          path: file,
          category: categorizeComponent(ast),
          complexity: calculateComplexity(ast),
          dependencies: extractImports(ast),
          hasState: detectState(ast),
          isPage: file.includes('/pages/') || file.includes('/app/'),
          preview: generatePreview(ast), // First 50 lines or key structure
        };
        
        components.push(analysis);
      }
    }
    
    return components;
  }
}
```

### 3. Heuristic Scoring
```typescript
function scoreComponentImportance(component) {
  let score = 0;
  
  // Name patterns
  if (/Login|Header|Footer|Nav|Sidebar/i.test(component.name)) score += 10;
  if (/Page|Screen|View/i.test(component.name)) score += 8;
  if (/Button|Input|Card/i.test(component.name)) score += 5;
  
  // File location
  if (component.path.includes('/components/')) score += 5;
  if (component.path.includes('/pages/') || component.path.includes('/app/')) score += 8;
  if (component.path.includes('/ui/')) score += 3;
  
  // Usage frequency (how many times imported)
  score += Math.min(component.importCount * 2, 20);
  
  // Complexity (more complex = likely more important)
  if (component.lineCount > 100) score += 5;
  if (component.hasState) score += 3;
  
  return score;
}
```

## Existing Services & Tools

### 1. **React Scanner** (npmjs.com/package/react-scanner)
- Scans codebase for React components
- Generates component inventory
- Could be adapted for our needs

### 2. **Bit.dev**
- Component discovery and cataloging
- Has API for component analysis
- Could integrate their detection logic

### 3. **Storybook's Component Detection**
- Auto-discovers components for stories
- Open source, could borrow logic

### 4. **GitHub Code Search API**
- Can search for patterns across repo
- Rate limited but powerful

### 5. **Tree-sitter**
- Fast AST parsing
- Language agnostic
- Could build custom analyzer

## Implementation Approach

### Phase 1: Basic Discovery
```typescript
class GitHubComponentDiscovery {
  async discoverComponents(repoName: string, accessToken: string) {
    const octokit = new Octokit({ auth: accessToken });
    
    // 1. Search for common patterns
    const searches = [
      'filename:Login extension:tsx',
      'filename:Header extension:tsx',
      'filename:Sidebar extension:tsx',
      'filename:Footer extension:tsx',
      'filename:Paywall extension:tsx',
      'filename:Checkout extension:tsx',
    ];
    
    const components = [];
    for (const query of searches) {
      const results = await octokit.search.code({
        q: `${query} repo:${repoName}`,
        per_page: 5
      });
      
      components.push(...results.data.items);
    }
    
    return this.categorizeComponents(components);
  }
}
```

### Phase 2: Smart Categorization
```typescript
async categorizeComponents(components) {
  const categorized = {
    auth: [],
    layout: [],
    commerce: [],
    interactive: [],
    content: [],
    custom: []
  };
  
  for (const component of components) {
    const category = this.detectCategory(component.name, component.path);
    categorized[category].push({
      name: component.name,
      path: component.path,
      preview: await this.generatePreview(component),
      dragData: {
        type: 'github-component',
        name: component.name,
        path: component.path
      }
    });
  }
  
  return categorized;
}
```

### Phase 3: Drag & Drop Integration
```typescript
// In the UI panel
<div 
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData('component', JSON.stringify({
      name: component.name,
      path: component.path,
      repo: selectedRepo
    }));
  }}
>
  <ComponentCard {...component} />
</div>

// In the chat input
<ChatInput
  onDrop={(e) => {
    const componentData = JSON.parse(e.dataTransfer.getData('component'));
    setMessage(`Animate my ${componentData.name} component from ${componentData.path}`);
  }}
/>
```

## Advanced Features

### 1. Component Relationships
- Detect parent-child relationships
- Show component hierarchy
- Suggest related components

### 2. Visual Previews
- Generate thumbnails using AST
- Show component structure diagram
- Display key props/states

### 3. Smart Suggestions
- "Users who animated Header also animated..."
- "This component is often used with..."
- "Similar components in your repo..."

### 4. Batch Operations
- Select multiple components
- "Create a video showcasing all my auth flow"
- Automatic scene sequencing

## Technical Challenges

1. **Rate Limits**: GitHub API has search limits
2. **Large Codebases**: Need efficient scanning
3. **Dynamic Imports**: Hard to detect all components
4. **Private Repos**: Need proper permissions
5. **Monorepos**: Multiple projects in one repo

## Potential Architecture

```
User's GitHub Repo
        ↓
Component Discovery Service
    ├── Pattern Matcher
    ├── AST Analyzer  
    ├── Import Graph Builder
    └── Categorizer
        ↓
Component Catalog API
        ↓
GitHub Panel UI
    ├── Category Views
    ├── Search/Filter
    ├── Preview Cards
    └── Drag & Drop
        ↓
Chat Integration
```

## MVP Implementation (2-3 days)

1. **Day 1**: Basic pattern matching for common components
2. **Day 2**: UI panel with drag-drop functionality
3. **Day 3**: Integration with chat and animation flow

## Full Implementation (1-2 weeks)

1. AST-based analysis
2. Smart categorization
3. Visual previews
4. Relationship mapping
5. Advanced UI features

## Why This Would Be Amazing

1. **Discoverability**: Users see ALL their animatable components
2. **Speed**: Drag & drop vs typing component names
3. **Context**: System knows exactly what to animate
4. **Exploration**: Users discover components they forgot about
5. **Professional**: Makes Bazaar feel like a pro tool

## Next Steps

1. Research existing component detection libraries
2. Build proof-of-concept with pattern matching
3. Create UI mockup for panel
4. Test with real repositories
5. Implement drag-drop to chat integration

---

This could be THE killer feature that makes Bazaar indispensable for developers!