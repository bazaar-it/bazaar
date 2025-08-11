# GitHub Integration: Quick Start Guide for New Developers

## 🚀 30-Second Overview

**What it does**: Lets users drag their actual GitHub components into chat and animate them.

**How it works**: Scans GitHub repos → Shows components in panel → Drag to chat → Fetches real code → Generates animation.

**Current state**: 85% working. Discovery works great, code fetching needs improvement.

## 🏃 5-Minute Setup

### 1. Test the Feature (User Perspective)
```bash
# Start the app
npm run dev

# As a user:
1. Go to Settings → Connect GitHub
2. Authorize the app
3. Select a repository (pick one with React components)
4. Open any project
5. Click "GitHub Components" in sidebar
6. Wait 2-3 seconds for scan
7. Drag a component to chat
8. Type "animate this" and send
9. Watch the preview panel
```

### 2. Enable Debug Mode (Developer Perspective)
```typescript
// Add to .env.local
GITHUB_DEBUG=true

// This enables verbose logging:
// - [GitHub] Component discovery started
// - [GitHub] Found 91 components
// - [GitHub] Fetching file: src/components/Footer.tsx
// - [GitHub] Enhanced prompt with real code
```

### 3. Test Key Components
```bash
# Test discovery endpoint
curl http://localhost:3000/api/trpc/githubDiscovery.discoverComponents

# Test OAuth flow
curl http://localhost:3000/api/auth/github

# Check database
npm run db:studio
# Look at github_connections table
```

## 🔧 Common Development Tasks

### Task 1: "I need to add a new component category"

```typescript
// 1. Add pattern in component-indexer.service.ts
const COMPONENT_PATTERNS = {
  animations: [/Animation/, /Transition/, /Motion/], // NEW
  auth: [/Login/, /Signup/],
  // ...
};

// 2. Add UI config in ComponentDiscoveryPanel.tsx
import { Sparkles } from 'lucide-react'; // NEW icon

const CATEGORY_CONFIG = {
  animations: { 
    label: 'Animations', 
    icon: Sparkles,
    color: 'bg-purple-500',
    description: 'Motion and transitions'
  },
  // ...
};

// That's it! Category will auto-populate
```

### Task 2: "I need to debug why a component isn't being found"

```typescript
// 1. Check if file is being scanned
// In component-indexer.service.ts, add:
console.log('[ComponentIndexer] Potential component:', file.path);

// 2. Check if it matches patterns
console.log('[ComponentIndexer] Checking patterns for:', fileName);
console.log('[ComponentIndexer] Matched category:', category);

// 3. Check final categorization
console.log('[ComponentIndexer] Categorized components:', {
  auth: authComponents.length,
  core: coreComponents.length,
  // ...
});
```

### Task 3: "I need to test without GitHub"

```typescript
// In ComponentDiscoveryPanel.tsx, add mock data:
const mockCatalog = {
  core: [
    { name: 'Header', path: 'src/Header.tsx', repo: 'test/repo', score: 90 },
    { name: 'Footer', path: 'src/Footer.tsx', repo: 'test/repo', score: 85 },
  ],
  auth: [
    { name: 'Login', path: 'src/Login.tsx', repo: 'test/repo', score: 100 },
  ]
};

// Use mock instead of API:
const catalog = MOCK_MODE ? mockCatalog : data;
```

### Task 4: "I need to fix the 'generic animation' problem"

```typescript
// The issue is useGitHub flag not propagating. Check:

// 1. In ChatPanelG where message is sent:
console.log('Sending with useGitHub:', true);

// 2. In generate-stream/route.ts:
console.log('Received useGitHub:', searchParams.get('useGitHub'));

// 3. In scene-operations.ts:
console.log('Passing useGitHub:', userContext?.useGitHub);

// 4. In orchestratorNEW.ts:
console.log('Orchestrator useGitHub:', input.userContext?.useGitHub);

// If any is false/undefined, track backwards to find the break
```

## 📁 File Structure Map

```
Frontend (User-facing):
├── ComponentDiscoveryPanel.tsx - The main UI panel
├── ChatPanelG.tsx - Handles drops (line ~390)
└── GenerateSidebar.tsx - Has the GitHub button

Backend (Processing):
├── component-indexer.service.ts - Scans repos
├── component-search.service.ts - Finds specific components
├── github-discovery.router.ts - API endpoints
└── github-component-analyzer.ts - Fetches actual code

Integration (Glue):
├── orchestratorNEW.ts - Decides to use GitHub (line ~36)
├── scene-operations.ts - Passes flags (line ~186)
└── generate-stream/route.ts - SSE endpoint (line ~47)
```

