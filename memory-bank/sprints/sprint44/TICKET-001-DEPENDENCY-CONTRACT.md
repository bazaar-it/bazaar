# TICKET-001: Implement Dependency Contract System

## Priority: HIGH
## Status: TODO
## Estimated: 2 hours

## Objective
Create a single source of truth for all dependencies available to AI-generated code, preventing hallucination and ensuring consistency.

## Background
Currently, the AI is instructed via prose prompts about which dependencies to use. This leads to:
- Potential drift between what's available and what AI thinks is available
- No machine-readable contract for validation
- Manual updates needed in multiple places when adding libraries

## Implementation Details

### 1. Create Contract File
**Location**: `src/lib/codegen/dependencies-contract.ts`

```typescript
export const DEPENDENCIES_CONTRACT = {
  // Version for tracking changes
  version: "1.0.0",
  
  // Available window dependencies
  windowDeps: {
    React: {
      enabled: true,
      description: "Core React library",
      exports: ["useState", "useEffect", "useRef", "useMemo", "useCallback"]
    },
    ReactDOM: {
      enabled: true,
      description: "React DOM library",
      exports: ["render", "createRoot"]
    },
    Remotion: {
      enabled: true,
      description: "Remotion video framework",
      exports: ["AbsoluteFill", "useCurrentFrame", "useVideoConfig", "interpolate", "spring", "Sequence", "Audio", "Video", "Img"]
    },
    // Ready to enable per Sprint 44 docs
    HeroiconsSolid: {
      enabled: false, // TODO: Enable after GlobalDependencyProvider update
      description: "Solid variant Heroicons",
      exports: ["StarIcon", "HeartIcon", "CheckIcon", "XMarkIcon", "PlayIcon", "PauseIcon", "etc..."]
    },
    HeroiconsOutline: {
      enabled: false, // TODO: Enable after GlobalDependencyProvider update
      description: "Outline variant Heroicons",
      exports: ["StarIcon", "HeartIcon", "CheckIcon", "XMarkIcon", "PlayIcon", "PauseIcon", "etc..."]
    }
  },
  
  // Code generation rules
  rules: {
    noImports: true,
    functionSignature: "export default function {{SCENE_NAME}}()",
    cssQuoting: "all", // "all" | "none" | "numeric"
    allowedFonts: ["Inter", "Arial", "sans-serif"],
    defaultDuration: 150, // frames at 30fps
    interpolationDefaults: {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    }
  },
  
  // Technical constraints
  constraints: {
    singleTransformPerElement: true,
    maxFileSize: 100000, // characters
    forbiddenPatterns: [
      "eval(",
      "Function(",
      "innerHTML",
      "document.",
      "window.location"
    ]
  }
};

// Type-safe getter for enabled deps only
export function getEnabledDependencies() {
  return Object.entries(DEPENDENCIES_CONTRACT.windowDeps)
    .filter(([_, config]) => config.enabled)
    .reduce((acc, [name, config]) => ({
      ...acc,
      [name]: config
    }), {});
}

// Generate destructuring statement for prompts
export function generateDestructuringExample(depName: string): string {
  const dep = DEPENDENCIES_CONTRACT.windowDeps[depName];
  if (!dep || !dep.enabled) return '';
  
  const exports = dep.exports.slice(0, 5).join(', ');
  return `const { ${exports} } = window.${depName};`;
}
```

### 2. Update Type Definitions
**Location**: Update `src/lib/types/shared/global.d.ts`

Add types for any new dependencies we're enabling.

### 3. Integration Points

1. **Code Generator** (`src/tools/add/add_helpers/CodeGeneratorNEW.ts`)
   - Import and use contract
   - Inject contract into prompts
   - Pass to validator

2. **Edit Tools** (`src/tools/edit/edit.ts`)
   - Same integration pattern

3. **Prompt Config** (`src/config/prompts/active/code-generator.ts`)
   - Reference contract for available deps

## Testing
1. Unit test for contract structure
2. Integration test with code generator
3. Verify contract prevents hallucination

## Success Criteria
- [ ] Contract file created and exported
- [ ] Type definitions match contract
- [ ] Code generator uses contract
- [ ] No hardcoded dependency lists in prompts

## Dependencies
- None - this is the foundation

## Notes
- Keep contract minimal initially
- Version field allows tracking changes
- Enabled flag allows gradual rollout