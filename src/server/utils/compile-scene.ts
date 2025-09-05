/**
 * Server-side scene compilation utility
 * Sprint 106: Hybrid TSX/JS Storage
 * 
 * Compiles TSX code to JavaScript for browser execution
 * Used when creating/editing scenes to pre-compile and store JS
 */

import { transform } from 'sucrase';

export interface CompilationResult {
  success: boolean;
  jsCode?: string;
  error?: string;
  compiledAt?: Date;
}

/**
 * Compiles TSX scene code to JavaScript
 * @param tsxCode - The TypeScript/JSX code to compile
 * @returns Compilation result with JS code or error
 */
export function compileSceneToJS(tsxCode: string): CompilationResult {
  // Handle empty or invalid input
  if (!tsxCode || tsxCode.trim().length === 0) {
    return {
      success: false,
      error: 'No code provided to compile'
    };
  }

  try {
    // Transform TSX to JS using Sucrase
    const { code: transformedCode } = transform(tsxCode, {
      transforms: ['typescript', 'jsx'],
      production: true,
      jsxRuntime: 'classic', // Use React.createElement
    });

    // Remove export statements for Function constructor compatibility
    // This allows the compiled JS to be executed directly in the browser
    const jsCode = transformedCode
      .replace(/export\s+default\s+function\s+(\w+)/g, 'function $1')
      .replace(/export\s+default\s+(\w+);?\s*/g, '')
      .replace(/export\s+const\s+(\w+)\s*=\s*([^;]+);?/g, 'const $1 = $2;');

    // Validate the output has something
    if (!jsCode || jsCode.trim().length === 0) {
      return {
        success: false,
        error: 'Compilation produced empty output'
      };
    }

    // Check for common issues that might cause runtime problems
    if (!jsCode.includes('function')) {
      console.warn('[compileSceneToJS] Warning: Compiled code may not have a valid component');
    }

    return {
      success: true,
      jsCode,
      compiledAt: new Date()
    };

  } catch (error) {
    // Handle compilation errors gracefully
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error('[compileSceneToJS] Compilation failed:', {
      error: errorMessage,
      codePreview: tsxCode.substring(0, 200) + '...'
    });

    return {
      success: false,
      error: `Compilation failed: ${errorMessage}`
    };
  }
}

/**
 * Batch compile multiple scenes
 * Useful for backfilling existing scenes
 */
export async function compileScenesInBatch(
  scenes: Array<{ id: string; tsxCode: string }>,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, CompilationResult>> {
  const results = new Map<string, CompilationResult>();
  const total = scenes.length;
  
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const result = compileSceneToJS(scene.tsxCode);
    results.set(scene.id, result);
    
    if (onProgress) {
      onProgress(i + 1, total);
    }
    
    // Small delay to avoid blocking the event loop
    if (i % 10 === 0) {
      await new Promise(resolve => setImmediate(resolve));
    }
  }
  
  return results;
}

/**
 * Check if a scene needs compilation
 * @param scene - Scene object with tsxCode and jsCode
 * @returns true if scene needs compilation
 */
export function needsCompilation(scene: {
  tsxCode: string;
  jsCode?: string | null;
  jsCompiledAt?: Date | null;
  updatedAt?: Date;
}): boolean {
  // No JS code at all
  if (!scene.jsCode) {
    return true;
  }
  
  // JS code is older than TSX code
  if (scene.jsCompiledAt && scene.updatedAt) {
    return scene.updatedAt > scene.jsCompiledAt;
  }
  
  // Default to not needing compilation if we have JS
  return false;
}