# GitHub Integration: Technical Deep Dive

## The Complete Data Flow (What Really Happens)

### 1. User Drags Component from Discovery Panel

```typescript
// ComponentDiscoveryPanel.tsx
onDragStart={(e) => handleDragStart(e, component)}

// Creates data payload:
{
  type: 'github-component',
  components: [component1, component2, ...], // If multi-select
  component: component1 // Backward compatibility
}
```

### 2. Chat Panel Receives Drop

```typescript
// ChatPanelG.tsx - handleDrop()
const componentMessages = componentsToAdd.map(component => 
  `Animate my ${component.name} component from ${component.path}`
);
// Creates: "Animate my Footer component from src/components/ui/Footer.tsx"
```

### 3. SSE Stream Initiates

```typescript
// URL includes crucial flag:
/api/generate-stream?
  projectId=xxx&
  message=Animate+my+Footer...&
  useGitHub=true  // <-- CRITICAL FLAG
```

### 4. Scene Operations Router

```typescript
// scene-operations.ts
userContext: {
  useGitHub: userContext?.useGitHub, // Must pass this flag!
  githubConnected: true,
  githubAccessToken: "ghu_xxx"
}
```

### 5. Brain Orchestrator Decision

```typescript
// orchestratorNEW.ts
if (shouldUseGitHub && input.userContext?.githubConnected) {
  // This is where the magic happens!
  const componentRef = analyzer.extractComponentReference(input.prompt);
  // Returns: { name: 'footer', path: 'src/components/ui/Footer.tsx' }
  
  const context = await analyzer.analyze(userId, componentRef, accessToken);
  // Fetches ACTUAL code from GitHub
  
  enhancedPrompt = analyzer.createEnhancedPrompt(input.prompt, context);
  // Adds real component code to prompt
}
```

### 6. Component Analyzer Process

```typescript
// github-component-analyzer.ts
async analyze(userId, componentRef, accessToken) {
  // NEW: Try direct file fetch first
  if (componentRef.path) {
    component = await searchService.fetchFileDirectly(
      'Lysaker1/bazaar-vid', 
      'src/components/ui/Footer.tsx'
    );
  }
  
  // Fallback: Search by name
  if (!component) {
    results = await searchService.searchComponent(componentRef.name);
  }
  
  return {
    componentName: 'Footer',
    repository: 'Lysaker1/bazaar-vid',
    filePath: 'src/components/ui/Footer.tsx',
    rawCode: actualComponentCode, // <-- THE REAL CODE!
    framework: 'React'
  };
}
```

### 7. Enhanced Prompt Creation

```typescript
// The prompt that goes to AI includes:
`
User wants to: Animate my Footer component
CRITICAL: The user is referring to their ACTUAL Footer component
HERE IS THE ACTUAL COMPONENT CODE TO RECREATE:
\`\`\`tsx
export function Footer() {
  return (
    <footer className="bg-gray-900 text-white p-8">
      <div className="flex justify-between">
        <Logo />
        <Navigation />
        <Social />
      </div>
    </footer>
  );
}
\`\`\`
`
```

### 8. Code Generation with Real Context

```typescript
// AI now has the actual component structure and creates:
const FooterAnimation = () => {
  // Recreates exact structure with animations
  // Uses same className, same layout, same components
  // Not a generic footer!
}
```

## Critical Connection Points (Where Things Break)

### Break Point 1: useGitHub Flag
```typescript
// ❌ BROKEN: Flag not passed
userContext: {
  githubConnected: true,
  // useGitHub missing!
}

// ✅ FIXED: Flag properly passed
userContext: {
  githubConnected: true,
  useGitHub: userContext?.useGitHub // From SSE URL param
}
```

### Break Point 2: Component Reference Extraction
```typescript
// ❌ OLD: Only extracted name
extractComponentReference(prompt) {
  return "footer"; // Lost the path!
}

// ✅ NEW: Extracts full reference
extractComponentReference(prompt) {
  return {
    name: "footer",
    path: "src/components/ui/Footer.tsx" // Keeps the path!
  };
}
```

### Break Point 3: File Fetching
```typescript
// ❌ OLD: Only searched by name
searchComponent("footer") // Might find wrong file!

// ✅ NEW: Fetches exact file
fetchFileDirectly(repo, "src/components/ui/Footer.tsx") // Gets exact file!
```

## The Component Indexer Magic

### How It Scans 500 Files in 2 Seconds

```typescript
// Uses GitHub Tree API - gets entire file tree in ONE call!
const { data: tree } = await octokit.git.getTree({
  owner: 'Lysaker1',
  repo: 'bazaar-vid',
  tree_sha: 'main',
  recursive: '1' // Gets ALL files at once!
});

// Returns flat array of all files:
[
  { path: 'src/components/ui/Footer.tsx', type: 'blob' },
  { path: 'src/components/ui/Header.tsx', type: 'blob' },
  // ... 497 more files
]
```

### Smart Categorization Algorithm

```typescript
// Pattern matching for categories
const COMPONENT_PATTERNS = {
  auth: [/Login/, /Signup/, /Auth/, /Password/],
  commerce: [/Cart/, /Checkout/, /Payment/, /Product/],
  core: [/Header/, /Footer/, /Nav/, /Layout/]
};

