/**
 * Hook to get scene code - either pre-compiled JS or fallback to client compilation
 * Sprint 106: Hybrid TSX/JS Storage
 */

import { useEffect, useState } from 'react';
import { transform } from 'sucrase';

export interface SceneWithCode {
  id: string;
  name: string;
  tsxCode: string;
  jsCode?: string | null;
  jsCompiledAt?: Date | string | null;
  compilationError?: string | null;
}

export interface UseSceneCodeResult {
  code: string | null;
  isCompiled: boolean;
  compilationType: 'pre-compiled' | 'client-compiled' | 'error';
  error?: string;
  isLoading: boolean;
}

/**
 * Hook to get executable JavaScript code for a scene
 * Uses pre-compiled JS if available, otherwise compiles on client
 */
export function useSceneCode(scene: SceneWithCode | null | undefined): UseSceneCodeResult {
  const [result, setResult] = useState<UseSceneCodeResult>({
    code: null,
    isCompiled: false,
    compilationType: 'error',
    isLoading: true
  });

  useEffect(() => {
    if (!scene) {
      setResult({
        code: null,
        isCompiled: false,
        compilationType: 'error',
        error: 'No scene provided',
        isLoading: false
      });
      return;
    }

    // Check if we have pre-compiled JS
    if (scene.jsCode) {
      console.log(`[useSceneCode] Using pre-compiled JS for scene: ${scene.name}`);
      setResult({
        code: scene.jsCode,
        isCompiled: true,
        compilationType: 'pre-compiled',
        isLoading: false
      });
      return;
    }

    // Check if there was a compilation error
    if (scene.compilationError) {
      console.warn(`[useSceneCode] Scene has compilation error: ${scene.compilationError}`);
    }

    // Fallback: Compile on client
    console.log(`[useSceneCode] No pre-compiled JS, compiling on client for scene: ${scene.name}`);
    
    try {
      const { code: compiledCode } = transform(scene.tsxCode, {
        transforms: ['typescript', 'jsx'],
        production: true,
        jsxRuntime: 'classic'
      });

      setResult({
        code: compiledCode,
        isCompiled: true,
        compilationType: 'client-compiled',
        isLoading: false
      });
    } catch (error) {
      console.error(`[useSceneCode] Client compilation failed for scene ${scene.name}:`, error);
      setResult({
        code: null,
        isCompiled: false,
        compilationType: 'error',
        error: error instanceof Error ? error.message : 'Compilation failed',
        isLoading: false
      });
    }
  }, [scene?.id, scene?.jsCode, scene?.tsxCode]); // Re-run if scene or its code changes

  return result;
}

/**
 * Feature flag to control usage of pre-compiled JS
 */
export function usePreCompiledJS(): boolean {
  // Start with checking environment variable
  const envFlag = process.env.NEXT_PUBLIC_USE_PRECOMPILED_JS;
  
  // Default to true in development for testing
  if (process.env.NODE_ENV === 'development') {
    return envFlag !== 'false'; // Opt-out in dev
  }
  
  // Default to false in production until fully tested
  return envFlag === 'true'; // Opt-in in prod
}