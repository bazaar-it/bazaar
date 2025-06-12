# Architecture Deep Dive - State Management & Data Flow

## The Five Layers of Truth

### 1. Database (Permanent Truth)
**Location**: PostgreSQL (Neon)
**Purpose**: Persistent storage, multi-user truth
**When Used**: 
- On session start (load project)
- After each mutation (save changes)
- For context building (brain queries)

```sql
-- Key tables
projects     -- Project metadata
scenes       -- Scene data with tsxCode
messages     -- Chat history
iterations   -- Version history
memory       -- User preferences
```

### 2. VideoState (Session Truth)
**Location**: Zustand store in browser memory
**Purpose**: Single source of truth for UI during session
**When Used**: 
- Continuously during session
- Updates immediately on user action
- Drives ALL UI components

```typescript
interface VideoState {
  // Normalized data
  projects: Record<projectId, ProjectState>
  scenes: Record<sceneId, Scene>  
  messages: Record<messageId, Message>
  
  // UI state
  selectedSceneId: string | null
  isLoading: boolean
  refreshToken: string  // Forces re-renders
  
  // Update methods
  updateScene: (id, data) => void
  addMessage: (projectId, message) => void
}
```

### 3. Brain Context Cache (Decision Cache)
**Location**: Server memory (Node.js)
**Purpose**: Speed up brain decisions
**Lifetime**: 5 minutes per project
**When Used**: Every brain decision

```typescript
class ContextCache {
  private cache = Map<projectId, {
    scenes: SceneContext[]      // Minimal scene info
    chatHistory: Message[]      // Last 10 messages  
    preferences: UserPrefs      // Cached preferences
    timestamp: number           // For TTL
  }>
}
```

### 4. R2 Component Storage (Code Truth)
**Location**: Cloudflare R2 + CDN
**Purpose**: Compiled React components
**When Used**: 
- After code generation (upload)
- During preview rendering (download)

```
/components/
  scene_001.js    // Compiled TSX → JS
  scene_002.js    // Browser-ready components
```

### 5. Local Browser Cache
**Location**: Browser localStorage/memory
**Purpose**: Performance optimization
**What's Cached**:
- Compiled components (in memory)
- User preferences
- Recent messages

---

## Data Flow Patterns

### Pattern 1: Optimistic Updates (Edit Scene)
```
User Action → VideoState → UI Updates → API Call → Database
     ↓            ↓                         ↓          ↓
   Instant    All Panels              Server Work   Persistent
   
If API fails: VideoState reverts → UI reverts
```

### Pattern 2: Server-First (Add Scene)
```
User Action → API Call → Brain → Tools → Database → VideoState
                 ↓         ↓       ↓         ↓           ↓
             Loading   Decision  Create   Persist    Update UI
```

### Pattern 3: Cache-Accelerated (Quick Edits)
```
User Action → Brain (cache hit) → Tool → Database
                    ↓               ↓        ↓
                 Fast Path     Direct Edit  Update
                 
Saves: 100ms context building + 300ms AI analysis
```

---

## Memory Lifecycle

### Session Start
```typescript
1. Load project from database
   → SELECT * FROM projects, scenes, messages
   
2. Initialize VideoState
   → videoState.setProject(projectId, props)
   
3. Warm brain cache
   → First request builds context
   → Subsequent requests use cache
```

### During Session
```typescript
1. User actions update VideoState immediately
   → Optimistic UI, no waiting
   
2. API calls update database
   → Async, in background
   
3. Brain cache stays warm
   → Rebuilds incrementally
   → Expires after 5 min inactivity
```

### Session End
```typescript
1. VideoState persists to database
   → Any pending changes saved
   
2. Brain cache expires naturally
   → 5 minute TTL
   
3. R2 components remain cached
   → CDN handles expiry
```

---

## Cache Strategies

### 1. Brain Context Cache
```typescript
Strategy: Time-based (5min) + Incremental Updates
Pro: Fast decisions, less API calls
Con: Can miss external updates

Invalidation:
- Time-based expiry
- Manual clear on major changes
- Incremental refresh for messages
```

### 2. VideoState
```typescript
Strategy: Session-based + Optimistic
Pro: Instant UI, great UX
Con: Can diverge from database

Reconciliation:
- On API response
- On error (revert)
- On page refresh (reload from DB)
```

### 3. R2/CDN Cache
```typescript
Strategy: Content-hash based
Pro: Globally distributed, fast
Con: Purge delays

Headers:
Cache-Control: public, max-age=3600
ETag: "scene_001_v2"
```

---

## Optimization Techniques

### 1. Parallel Loading
```typescript
// Bad - Sequential
const scenes = await loadScenes();
const messages = await loadMessages();
const prefs = await loadPreferences();

// Good - Parallel  
const [scenes, messages, prefs] = await Promise.all([
  loadScenes(),
  loadMessages(), 
  loadPreferences()
]);
```

### 2. Incremental Updates
```typescript
// Instead of refetching everything
const newMessages = await getMessagesSince(lastTimestamp);
context.messages = [...newMessages, ...context.messages];
```

### 3. Selective Context
```typescript
// Surgical edit needs minimal context
if (intent.editType === 'surgical') {
  return { sceneId, prompt };  // No full code needed
}

// Creative edit needs more
if (intent.editType === 'creative') {
  return { sceneId, code, prompt, preferences };
}
```

### 4. Quick Detection Patterns
```typescript
// Skip AI for obvious patterns
const QUICK_PATTERNS = {
  duration: /make it (\d+) seconds?/,
  delete: /delete|remove/,
  color: /change .* to (red|blue|green)/
};
```

---

## Consistency Guarantees

### Eventually Consistent
- VideoState may temporarily differ from database
- R2 uploads may lag behind database
- Brain cache may have stale data

### Strongly Consistent
- Database is always authoritative
- On conflict, database wins
- Page refresh resets to database state

### Conflict Resolution
```typescript
1. Optimistic update fails
   → Revert VideoState
   → Show error message
   → Offer retry

2. Concurrent edits (multi-user)
   → Last write wins (database)
   → Could implement operational transforms

3. Cache invalidation
   → Time-based expiry prevents staleness
   → Manual invalidation for critical updates
```

---

## Performance Metrics

### Target Latencies
- User action → UI update: <16ms (1 frame)
- Brain decision: <500ms (with cache: <100ms)
- Scene generation: <2s
- Scene edit: <1s
- Duration change: <300ms

### Memory Usage
- VideoState: ~50KB per project
- Brain cache: ~10KB per project context
- Component cache: ~20KB per scene

### API Calls Saved
- Context caching: -1 AI call per request
- Quick detection: -1 AI call for patterns
- Incremental updates: -N database queries

---

## Debug Points

### Client-Side
```typescript
// Check VideoState
useVideoState.getState()

// Check specific project
useVideoState.getState().projects['proj_123']

// Check cache status
sceneUpdater.getSyncStatus()
```

### Server-Side
```typescript
// Check brain cache
contextBuilder.cache.get('proj_123')

// Check decision flow
console.log('[Brain]', decision)

// Check tool execution  
console.log('[SceneService]', result)
```

### Database
```sql
-- Check scene versions
SELECT * FROM scene_iterations 
WHERE scene_id = 'scene_001' 
ORDER BY version DESC;

-- Check message flow
SELECT * FROM messages 
WHERE project_id = 'proj_123' 
ORDER BY created_at DESC;
```