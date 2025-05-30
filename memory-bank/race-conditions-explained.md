//memory-bank/race-conditions-explained.md
# Race Conditions Explained - Bazaar-Vid Context

## 🎯 **What is a Race Condition?**

A **race condition** occurs when multiple operations happen simultaneously and the final result depends on **which one finishes first** - creating unpredictable, buggy behavior.

### **Simple Analogy: Bank Account**
```
Your bank account has $100
You and your partner both try to withdraw $60 simultaneously:

Operation A reads: $100 ✓
Operation B reads: $100 ✓  
Operation A subtracts: $100 - $60 = $40
Operation B subtracts: $100 - $60 = $40
Operation A writes: $40 ✓
Operation B writes: $40 ✓

Result: Account shows $40 (should show -$20 or reject one withdrawal)
```

## 🚨 **Critical Race Conditions in Bazaar-Vid**

### **1. Welcome Scene Race Condition** *(Most Critical)*
**File**: `src/server/api/routers/generation.ts` (Lines 57-62)

```typescript
// ❌ RACE CONDITION: Two separate database operations
if (project.isWelcome) {
  await db.update(projects)
    .set({ isWelcome: false })      // ⚠️ Operation #1
    .where(eq(projects.id, projectId));
    
  await db.delete(scenes)           // ⚠️ Operation #2
    .where(eq(scenes.projectId, projectId));
}
```

**Scenario**: User double-clicks "Generate Scene"
1. Request A checks `isWelcome: true` ✓
2. Request B checks `isWelcome: true` ✓ (same time)
3. Request A sets `isWelcome: false`
4. Request B sets `isWelcome: false` (unnecessary)
5. Request A deletes scenes
6. Request B deletes scenes (deletes new scenes!)

**Impact**: 
- Data corruption
- Lost user scenes
- Inconsistent project state

**Fix**: Wrap in database transaction
```typescript
// ✅ FIXED: Atomic operation
await db.transaction(async (tx) => {
  await tx.update(projects).set({ isWelcome: false })...
  await tx.delete(scenes).where(...)
});
```

### **2. Tool Registration Race Condition**
**File**: `src/server/services/brain/orchestrator.ts`

```typescript
// ❌ RACE CONDITION: Multiple instances register same tools
constructor() {
  if (!this.toolsRegistered) {
    newSceneTools.forEach(tool => toolRegistry.register(tool));  
    this.toolsRegistered = true;    // ⚠️ Multiple instances hit this
  }
}
```

**Scenario**: Hot Module Reload in development
1. Instance A checks `toolsRegistered: false` ✓
2. Instance B checks `toolsRegistered: false` ✓ (same time)
3. Instance A registers all tools
4. Instance B registers all tools (duplicates!)

**Impact**:
- Duplicate tool registrations
- API conflicts
- Test pollution
- HMR issues

**Fix**: Module-level singleton
```typescript
// ✅ FIXED: Register once at module level
let toolsInitialized = false;

export function initializeTools() {
  if (!toolsInitialized) {
    newSceneTools.forEach(tool => toolRegistry.register(tool));
    toolsInitialized = true;
  }
}
```

### **3. Message State Race Condition**
**File**: `src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx`

```typescript
// ❌ RACE CONDITION: Multiple message sources
const [optimisticMessages, setOptimisticMessages] = useState([]);
const { data: serverMessages } = trpc.generation.getChatMessages.useQuery();
```

**Scenario**: User types message, server is slow
1. User sends "Create a red background scene"
2. UI immediately shows optimistic message ✓
3. Server processes request (slow)
4. Server returns "I'll create a red background scene"
5. UI now shows both messages (duplicate!)

**Impact**:
- Duplicate messages in UI
- Confusing user experience
- Inconsistent state

**Fix**: Single source of truth
```typescript
// ✅ FIXED: Remove optimistic state, use server only
const { data: messages } = trpc.generation.getChatMessages.useQuery();
```

## 🔍 **How to Identify Race Conditions**

### **Warning Signs**:
1. **Separate await calls** on related data
2. **Multiple state sources** for same information
3. **Constructor initialization** of shared resources
4. **No locking mechanism** for critical sections

### **Common Patterns**:
```typescript
// ❌ RACE CONDITION PATTERNS
const data = await getData();     // Read
const newData = transform(data);  // Transform  
await saveData(newData);          // Write (another process could change data)

// ✅ SAFE PATTERNS
await db.transaction(async (tx) => {
  const data = await tx.getData();
  const newData = transform(data);
  await tx.saveData(newData);     // Atomic operation
});
```

## 🛠️ **Prevention Strategies**

### **1. Database Transactions**
```typescript
// Wrap related operations in single transaction
await db.transaction(async (tx) => {
  // All operations are atomic
});
```

### **2. Singleton Pattern**
```typescript
// Initialize shared resources once
let instance = null;
export function getInstance() {
  if (!instance) instance = new Service();
  return instance;
}
```

### **3. Optimistic Locking**
```typescript
// Check version before updating
const current = await getData();
if (current.version !== expectedVersion) {
  throw new Error("Data was modified by another process");
}
```

### **4. Single Source of Truth**
```typescript
// Don't duplicate state
// Use server state, not local state for critical data
const { data } = useQuery(); // ✅ Single source
```

## 📊 **Impact Assessment**

| Race Condition | Severity | Fix Time | User Impact |
|---------------|----------|----------|-------------|
| Welcome Scene Logic | 🔴 Critical | 15 min | Data loss |
| Tool Registration | 🟡 Medium | 10 min | Dev issues |
| Message Duplication | 🟡 Medium | 30 min | UX confusion |

## 🎯 **Next Steps**

1. **Fix Welcome Scene Race** - Wrap in transaction (CRITICAL)
2. **Move Tool Registration** - Module-level initialization
3. **Remove Optimistic Messages** - Use server-only state
4. **Add Linting Rules** - Detect potential race conditions

Race conditions are **silent bugs** that only appear under specific timing conditions, making them extremely dangerous in production systems.
