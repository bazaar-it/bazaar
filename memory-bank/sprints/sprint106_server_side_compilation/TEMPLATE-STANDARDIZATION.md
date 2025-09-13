# Template Code Standardization Guide
Sprint 106 - Server-Side Compilation

## Problem Statement
Templates break in different execution contexts (desktop vs portrait) due to inconsistent code structure and return statement placement. The scene compiler expects specific patterns that must be followed for templates to work universally.

## Core Requirements

### 1. Function Declaration Pattern
Templates MUST follow this exact structure:

```javascript
function TemplateName() {
  // ALL imports and destructuring INSIDE the function
  const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;
  
  // Component logic here
  const frame = useCurrentFrame();
  
  // Return JSX using React.createElement
  return React.createElement(AbsoluteFill, { /* props */ });
}

// NO export statements
// NO top-level return statements
// The scene compiler will auto-add: return TemplateName;
```

### 2. Why This Structure?

#### Execution Contexts
Templates run in THREE different contexts:

1. **TSX Source** (development): Normal React component
2. **Pre-compiled JS** (Function constructor): `new Function(jsCode)()`
3. **Client Preview** (browser): Dynamic import or eval

#### The Function Constructor Environment
When templates are compiled server-side, they run inside:
```javascript
const func = new Function(compiledCode);
const Component = func();
```

This means:
- Code executes in a limited scope
- `window.Remotion` is the only way to access Remotion
- Top-level `return` statements are REQUIRED
- But the return must be added BY THE COMPILER, not in the template

### 3. Template Structure Rules

#### ✅ CORRECT Structure
```javascript
function MyTemplate() {
  const { AbsoluteFill, interpolate } = window.Remotion;
  const frame = useCurrentFrame();
  
  return React.createElement(AbsoluteFill, {
    style: { background: 'blue' }
  });
}
```

#### ❌ INCORRECT Structures

**Wrong: Top-level destructuring**
```javascript
const { AbsoluteFill } = window.Remotion; // ❌ Outside function
function MyTemplate() { ... }
```

**Wrong: Export statements**
```javascript
export default function MyTemplate() { ... } // ❌ No exports
```

**Wrong: Manual return statement**
```javascript
function MyTemplate() { ... }
return MyTemplate; // ❌ Compiler adds this
```

### 4. Template Configuration Object

Every template file must export a configuration:

```typescript
export const templateConfig = {
  id: 'template-id',
  name: 'Template Name',
  duration: 240, // frames
  previewFrame: 120,
  getCode: () => `function TemplateName() {
    // Template code following structure above
  }`
};
```

### 5. Compilation Flow

1. **Template Added** → User clicks "Add Template"
2. **TSX Retrieved** → Get source from file or database
3. **Conflict Detection** → Check for duplicate component names
4. **Auto-Namespacing** → Rename conflicts (e.g., `Button` → `Button_abc123`)
5. **Compilation** → Transform TSX to JS with Sucrase
6. **Return Addition** → Compiler adds `return ComponentName;`
7. **Execution** → Run in Function constructor

### 6. Common Patterns

#### Using Remotion Hooks
```javascript
function AnimatedTemplate() {
  const { useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  // ...
}
```

#### Creating Elements
```javascript
function ElementTemplate() {
  const { AbsoluteFill } = window.Remotion;
  
  // Always use React.createElement, not JSX
  return React.createElement(AbsoluteFill, {
    style: { background: 'red' }
  }, 
    React.createElement('h1', null, 'Title'),
    React.createElement('p', null, 'Description')
  );
}
```

#### Using Icons (when available)
```javascript
function IconTemplate() {
  const { AbsoluteFill } = window.Remotion;
  
  // IconifyIcon is provided globally when available
  return React.createElement(AbsoluteFill, null,
    window.IconifyIcon ? 
      React.createElement(window.IconifyIcon, { 
        icon: 'mdi:home',
        style: { fontSize: '48px' }
      }) : 
      React.createElement('div', null, '🏠')
  );
}
```

## Migration Guide

### Converting Existing Templates

1. **Find all templates** in `/src/templates/`
2. **Check `getCode()` function** in each template
3. **Apply these transformations**:

```javascript
// BEFORE (broken)
getCode: () => `
const { AbsoluteFill } = window.Remotion;
export default function Template() {
  return <AbsoluteFill />;
}
`

// AFTER (fixed)
getCode: () => `
function Template() {
  const { AbsoluteFill } = window.Remotion;
  return React.createElement(AbsoluteFill);
}
`
```

## Validation Checklist

Before deploying a template, verify:

- [ ] NO top-level destructuring
- [ ] NO export statements
- [ ] NO manual return at top level
- [ ] ALL Remotion imports use `window.Remotion`
- [ ] ALL JSX converted to `React.createElement`
- [ ] Function name matches expected component name
- [ ] Template works in Function constructor test

## Testing Template Compatibility

```javascript
// Quick test for template compatibility
function testTemplate(templateCode) {
  try {
    // This simulates the scene compiler's execution
    const wrappedCode = templateCode + '\nreturn ' + 
      templateCode.match(/function\s+(\w+)/)[1] + ';';
    
    const func = new Function(wrappedCode);
    const Component = func();
    
    // If this works, template is compatible
    console.log('✅ Template is valid');
    return true;
  } catch (error) {
    console.error('❌ Template invalid:', error.message);
    return false;
  }
}
```

## Summary

The key to template stability is consistency. Every template must:
1. Declare a single function with Remotion imports inside
2. Use `window.Remotion` for all Remotion access
3. Use `React.createElement` for all JSX
4. Let the compiler add the return statement
5. Never use exports or top-level code

Following these rules ensures templates work in all execution contexts: desktop, portrait, server-side compilation, and client-side preview.