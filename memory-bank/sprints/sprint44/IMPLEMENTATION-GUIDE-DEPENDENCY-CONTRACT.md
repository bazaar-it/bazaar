# Implementation Guide: Dependency Contract & Lazy Loading

## Overview
This guide details how to implement a dependency contract system and lazy loading while keeping the window.* approach that currently works well for AI code generation.

## Part 1: Dependency Contract System

### 1.1 Create the Contract
**File**: `src/lib/codegen/dependencies-contract.ts`

```typescript
/**
 * Single source of truth for all window.* dependencies
 * This contract ensures AI and runtime are always in sync
 */
export const WINDOW_DEPENDENCIES_CONTRACT = {
  version: "1.0.0",
  
  // Core dependencies (always loaded)
  core: {
    React: {
      enabled: true,
      exports: ["useState", "useEffect", "useRef", "useMemo", "useCallback", "createElement"],
      size: "130KB"
    },
    ReactDOM: {
      enabled: true,
      exports: ["render", "createRoot"],
      size: "45KB"
    },
    Remotion: {
      enabled: true,
      exports: ["AbsoluteFill", "useCurrentFrame", "useVideoConfig", "interpolate", "spring", "Sequence"],
      size: "200KB"
    }
  },
  
  // Optional dependencies (can be lazy loaded)
  optional: {
    HeroiconsSolid: {
      enabled: false, // Enable when ready
      exports: ["StarIcon", "HeartIcon", "CheckIcon", "PlayIcon", "etc..."],
      size: "250KB",
      importPath: "@heroicons/react/24/solid"
    },
    HeroiconsOutline: {
      enabled: false,
      exports: ["StarIcon", "HeartIcon", "CheckIcon", "PlayIcon", "etc..."],
      size: "250KB",
      importPath: "@heroicons/react/24/outline"
    },
    RemotionShapes: {
      enabled: false,
      exports: ["Circle", "Rectangle", "Triangle", "Star"],
      size: "50KB",
      importPath: "@remotion/shapes"
    }
  },
  
  // Rules for code generation
  rules: {
    noImports: true,
    functionPattern: "export default function {{NAME}}()",
    cssQuoting: true,
    forbiddenPatterns: ["eval(", "Function(", "document.", "window.location"]
  }
};

// Helper to get all enabled dependencies
export function getEnabledDependencies() {
  const enabled: Record<string, any> = {};
  
  // Add core deps
  Object.entries(WINDOW_DEPENDENCIES_CONTRACT.core).forEach(([name, config]) => {
    if (config.enabled) enabled[name] = config;
  });
  
  // Add optional deps
  Object.entries(WINDOW_DEPENDENCIES_CONTRACT.optional).forEach(([name, config]) => {
    if (config.enabled) enabled[name] = config;
  });
  
  return enabled;
}

// Generate prompt snippet for AI
export function generateDependencyPrompt(): string {
  const enabled = getEnabledDependencies();
  return `
AVAILABLE DEPENDENCIES (use window.* pattern):
${Object.entries(enabled).map(([name, config]) => 
  `- window.${name}: ${config.exports.slice(0, 5).join(', ')}...`
).join('\n')}

FORBIDDEN: No import statements. Use only the window.* pattern above.`;
}
```

### 1.2 Simple Validation System
**File**: `src/lib/codegen/code-validator.ts`

```typescript
import { WINDOW_DEPENDENCIES_CONTRACT, getEnabledDependencies } from './dependencies-contract';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  usedDependencies: string[];
}

export function validateGeneratedCode(
  code: string,
  sceneName: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const usedDeps = new Set<string>();
  
  // Check 1: No imports
  if (/^\s*import\s+/m.test(code) || /require\s*\(/.test(code)) {
    errors.push("Import statements detected. Use window.* pattern only.");
  }
  
  // Check 2: Has export default function
  const expectedExport = WINDOW_DEPENDENCIES_CONTRACT.rules.functionPattern
    .replace('{{NAME}}', sceneName);
  if (!code.includes('export default function')) {
    errors.push(`Missing required export pattern: ${expectedExport}`);
  }
  
  // Check 3: Window dependencies exist
  const windowMatches = code.matchAll(/window\.(\w+)/g);
  const enabledDeps = Object.keys(getEnabledDependencies());
  
  for (const match of windowMatches) {
    const depName = match[1];
    usedDeps.add(depName);
    
    if (!enabledDeps.includes(depName)) {
      errors.push(`window.${depName} is not available. Available: ${enabledDeps.join(', ')}`);
    }
  }
  
  // Check 4: Forbidden patterns
  WINDOW_DEPENDENCIES_CONTRACT.rules.forbiddenPatterns.forEach(pattern => {
    if (code.includes(pattern)) {
      errors.push(`Security violation: ${pattern} is not allowed`);
    }
  });
  
  // Check 5: CSS quoting (warning only)
  if (/fontSize:\s*\d+[^"']/.test(code)) {
    warnings.push("Numeric CSS values should be quoted (e.g., fontSize: '24px')");
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    usedDependencies: Array.from(usedDeps)
  };
}
```