// Scoring for importance
if (name.includes('Login')) score += 100; // Very important
if (name.includes('Button')) score += 20; // Less important
if (path.includes('/components/')) score += 50; // Likely a component
```

## Performance Optimizations

### 1. Caching Strategy
```typescript
// 5-minute cache for discovery
const DISCOVERY_CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Check cache first
const cached = DISCOVERY_CACHE.get(repoKey);
if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
  return cached.data; // Skip API call!
}
```

### 2. Parallel Processing
```typescript
// Process multiple repos in parallel
const results = await Promise.all(
  selectedRepos.map(repo => indexRepo(repo))
);
```

### 3. Lazy Loading
```typescript
// Only fetch file content when needed
// Discovery only gets file paths, not content
// Content fetched on-demand when animating
```

## Debugging Toolkit

### Essential Console Logs

```javascript
// Add these to track the flow:
console.log('[GitHub] useGitHub flag:', userContext?.useGitHub);
console.log('[GitHub] Component ref extracted:', componentRef);
console.log('[GitHub] Trying to fetch file:', componentRef.path);
console.log('[GitHub] File content length:', component.content.length);
console.log('[GitHub] Enhanced prompt includes real code:', enhancedPrompt.includes('HERE IS THE ACTUAL'));
```

### Network Tab Checks

1. Check `/api/generate-stream` URL has `useGitHub=true`
2. Check `/api/trpc/githubDiscovery.discoverComponents` returns components
3. Check for GitHub API calls to `api.github.com/repos/*/contents/*`

### Database Queries

```sql
-- Check GitHub connections
SELECT * FROM github_connections WHERE user_id = 'xxx';

-- Check selected repos
SELECT selected_repos FROM github_connections WHERE user_id = 'xxx';

-- Check component cache
SELECT * FROM component_cache WHERE cache_key LIKE '%footer%';
```

## Common Failure Modes & Fixes

### Failure 1: "Generates generic component"
**Symptom**: Animation doesn't match actual component  
**Cause**: Real code not being fetched  
**Fix**: Ensure useGitHub=true and path extraction works  

### Failure 2: "No components found"
**Symptom**: Discovery panel empty  
**Cause**: No repos selected or API error  
**Fix**: Check selected_repos in DB, check API rate limits  

### Failure 3: "Slow discovery"
**Symptom**: Panel takes 10+ seconds to load  
**Cause**: Large repo or rate limiting  
**Fix**: Implement caching, reduce repo count  

## The Magic That Makes It Work

### Why Tree API Instead of Clone?
- **Clone**: Downloads entire repo (100MB+), takes 30+ seconds
- **Tree API**: Gets file list (100KB), takes 0.5 seconds
- **100x faster**, no disk space, no cleanup needed

### Why Categorization Matters?
- Users think "I need auth components" not "I need files from src/templates"
- Categories make 91 components manageable
- Scoring ensures important components appear first

### Why Multi-Select?
- Real apps need multiple components animated together
- "Animate my header, sidebar, and footer" is common
- Batch operations are more efficient

## Advanced Patterns

### Pattern 1: Component Relationships
```typescript
// Future: Detect component dependencies
if (componentCode.includes('import Logo from')) {
  // Also fetch Logo component
  relatedComponents.push('Logo');
}
```

### Pattern 2: Style Extraction
```typescript
// Future: Extract Tailwind classes
const tailwindClasses = extractTailwindClasses(componentCode);
// Use same styles in animation
```

### Pattern 3: Prop Detection
```typescript
// Future: Detect TypeScript props
interface FooterProps {
  showSocial?: boolean;
  theme?: 'dark' | 'light';
}
// Generate animation with same props
```

## Testing Scenarios

### Scenario 1: Happy Path
1. Connect GitHub ✓
2. Select repo with components ✓
3. Drag Footer component ✓
4. Animation matches Footer exactly ✓

### Scenario 2: Edge Cases
1. Repo with 1000+ files
2. Component with complex imports
3. Non-React component (Vue/Angular)
4. Private repository
5. Rate limited API

### Scenario 3: Error Recovery
1. Disconnect GitHub mid-generation
2. Change selected repos during scan
3. Drag component from deleted repo
4. Network failure during fetch

## Metrics & Monitoring

```typescript
// Track success rates
const metrics = {
  discoveryCalls: 0,
  discoverySuccess: 0,
  componentsFetched: 0,
  realCodeUsed: 0,
  averageScanTime: 0,
  averageFetchTime: 0
};

// Log performance
console.time('[GitHub] Repository scan');
await scanRepository(repo);
console.timeEnd('[GitHub] Repository scan');
```

---

**This is the source of truth for how GitHub integration actually works.**  
**Last verified working**: January 11, 2025