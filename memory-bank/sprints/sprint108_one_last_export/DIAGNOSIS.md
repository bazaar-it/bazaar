# Sprint 108 - Export Diagnosis

## Date: 2025-09-02

## Problem Statement
Exports complete successfully but show fallback metadata instead of actual scene content.

## Diagnostic Evidence

### 1. Scene Preprocessing Output
Every scene shows the same pattern:
```javascript
// Scene ends with:
"}\n// Last expression is returned by Function constructor\nComponent;\n"

// Metadata shows:
hasComponentFunctions: true
hasExportDefault: false
hasReturnComponent: false  // ← This is concerning
```

### 2. Function Constructor Execution Flow

#### Expected Flow:
1. Function constructor receives code ending with `Component;`
2. Function constructor returns last expression (Component)
3. Component is rendered

#### Actual Flow:
1. Function constructor receives code ✅
2. Function constructor executes but doesn't return Component ❌
3. Fallback metadata is shown ❌

### 3. Code Transformation Pipeline

```
Original TSX → processSceneCode() → JavaScript with "Component;" → Lambda
```

The transformation is working correctly:
- ✅ TSX is converted to JS
- ✅ `Component;` is added as last line
- ✅ Icons are replaced
- ❌ Component is not returned by Function constructor

## Critical Discovery

Looking at the modified `MainCompositionSimple.tsx`:
```javascript
if (ComponentFactory) {
  if (typeof ComponentFactory === 'function') {
    console.log(`[DynamicScene] Rendering function component for scene ${index}`);
    return <ComponentFactory />;
  }
  if (React.isValidElement(ComponentFactory)) {
    console.log(`[DynamicScene] Rendering element component for scene ${index}`);
    return ComponentFactory;
  }
  console.error(`[DynamicScene] Unsupported component value for scene ${index}:`, ComponentFactory);
}
```

The logs don't show ANY of these console messages, which means:
- ComponentFactory is likely `undefined` or falsy
- The Function constructor is not returning anything

## Root Cause

The Function constructor in JavaScript has a specific behavior:
- It returns the value of the last **expression**
- But our code has `Component;` as a **statement** after function definitions

Example of the issue:
```javascript
const fn = new Function('', `
  const Component = function() { return 'hello'; }
  Component;  // This is a statement, not the return value
`);
console.log(fn()); // undefined
```

vs

```javascript
const fn = new Function('', `
  const Component = function() { return 'hello'; }
  Component  // No semicolon - this is an expression
`);
console.log(fn()); // function Component
```

## The Semicolon Problem

Our preprocessing adds `Component;` with a semicolon, making it a statement rather than an expression that gets returned.

## Solution Options

### Option 1: Remove Semicolon (Quick Fix)
Change preprocessing to add `Component` without semicolon

### Option 2: Explicit Return (Reliable)
Change preprocessing to add `return Component;`

### Option 3: Direct Evaluation (Most Reliable)
Instead of:
```javascript
const Component = function() {...}
Component;
```

Generate:
```javascript
(function() {...})  // Return the function directly
```

## Why This Wasn't Caught Earlier

- Local testing may have different JavaScript engine behavior
- The semicolon issue is subtle and environment-dependent
- Lambda's V8 engine may be stricter about statement vs expression

## Immediate Fix Needed

The preprocessing in `render.service.ts` needs to either:
1. Remove the semicolon from the last line
2. Add explicit `return` statement
3. Restructure to return the function directly

This is why all scenes show fallback - none of them are returning their components properly.