### 1.3 Integrate with Code Generator
**Update**: `src/tools/add/add_helpers/CodeGeneratorNEW.ts`

```typescript
import { generateDependencyPrompt, validateGeneratedCode } from '~/lib/codegen';

// In generateCodeDirect method:
async generateCodeDirect(input: {
  userPrompt: string;
  functionName: string;
  projectId: string;
}): Promise<CodeGenerationOutput> {
  // Add dependency info to system prompt
  const systemPrompt = getParameterizedPrompt('CODE_GENERATOR', {
    FUNCTION_NAME: input.functionName
  });
  
  // Inject dependency contract
  const enhancedSystemPrompt = `${systemPrompt.content}

${generateDependencyPrompt()}`;

  // ... generate code ...
  
  // Validate before returning
  const validation = validateGeneratedCode(code, input.functionName);
  
  if (!validation.valid) {
    console.warn('Code validation failed:', validation.errors);
    // Could retry here with errors in context
  }
  
  return {
    code,
    metadata: {
      validated: validation.valid,
      dependencies: validation.usedDependencies,
      // ... other metadata
    }
  };
}
```

## Part 2: Lazy Loading Implementation

### 2.1 Enhanced GlobalDependencyProvider
**File**: `src/components/GlobalDependencyProvider.tsx`

```typescript
"use client";

import React, { useEffect, useState, createContext, useContext } from 'react';
import ReactDOM from 'react-dom';
import * as Remotion from 'remotion';
import { WINDOW_DEPENDENCIES_CONTRACT } from '~/lib/codegen/dependencies-contract';

interface DependencyState {
  loaded: Set<string>;
  loading: Set<string>;
  failed: Set<string>;
}

const DependencyContext = createContext<{
  state: DependencyState;
  loadDependency: (name: string) => Promise<void>;
}>({
  state: { loaded: new Set(), loading: new Set(), failed: new Set() },
  loadDependency: async () => {}
});

export function GlobalDependencyProvider({ 
  children,
  lazyLoad = false 
}: { 
  children: React.ReactNode;
  lazyLoad?: boolean;
}) {
  const [state, setState] = useState<DependencyState>({
    loaded: new Set(),
    loading: new Set(),
    failed: new Set()
  });

  // Load core dependencies
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Always load core
      (window as any).React = React;
      (window as any).ReactDOM = ReactDOM;
      (window as any).Remotion = Remotion;
      
      setState(prev => ({
        ...prev,
        loaded: new Set([...prev.loaded, 'React', 'ReactDOM', 'Remotion'])
      }));
      
      console.log('Core dependencies loaded:', ['React', 'ReactDOM', 'Remotion']);
      
      // Load optional deps if not lazy loading
      if (!lazyLoad) {
        loadOptionalDependencies();
      }
    }
  }, [lazyLoad]);

  const loadOptionalDependencies = async () => {
    const optional = WINDOW_DEPENDENCIES_CONTRACT.optional;
    
    for (const [name, config] of Object.entries(optional)) {
      if (config.enabled && !state.loaded.has(name)) {
        await loadDependency(name);
      }
    }
  };

  const loadDependency = async (name: string) => {
    const config = WINDOW_DEPENDENCIES_CONTRACT.optional[name];
    if (!config || !config.enabled) return;
    
    // Already loaded or loading
    if (state.loaded.has(name) || state.loading.has(name)) return;
    
    setState(prev => ({
      ...prev,
      loading: new Set([...prev.loading, name])
    }));
    
    try {
      console.log(`Loading dependency: ${name}...`);
      
      switch (name) {
        case 'HeroiconsSolid':
          const HeroiconsSolid = await import('@heroicons/react/24/solid');
          (window as any).HeroiconsSolid = HeroiconsSolid;
          break;
          
        case 'HeroiconsOutline':
          const HeroiconsOutline = await import('@heroicons/react/24/outline');
          (window as any).HeroiconsOutline = HeroiconsOutline;
          break;
          
        case 'RemotionShapes':
          const RemotionShapes = await import('@remotion/shapes');
          (window as any).RemotionShapes = RemotionShapes;
          break;
      }
      
      setState(prev => ({
        loaded: new Set([...prev.loaded, name]),
        loading: new Set([...prev.loading].filter(d => d !== name)),
        failed: prev.failed
      }));
      
      console.log(`✅ Loaded: ${name}`);
      
    } catch (error) {
      console.error(`Failed to load ${name}:`, error);
      
      setState(prev => ({
        loaded: prev.loaded,
        loading: new Set([...prev.loading].filter(d => d !== name)),
        failed: new Set([...prev.failed, name])
      }));
    }
  };

  return (
    <DependencyContext.Provider value={{ state, loadDependency }}>
      {children}
    </DependencyContext.Provider>
  );
}

// Hook to use in components
export function useDependencies() {
  return useContext(DependencyContext);
}
```