## 🐛 Quick Debugging Checklist

### Panel Shows "No components found"
```bash
# Check these in order:
1. Is repo selected? → Check Settings
2. Does repo have .tsx files? → Check GitHub
3. Is API working? → Check Network tab for discoverComponents
4. Any console errors? → Check browser console
```

### Animation is generic (not real component)
```bash
# Check these in order:
1. Is useGitHub=true in URL? → Check Network tab
2. Is "Enhanced prompt" in logs? → Check server console
3. Is component found? → Look for "Fetching file directly"
4. Is code included? → Check for "HERE IS THE ACTUAL"
```

### Panel loads slowly
```bash
# Check these:
1. How many files in repo? → Check GitHub
2. Rate limited? → Check for 403 errors
3. Cache working? → Should be instant on second open
```

## 💡 Key Insights (Save Hours of Debugging)

### Insight 1: The useGitHub Flag Journey
```
Chat → SSE URL → generate-stream → scene-operations → orchestrator → analyzer
     ↑ This flag MUST be true at every step or it fails silently
```

### Insight 2: Component Discovery vs Component Fetching
```
Discovery: Fast, uses Tree API, gets file list only
Fetching: Slower, uses Contents API, gets actual code
These are SEPARATE operations!
```

### Insight 3: Why Multi-Select Matters
```
Users think: "Animate my dashboard"
Reality: Dashboard = Header + Sidebar + Content + Footer
Multi-select lets them grab all at once
```

### Insight 4: The Path is Critical
```
BAD:  "Animate my Footer component" → Searches all files
GOOD: "Animate my Footer from src/components/Footer.tsx" → Direct fetch
The path makes it 10x more reliable
```

## 🧪 Test Cases to Verify Your Changes

### Test 1: Basic Flow
```typescript
// Should see in logs:
"[GitHub] useGitHub flag: true"
"[GitHub] Component ref extracted: {name: 'footer', path: 'src/...'}"
"[GitHub] Trying to fetch file: src/components/ui/Footer.tsx"
"[GitHub] Enhanced prompt includes real code: true"
```

### Test 2: Multi-Select
```typescript
// Select 3 components, drag to chat
// Should create message like:
"Animate my Header component from src/Header.tsx
Animate my Sidebar component from src/Sidebar.tsx  
Animate my Footer component from src/Footer.tsx"
```

### Test 3: Error Recovery
```typescript
// Disconnect GitHub while panel is open
// Should show: "Connect GitHub to Discover Components"
// Reconnect should restore without refresh
```

## 🎯 Success Metrics

You know it's working when:
1. ✅ Discovery finds 50+ components from bazaar-vid repo
2. ✅ Components are categorized (not all in "custom")
3. ✅ Drag & drop adds correct message to chat
4. ✅ Console shows "Enhanced prompt with GitHub component context"
5. ✅ Animation actually looks like the component (not generic)

## 🚑 Emergency Fixes

### "Everything is broken!"
```bash
# Reset GitHub connection
DELETE FROM github_connections WHERE user_id = 'your-id';

# Clear component cache  
DELETE FROM component_cache;

# Restart dev server
npm run dev
```

### "API rate limited!"
```bash
# Add to .env.local
GITHUB_CACHE_TTL=3600000 # 1 hour instead of 5 min

# Or use personal access token for higher limits
GITHUB_PAT=ghp_xxxxxxxxxxxx
```

### "Can't find my component!"
```typescript
// Temporarily modify pattern matching
const COMPONENT_PATTERNS = {
  custom: [/.*/], // Match everything!
};
```

## 📞 Who to Ask for Help

- **GitHub OAuth Issues**: Check NextAuth.js docs
- **Component Not Found**: Review component-indexer.service.ts patterns
- **Animation Wrong**: Check github-component-analyzer.ts enhanced prompt
- **Performance Issues**: Review caching in github-discovery.router.ts
- **UI Problems**: Check ComponentDiscoveryPanel.tsx

---

**Pro Tip**: The whole system is just plumbing to get real component code into the AI prompt. If the animation is wrong, work backwards from the prompt to find where the real code got lost.

**Remember**: Discovery (finding components) and Fetching (getting code) are different. Both must work for success!

**Last Updated**: January 11, 2025