/**
 * Unified Scene Compilation Service
 * Sprint 106: Permissive Server-Side Compilation
 * 
 * Core Principle: NEVER trigger regeneration (35s is sacred)
 * - Compile server-side for performance
 * - Validate permissively to avoid regeneration  
 * - Auto-fix conflicts when possible
 * - Always return something that works
 */

import { transform } from 'sucrase';
import type { Scene } from '~/server/db/schema';

export interface CompilationResult {
  success: boolean;
  tsxCode: string;  // Potentially modified (auto-fixed)
  jsCode: string;   // Always has a value (compiled or fallback)
  compilationError?: string;
  conflicts?: ConflictResolution[];
  requiresClientFallback: boolean;
  compiledAt: Date;
  // Phase 2 metadata and aliases for downstream usage
  metadata?: {
    compilation_version: number;
    compile_meta: {
      timings: { ms: number };
      tool: string;
      timestamp: string;
      [key: string]: any;
    };
  };
  error?: string; // alias of compilationError
  autoFixed?: boolean; // true when code was modified to resolve conflicts
}

export interface ConflictResolution {
  identifier: string;
  originalName: string;
  newName: string;
  conflictingSceneId: string;
}

export interface CompilationContext {
  projectId: string;
  sceneId: string;
  existingScenes?: Pick<Scene, 'id' | 'tsxCode' | 'name'>[];
  strictMode?: boolean;  // Only true for export
  isBackfill?: boolean;  // Phase 2: indicate backfill run
}

/**
 * Main compilation service - single source of truth
 */
export class SceneCompilerService {
  private static instance: SceneCompilerService;

  static getInstance(): SceneCompilerService {
    if (!this.instance) {
      this.instance = new SceneCompilerService();
    }
    return this.instance;
  }

  /**
   * Compile scene with permissive validation and auto-fixing
   * NEVER throws - always returns something usable
   */
  async compileScene(
    tsxCode: string,
    context: CompilationContext
  ): Promise<CompilationResult> {
    const startTime = Date.now();
    
    // Step 1: Check for multi-scene conflicts and auto-fix
    let modifiedTsx = tsxCode;
    let conflicts: ConflictResolution[] = [];
    
    if (context.existingScenes && context.existingScenes.length > 0) {
      const conflictResult = this.detectAndFixConflicts(
        tsxCode,
        context.sceneId,
        context.existingScenes
      );
      modifiedTsx = conflictResult.fixedCode;
      conflicts = conflictResult.resolutions;
      
      if (conflicts.length > 0) {
        console.log(`[SceneCompiler] Auto-fixed ${conflicts.length} conflicts for scene ${context.sceneId}`);
      }
    }

    // Step 2: Try to compile (permissively)
    let jsCode: string | null = null;
    let compilationError: string | undefined;
    
    try {
      jsCode = await this.performCompilation(modifiedTsx);
    } catch (error) {
      compilationError = error instanceof Error ? error.message : String(error);
      console.warn(`[SceneCompiler] Compilation failed for scene ${context.sceneId}, will use fallback:`, compilationError);
    }

    // Step 3: If compilation failed, create safe fallback
    if (!jsCode) {
      jsCode = this.createSafeFallback(context.sceneId, compilationError);
    }

    // Step 4: Always return a valid result
    const duration = Date.now() - startTime;
    const meta = {
      compilation_version: 1,
      compile_meta: {
        timings: { ms: duration },
        tool: 'scene-compiler-v1',
        timestamp: new Date().toISOString(),
        ...(context.isBackfill ? { backfilled: true } : {}),
      },
    } as const;

    const result: CompilationResult = {
      success: !compilationError,
      tsxCode: modifiedTsx,  // Return potentially auto-fixed code
      jsCode,                // Always has a value
      compilationError,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      requiresClientFallback: false,  // We always provide JS now
      compiledAt: new Date(),
      metadata: meta,
      error: compilationError,
      autoFixed: conflicts.length > 0,
    };
    console.log(`[SceneCompiler] Scene ${context.sceneId} processed in ${duration}ms - Success: ${result.success}`);

    return result;
  }

  /**
   * Detect and automatically fix identifier conflicts
   */
  private detectAndFixConflicts(
    newCode: string,
    sceneId: string,
    existingScenes: Pick<Scene, 'id' | 'tsxCode' | 'name'>[]
  ): { fixedCode: string; resolutions: ConflictResolution[] } {
    const resolutions: ConflictResolution[] = [];
    let fixedCode = newCode;

    // Extract top-level identifiers from new code
    const newIdentifiers = this.extractTopLevelIdentifiers(newCode);
    
    // Check each existing scene for conflicts
    for (const existingScene of existingScenes) {
      if (existingScene.id === sceneId) continue;  // Skip self
      
      const existingIdentifiers = this.extractTopLevelIdentifiers(existingScene.tsxCode);
      
      // Find conflicts
      for (const identifier of newIdentifiers) {
        if (existingIdentifiers.has(identifier) && !this.isBuiltinIdentifier(identifier)) {
          // Create unique suffix
          const suffix = `_${sceneId.substring(0, 8).replace(/-/g, '')}`;
          const newName = `${identifier}${suffix}`;
          
          // Perform intelligent rename (preserves all references)
          fixedCode = this.intelligentRename(fixedCode, identifier, newName);
          
          resolutions.push({
            identifier,
            originalName: identifier,
            newName,
            conflictingSceneId: existingScene.id
          });
        }
      }
    }

    return { fixedCode, resolutions };
  }