### 2.2 Auto-Load on First Use
**File**: `src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx`

```typescript
import { useDependencies } from '~/components/GlobalDependencyProvider';
import { validateGeneratedCode } from '~/lib/codegen/code-validator';

export default function PreviewPanelG() {
  const { loadDependency } = useDependencies();
  
  // When compiling a scene, check what deps it needs
  const compileScene = async (code: string) => {
    // Validate and extract dependencies
    const validation = validateGeneratedCode(code, 'Scene');
    
    // Load any missing optional dependencies
    for (const dep of validation.usedDependencies) {
      if (WINDOW_DEPENDENCIES_CONTRACT.optional[dep]) {
        await loadDependency(dep);
      }
    }
    
    // Now compile the scene
    const { code: transformed } = transform(code, {
      transforms: ['typescript', 'jsx'],
      jsxRuntime: 'classic',
    });
    
    // ... rest of compilation
  };
}
```

### 2.3 Update Type Definitions
**File**: `src/lib/types/shared/global.d.ts`

```typescript
import type React from 'react';
import type * as Remotion from 'remotion';
import type * as HeroiconsSolid from '@heroicons/react/24/solid';
import type * as HeroiconsOutline from '@heroicons/react/24/outline';
import type * as RemotionShapes from '@remotion/shapes';

declare global {
  interface Window {
    // Core (always present)
    React: typeof React;
    ReactDOM: typeof ReactDOM;
    Remotion: typeof Remotion;
    
    // Optional (may be loaded lazily)
    HeroiconsSolid?: typeof HeroiconsSolid;
    HeroiconsOutline?: typeof HeroiconsOutline;
    RemotionShapes?: typeof RemotionShapes;
    
    // Legacy
    __REMOTION_COMPONENT?: React.ComponentType<any>;
  }
}
```

## Part 3: Migration Strategy

### Phase 1: Foundation (This Sprint)
1. ✅ Implement dependency contract
2. ✅ Add validation (warnings only)
3. ✅ Update prompts to use contract

### Phase 2: Lazy Loading (Next Sprint)
1. ✅ Implement lazy GlobalDependencyProvider
2. ✅ Auto-load deps on first use
3. ✅ Monitor performance impact

### Phase 3: Gradual Enablement
1. Enable HeroiconsSolid (test with small group)
2. Monitor validation failures
3. Enable more libraries based on usage

## Benefits of This Approach

1. **Safety**: Contract ensures AI and runtime stay in sync
2. **Performance**: Load optional deps only when needed
3. **Gradual**: Can enable/disable deps without breaking existing scenes
4. **Measurable**: Track which deps are actually used
5. **Future-proof**: Easy path to ESM when ready

## Example Usage

When a user prompts "Add a star rating component":

1. AI checks contract, sees HeroiconsSolid is available
2. Generates code using `window.HeroiconsSolid.StarIcon`
3. Validator confirms it's valid
4. Preview panel detects HeroiconsSolid usage
5. Lazy loads the library (first time only)
6. Scene renders with proper icons

This gives us the best of both worlds: reliable AI generation with on-demand loading.