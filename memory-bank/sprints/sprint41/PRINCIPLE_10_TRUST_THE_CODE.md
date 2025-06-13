# Principle 10: Trust The Code

## The Principle
**Assume success.** Don't write defensive code for scenarios that shouldn't happen.

## Current Problem
```typescript
// ❌ WRONG: Defensive programming everywhere
async function updateScene(sceneId?: string | null, data?: any) {
  if (!sceneId) {
    console.error('No scene ID provided');
    return null;
  }
  
  if (typeof sceneId !== 'string') {
    console.error('Scene ID must be a string');
    return null;
  }
  
  if (!data) {
    console.error('No data provided');
    return null;
  }
  
  try {
    const scene = await db.query.scenes.findFirst({
      where: eq(scenes.id, sceneId)
    });
    
    if (!scene) {
      console.error('Scene not found');
      return null;
    }
    
    // 20 more checks...
  } catch (error) {
    console.error('Database error', error);
    return null;
  }
}
```

## Correct Implementation
```typescript
// ✅ RIGHT: Trust your types and systems
async function updateScene(sceneId: string, data: SceneUpdate) {
  await db.update(scenes)
    .set(data)
    .where(eq(scenes.id, sceneId));
}

// If it fails, let it fail with a real error
```

## Trust These Things

### 1. TypeScript Types
```typescript
// If TypeScript says it's a string, it's a string
function processScene(scene: Scene) {
  // ❌ WRONG
  if (!scene || typeof scene.id !== 'string') return;
  
  // ✅ RIGHT
  console.log(scene.id); // Trust the type
}
```

### 2. Database Operations
```typescript
// ❌ WRONG: Check everything
const exists = await checkIfExists(id);
if (exists) {
  const result = await update(id, data);
  if (result) {
    const verified = await verifyUpdate(id);
    // ... endless checks
  }
}

// ✅ RIGHT: Just do it
await db.update(scenes).set(data).where(eq(scenes.id, id));
// Database constraints handle integrity
```

### 3. State Updates
```typescript
// ❌ WRONG: Defensive state management
updateState(newData) {
  if (!newData) return;
  if (!this.validateData(newData)) return;
  if (!this.checkPermissions()) return;
  
  const cloned = JSON.parse(JSON.stringify(newData));
  const sanitized = this.sanitizeData(cloned);
  const validated = this.validateAgain(sanitized);
  
  this.state = validated;
}

// ✅ RIGHT: Trust the flow
updateState(newData: StateUpdate) {
  Object.assign(this.state, newData);
  this.notify();
}
```

### 4. AI Responses
```typescript
// ❌ WRONG: Over-validate AI output
const response = await ai.generate(prompt);
if (!response || !response.content || 
    typeof response.content !== 'string' ||
    response.content.length === 0) {
  // Handle every edge case
}

// ✅ RIGHT: Trust the AI client
const response = await ai.generate(prompt);
return response.content; // It works or throws
```

## When to Be Defensive

Only at system boundaries:
```typescript
// ✅ OK: User input validation
app.post('/api/scene', (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid prompt' });
  }
  // Now trust it internally
});

// ✅ OK: External API responses
const githubData = await fetch(url).then(r => r.json());
if (!githubData.id) {
  throw new Error('Invalid GitHub response');
}
```

## Benefits
- 80% less code
- Clearer intent
- Real errors bubble up
- Easier debugging
- Faster development

## Success Criteria
- No defensive checks internally
- Trust TypeScript types
- Let failures fail fast
- Validate only at boundaries
- Clean, confident code