  /**
   * Extract top-level identifiers (const, let, var, function, class)
   */
  private extractTopLevelIdentifiers(code: string): Set<string> {
    const identifiers = new Set<string>();
    
    // Match top-level const/let/var declarations
    const constLetVar = /^(?:export\s+)?(?:const|let|var)\s+([A-Z][A-Za-z0-9_]*)\s*=/gm;
    let match;
    while ((match = constLetVar.exec(code)) !== null) {
      if (match[1]) identifiers.add(match[1]);
    }
    
    // Match function declarations
    const functions = /^(?:export\s+)?(?:default\s+)?function\s+([A-Z][A-Za-z0-9_]*)\s*\(/gm;
    while ((match = functions.exec(code)) !== null) {
      if (match[1]) identifiers.add(match[1]);
    }
    
    // Match class declarations
    const classes = /^(?:export\s+)?(?:default\s+)?class\s+([A-Z][A-Za-z0-9_]*)/gm;
    while ((match = classes.exec(code)) !== null) {
      if (match[1]) identifiers.add(match[1]);
    }

    return identifiers;
  }

  /**
   * Check if identifier is a built-in that shouldn't be renamed
   */
  private isBuiltinIdentifier(name: string): boolean {
    const builtins = new Set([
      'React', 'Component', 'Fragment',
      'useEffect', 'useState', 'useMemo', 'useCallback', 'useRef',
      'useCurrentFrame', 'interpolate', 'spring', 'useVideoConfig',
      'Sequence', 'AbsoluteFill', 'Img', 'Audio', 'Video',
      'Math', 'Date', 'Array', 'Object', 'String', 'Number'
    ]);
    return builtins.has(name);
  }

  /**
   * Intelligently rename an identifier throughout the code
   */
  private intelligentRename(code: string, oldName: string, newName: string): string {
    // This regex matches the identifier when it's not part of a larger word
    // and preserves JSX usage, property access, etc.
    const regex = new RegExp(`\\b${oldName}\\b`, 'g');
    return code.replace(regex, newName);
  }

  /**
   * Perform the actual TSX to JS compilation
   */
  private async performCompilation(tsxCode: string): Promise<string> {
    // Normalize code before transforming (strip unsupported imports, normalize icons)
    const normalizedTsx = this.normalizeForFunctionScope(tsxCode);

    // Transform using Sucrase
    const { code: transformedCode } = transform(normalizedTsx, {
      transforms: ['typescript', 'jsx'],
      production: true,
      jsxRuntime: 'classic',  // Use React.createElement
    });

    // Remove export statements for Function constructor compatibility
    let jsCode = transformedCode
      .replace(/export\s+default\s+function\s+(\w+)/g, 'function $1')
      .replace(/export\s+default\s+/g, '')
      .replace(/export\s+function\s+(\w+)\s*\(/g, 'function $1(')
      .replace(/export\s+const\s+(\w+)\s*=\s*/g, 'const $1 = ')
      .replace(/export\s+\{[^}]*\};?\s*/g, '');

    // Ensure the component is returned for Function constructor
    if (!jsCode.includes('return Component') && !jsCode.includes('return function')) {
      // Try to find the main component and ensure it's returned
      const componentMatch = jsCode.match(/(?:const|let|var|function)\s+([A-Z][A-Za-z0-9_]*)\s*[=(:]/);
      if (componentMatch) {
        jsCode += `\n// Auto-added return\nreturn ${componentMatch[1]};`;
      }
    }

    return jsCode;
  }

  /**
   * Normalize scene TSX for execution via Function constructor in the browser.
   * - Remove imports for libs we expose via window (react, remotion, icon libs)
   * - Canonicalize Iconify usage to window.IconifyIcon to avoid undefined identifiers
   */
  private normalizeForFunctionScope(code: string): string {
    let out = code;

    // Remove common imports that are provided via globals at runtime
    // react, react-dom, remotion, icon libraries, shapes, heroicons, lucide, css
    out = out
      .replace(/^[\t ]*import\s+[^;]*from\s+['"]react['"];?\s*$/gmi, '')
      .replace(/^[\t ]*import\s+[^;]*from\s+['"]react-dom['"];?\s*$/gmi, '')
      .replace(/^[\t ]*import\s+[^;]*from\s+['"]remotion['"];?\s*$/gmi, '')
      .replace(/^[\t ]*import\s+[^;]*from\s+['"]@iconify\/react['"];?\s*$/gmi, '')
      .replace(/^[\t ]*import\s+[^;]*from\s+['"]iconify-icon['"];?\s*$/gmi, '')
      .replace(/^[\t ]*import\s+[^;]*from\s+['"]@remotion\/shapes['"];?\s*$/gmi, '')
      .replace(/^[\t ]*import\s+[^;]*from\s+['"]@heroicons\/react\/[^"]+['"];?\s*$/gmi, '')
      .replace(/^[\t ]*import\s+[^;]*from\s+['"]lucide-react['"];?\s*$/gmi, '')
      .replace(/^[\t ]*import\s+['"][^'"]+\.css['"];?\s*$/gmi, '');

    // Replace JSX usage of bare IconifyIcon or Icon (from @iconify/react) with window.IconifyIcon
    out = out
      .replace(/<\s*IconifyIcon(\s|>)/g, '<window.IconifyIcon$1')
      .replace(/<\s*Icon(\s|>)/g, '<window.IconifyIcon$1');

    // Replace React.createElement(IconifyIcon, ...) or (Icon, ...) with window.IconifyIcon
    out = out
      .replace(/React\.createElement\(\s*IconifyIcon\s*,/g, 'React.createElement(window.IconifyIcon,')
      .replace(/React\.createElement\(\s*Icon\s*,/g, 'React.createElement(window.IconifyIcon,');
    // Consolidate multiple top-level Remotion destructures into one at the top
    try {
      const remotionRegex = /(^|\n)\s*const\s*\{([^}]*)\}\s*=\s*window\.Remotion\s*;?/g;
      const names = new Set<string>();
      let match: RegExpExecArray | null;
      while ((match = remotionRegex.exec(out)) !== null) {
        const inner = match[2] || '';
        inner.split(',').forEach((raw) => {
          const name = raw.trim().split(/\s+/)[0];
          if (name) names.add(name);
        });
      }
      if (names.size > 0) {
        // Remove all existing destructures
        out = out.replace(remotionRegex, '\n');
        const ordered = Array.from(names);
        const single = `const { ${ordered.join(', ')} } = window.Remotion;\n`;
        out = single + out.trimStart();
      }
    } catch {}

    return out;
  }

  /**
   * Create a safe fallback scene that won't crash
   * This ensures SOMETHING always renders
   */
  private createSafeFallback(sceneId: string, error?: string): string {
    const errorMessage = error ? error.replace(/'/g, "\\'").substring(0, 200) : 'Compilation in progress';
    
    return `
// Fallback scene due to compilation error
return function FallbackScene() {
  const frame = typeof useCurrentFrame === 'function' ? useCurrentFrame() : 0;
  
  const style = {
    padding: '40px',
    margin: '20px',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    border: '2px dashed rgba(255, 107, 107, 0.5)',
    borderRadius: '12px',
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%'
  };
  
  const titleStyle = {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#ff6b6b'
  };
  
  const messageStyle = {
    fontSize: '14px',
    opacity: 0.8,
    textAlign: 'center',
    maxWidth: '80%'
  };
  
  const idStyle = {
    fontSize: '12px',
    opacity: 0.5,
    marginTop: '16px',
    fontFamily: 'monospace'
  };
  
  return React.createElement('div', { style }, [
    React.createElement('div', { key: 'icon', style: { fontSize: '48px' } }, '⚠️'),
    React.createElement('div', { key: 'title', style: titleStyle }, 'Scene Temporarily Unavailable'),
    React.createElement('div', { key: 'message', style: messageStyle }, 
      'This scene is being processed. It will appear shortly.'
    ),
    React.createElement('div', { key: 'error', style: { ...messageStyle, marginTop: '8px', fontSize: '12px', opacity: 0.6 } }, 
      '${errorMessage}'
    ),
    React.createElement('div', { key: 'id', style: idStyle }, 'Scene: ${sceneId.substring(0, 8)}')
  ]);
};`;
  }

  /**
   * Batch compile multiple scenes
   */
  async compileBatch(
    scenes: Array<{ id: string; tsxCode: string }>,
    projectId: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, CompilationResult>> {
    const results = new Map<string, CompilationResult>();
    const total = scenes.length;

    // First pass: compile all scenes individually
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      if (!scene) continue; // Skip if scene is undefined
      
      // Compile with context of previously compiled scenes
      const existingScenes = scenes.slice(0, i).map((s, idx) => ({
        id: s.id,
        tsxCode: s.tsxCode,
        name: `Scene ${idx + 1}`
      }));
      
      const result = await this.compileScene(scene.tsxCode, {
        projectId,
        sceneId: scene.id,
        existingScenes
      });
      
      results.set(scene.id, result);
      
      if (onProgress) {
        onProgress(i + 1, total);
      }
      
      // Yield to event loop periodically
      if (i % 5 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    return results;
  }
}

// Export singleton instance
export const sceneCompiler = SceneCompilerService.getInstance();
