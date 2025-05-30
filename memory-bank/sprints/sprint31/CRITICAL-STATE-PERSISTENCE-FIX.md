# CRITICAL: State Persistence Fix - Users Lose Their Work

## 🚨 **THE ROOT PROBLEM**

When users navigate away from a project page and return, they see the **welcome video instead of their actual scenes**. This is **UNACCEPTABLE** and breaks the core user experience.

### **Why This Happens**

1. **Database Schema Split**: 
   - **`projects.props`** stores welcome video (never updated)
   - **`scenes` table** stores actual user-generated scenes (separate storage)

2. **Broken Initialization Logic**:
   ```typescript
   // page.tsx passes this to WorkspaceContentAreaG
   initialProps={projectResult.props} // ❌ ALWAYS WELCOME VIDEO for existing projects!
   ```

3. **Race Condition in WorkspaceContentAreaG**:
   ```typescript
   // This runs but gets overwritten by initialProps
   if (result.data && result.data.length > 0) {
     const props = convertDbScenesToInputProps(result.data);
     replace(projectId, props); // ✅ Correct scenes
   } else {
     replace(projectId, initialProps); // ❌ Welcome video overwrites real scenes!
   }
   ```

### **The User Impact**
- ✅ User creates amazing scenes with code
- ❌ User refreshes page → **WORK LOST** → Welcome video shows
- 😡 User frustrated, thinks system is broken
- 💔 User abandons the platform

## 🔧 **THE SOLUTION**

### **Phase 1: Immediate Fix (Critical)**

**Fix the page.tsx initialization** to prioritize database scenes over `projects.props`:

```typescript
// src/app/projects/[id]/generate/page.tsx
export default async function GeneratePage(props: { params: Promise<{ id: string }> }) {
  // ... existing code ...
  
  // 🚨 NEW: Check for existing scenes FIRST
  const existingScenes = await db.query.scenes.findMany({
    where: eq(scenes.projectId, projectId),
    orderBy: [scenes.order],
  });
  
  let actualInitialProps: InputProps;
  
  if (existingScenes.length > 0) {
    // ✅ HAS REAL SCENES: Convert database scenes to props format
    console.log('[GeneratePage] Found existing scenes, creating props from database');
    
    let currentStart = 0;
    const convertedScenes = existingScenes.map((dbScene) => {
      const scene = {
        id: dbScene.id,
        type: 'custom' as const,
        start: currentStart,
        duration: dbScene.duration,
        data: {
          code: dbScene.tsxCode,
          name: dbScene.name,
          componentId: dbScene.id,
          props: dbScene.props || {}
        }
      };
      currentStart += dbScene.duration;
      return scene;
    });
    
    actualInitialProps = {
      meta: {
        title: projectResult.title,
        duration: currentStart,
        backgroundColor: projectResult.props?.meta?.backgroundColor || '#000000'
      },
      scenes: convertedScenes
    };
  } else {
    // ✅ NEW PROJECT: Use stored props (welcome video)
    console.log('[GeneratePage] No existing scenes, using stored project props');
    actualInitialProps = projectResult.props;
  }

  return (
    <GenerateWorkspaceRoot
      projectId={projectId}
      initialProjects={userProjects.map(p => ({ id: p.id, name: p.title }))}
      initialProps={actualInitialProps} // ✅ ALWAYS CORRECT PROPS
    />
  );
}
```

### **Phase 2: Architecture Cleanup (Important)**

**Option A: Single Source of Truth (Recommended)**
- Store ALL scene data in `scenes` table
- Use `projects.props` only for metadata (title, background, etc.)
- Always fetch scenes from database for initialization

**Option B: Sync Mechanism**
- Update `projects.props` whenever scenes change
- Keep database in sync automatically

### **Phase 3: User Experience Enhancement**

**Add Loading States**:
```typescript
// Show loading while fetching real project state
if (isLoading) {
  return <ProjectLoadingSpinner />;
}
```

**Last Scene Selection Persistence**:
```typescript
// Store last selected scene in localStorage
localStorage.setItem(`lastScene_${projectId}`, selectedSceneId);

// Restore on load
const lastSceneId = localStorage.getItem(`lastScene_${projectId}`);
if (lastSceneId) {
  setSelectedSceneId(lastSceneId);
  // Auto-open code panel for last edited scene
}
```

## 🔥 **IMMEDIATE ACTION REQUIRED**

### **1. Fix page.tsx (URGENT)**
- Add scene checking logic to `page.tsx`
- Pass correct initial props based on database state
- Test with existing projects that have scenes

### **2. Remove Duplicate Logic (IMPORTANT)**  
- Simplify WorkspaceContentAreaG initialization
- Remove redundant database fetching since page.tsx now handles it
- Clean up race conditions

### **3. Add Safety Mechanisms (CRITICAL)**
- Add error boundaries for state loading failures
- Implement fallback to last known good state
- Log all state transitions for debugging

## 🎯 **SUCCESS CRITERIA**

✅ **User creates scenes** → refreshes page → **SEES THEIR ACTUAL SCENES**  
✅ **Code panel shows last edited scene** on page load  
✅ **No more welcome video** for projects with real content  
✅ **Fast page loads** with correct content immediately  
✅ **Zero data loss** during navigation  

## 📋 **TESTING CHECKLIST**

- [ ] Create new project → welcome video shows ✅
- [ ] Generate first scene → refresh → scene shows ✅  
- [ ] Generate multiple scenes → refresh → all scenes show ✅
- [ ] Edit scene → refresh → edited version shows ✅
- [ ] Delete scene → refresh → updated scene list shows ✅
- [ ] Navigate to different project → return → correct content shows ✅

## 🚨 **CRITICAL PRIORITY**

This bug **BREAKS THE CORE VALUE PROPOSITION** of the platform. Users create content but lose it on refresh. This must be fixed **IMMEDIATELY** before any other features.

**Estimated Fix Time**: 2-3 hours  
**Risk Level**: LOW (only improves existing logic)  
**User Impact**: MASSIVE (fixes major data loss perception) 