# Component Discovery Panel - Implementation Plan

## Overview
Auto-discover and catalog all React components in a GitHub repo, present them in a draggable panel for instant animation.

## Architecture

```
GitHub Repo → Tree API → React Indexer → Catalog API → Discovery Panel → Drag to Chat
```

## Phase 1: MVP (Day 1) - Tree Scan + Heuristics

### 1. GitHub Tree Scanner
```typescript
// Use GitHub's tree API for fast file listing
GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1

// Filter to React files
const reactFiles = tree.filter(f => /\.(tsx|jsx)$/.test(f.path));
```

### 2. Heuristic Categorizer (No AST)
```typescript
const PATTERNS = {
  auth: [/login|signin/i, /signup|register/i, /forgot|reset/i],
  core: [/header|navbar/i, /sidebar|sidenav/i, /footer/i],
  commerce: [/paywall|pricing/i, /checkout|billing/i, /cart|basket/i],
  interactive: [/chat|message/i, /comment|reply/i, /search|filter/i],
  content: [/hero|banner/i, /card|tile/i, /modal|dialog/i]
};

function categorize(path: string, filename: string) {
  // Score based on name + location
  const score = 
    (/\/(app|pages)\//i.test(path) ? 20 : 0) +
    (/\/components\//i.test(path) ? 10 : 0) +
    (PATTERNS.auth.some(p => p.test(filename)) ? 50 : 0);
    
  return { category, score };
}
```

### 3. API Endpoint
```typescript
// /api/github/discover
export async function GET(req: Request) {
  const { repo, owner, ref = "main" } = params;
  
  // Get tree
  const tree = await octokit.git.getTree({
    owner, repo, tree_sha: ref, recursive: "1"
  });
  
  // Categorize
  const catalog = categorizeFiles(tree.files);
  
  // Cache by SHA
  cache.set(`${owner}/${repo}:${tree.sha}`, catalog);
  
  return NextResponse.json(catalog);
}
```

### 4. Discovery Panel UI
```tsx
export function ComponentDiscoveryPanel() {
  const { data: catalog } = api.github.discoverComponents.useQuery();
  
  return (
    <div className="component-panel">
      {Object.entries(catalog).map(([category, components]) => (
        <CategorySection key={category} title={category}>
          {components.map(comp => (
            <ComponentCard
              key={comp.path}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('component', JSON.stringify(comp));
              }}
              {...comp}
            />
          ))}
        </CategorySection>
      ))}
    </div>
  );
}
```

## Phase 2: AST Enhancement (Day 2)

### 1. Babel Parser Integration
```typescript
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";

function analyzeComponent(code: string) {
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"]
  });
  
  const analysis = {
    hasState: false,
    isPage: false,
    exports: [],
    imports: [],
    lineCount: code.split('\n').length
  };
  
  traverse(ast, {
    useState() { analysis.hasState = true; },
    ExportDefaultDeclaration(path) { 
      analysis.exports.push('default');
    }
  });
  
  return analysis;
}
```

### 2. Import Fan-in Counter
```typescript
// Count how many times each component is imported
async function countImports(files: GitHubFile[]) {
  const importCounts = new Map<string, number>();
  
  for (const file of files) {
    const imports = extractImports(file.content);
    imports.forEach(imp => {
      const count = importCounts.get(imp) || 0;
      importCounts.set(imp, count + 1);
    });
  }
  
  return importCounts;
}
```

### 3. Enhanced Scoring
```typescript
function scoreComponent(component: AnalyzedComponent) {
  return (
    component.nameScore * 2 +        // Login, Signup, etc = high
    component.pathScore +             // /pages/, /app/ = high
    component.importCount * 3 +       // Used frequently = important
    (component.hasState ? 10 : 0) +  // Stateful = complex = important
    (component.lineCount > 100 ? 5 : 0)
  );
}
```

## Phase 3: Advanced Features (Week 1)

### 1. Visual Previews
```typescript
// Generate component preview from AST
function generatePreview(ast: AST): ComponentPreview {
  return {
    structure: extractJSXStructure(ast),
    props: extractPropTypes(ast),
    thumbnail: generateSVGDiagram(ast)
  };
}
```

### 2. Relationship Mapping
```typescript
// Build component dependency graph
interface ComponentGraph {
  nodes: Component[];
  edges: Array<{ from: string; to: string; type: 'import' | 'parent' }>;
}
```

### 3. Smart Suggestions
```typescript
// "Components similar to this one"
// "Often used together with"
// "Part of the same flow"
```

## Implementation Files

### New Files to Create
```
src/
├── server/
│   ├── services/
│   │   └── github/
│   │       ├── component-indexer.ts      # Core indexing logic
│   │       ├── react-analyzer.ts         # React/AST analysis
│   │       └── catalog-builder.ts        # Categorization
│   └── api/
│       └── routers/
│           └── github-discovery.router.ts # API endpoints
├── app/
│   └── projects/[id]/generate/
│       └── components/
│           ├── ComponentDiscoveryPanel.tsx
│           ├── ComponentCard.tsx
│           └── CategorySection.tsx
└── lib/
    └── types/
        └── discovery.types.ts
```

## MVP Implementation Steps (2 Days)

### Day 1: Backend + Basic UI
1. **Morning**: Implement tree scanner + heuristic categorizer
2. **Afternoon**: Create API endpoint with caching
3. **Evening**: Build basic panel UI with categories

### Day 2: Drag & Drop + Polish
1. **Morning**: Implement drag & drop to chat
2. **Afternoon**: Add AST analysis for better detection
3. **Evening**: Polish UI, add search/filter

## Example Catalog Output
```json
{
  "core": [
    {
      "name": "Header",
      "path": "src/components/Header.tsx",
      "repo": "Lysaker1/bazaar-vid",
      "category": "core",
      "score": 85,
      "importCount": 12,
      "preview": "export function Header({ user, nav })"
    }
  ],
  "auth": [
    {
      "name": "LoginForm",
      "path": "src/features/auth/LoginForm.tsx",
      "repo": "Lysaker1/bazaar-vid",
      "category": "auth",
      "score": 95,
      "hasState": true
    }
  ]
}
```

## Quick Start Commands
```bash
# Install dependencies
npm i -D @babel/parser @babel/traverse typescript
npm i octokit

# Run indexer
GITHUB_TOKEN=ghp_xxx ts-node indexer.ts Lysaker1 bazaar-vid main

# Start dev server with panel
npm run dev
# Navigate to project → See discovery panel
```

## Why This Will Work
1. **Fast**: Tree API is instant, no deep cloning
2. **Smart**: Heuristics catch 80% of components
3. **Scalable**: AST can be added incrementally
4. **Visual**: Drag & drop is intuitive
5. **Contextual**: System knows exact component code

## Success Metrics
- Find 80%+ of major UI components
- < 2 second scan time for average repo
- Drag to animate in < 3 clicks
- Zero configuration required

---

This is going to be AMAZING! The panel will make Bazaar feel like a professional development tool.