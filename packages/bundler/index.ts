//packages/bundler/index.ts
import * as esbuild from 'esbuild';
import crypto from 'crypto';
import logger from '~/lib/logger';

export interface BundleOptions {
  fullStoryboard?: boolean;
  minify?: boolean;
  target?: string;
}

export interface BundleResult {
  bytes: Buffer;
  hash: string;
  size: number;
}

/**
 * Bundle a scene component for production deployment
 * Extracts and adapts the esbuild logic from buildCustomComponent.ts
 */
export async function bundleScene(
  sceneCode: string, 
  sceneId: string,
  opts: BundleOptions = {}
): Promise<BundleResult> {
  const { fullStoryboard = false, minify = true, target = 'es2022' } = opts;
  
  logger.info(`[Bundler] Starting bundle for scene ${sceneId}`, { 
    fullStoryboard, 
    codeLength: sceneCode.length 
  });

  try {
    // Apply syntax fixes before compilation (adapted from buildCustomComponent.ts)
    const fixedCode = fixSyntaxIssues(sceneCode);
    
    // ESBuild configuration optimized for production
    const buildOptions: esbuild.BuildOptions = {
      stdin: {
        contents: fixedCode,
        resolveDir: process.cwd(),
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target,
      minify,
      loader: { 
        '.tsx': 'tsx',
        '.png': 'dataurl',
        '.jpg': 'dataurl', 
        '.jpeg': 'dataurl',
        '.svg': 'dataurl',
        '.css': 'text',
      },
      jsx: 'preserve', // Preserve JSX, expect host environment to handle it or a subsequent build step
      external: ['react', 'react-dom', 'remotion', '@remotion/*'],
      logLevel: 'warning',
      write: false, // Return result in memory
      assetNames: '[name]-[hash]',
    };

    // If fullStoryboard mode, we would stitch scenes together here
    // For now, focus on single scene bundling
    if (fullStoryboard) {
      logger.warn(`[Bundler] Full storyboard mode not yet implemented for scene ${sceneId}`);
    }

    const result = await esbuild.build(buildOptions);
    
    if (result.errors.length > 0) {
      const errorMsg = `ESBuild errors: ${JSON.stringify(result.errors)}`;
      logger.error(`[Bundler] Build failed for scene ${sceneId}`, { errors: result.errors });
      throw new Error(errorMsg);
    }

    if (result.warnings.length > 0) {
      logger.warn(`[Bundler] Build warnings for scene ${sceneId}`, { warnings: result.warnings });
    }

    if (!result.outputFiles || result.outputFiles.length === 0) {
      throw new Error('ESBuild produced no output files');
    }

    const outputFile = result.outputFiles[0];
    if (!outputFile) {
      throw new Error('ESBuild output file is undefined');
    }

    const bytes = Buffer.from(outputFile.contents);
    const hash = crypto.createHash('sha256').update(bytes).digest('hex');
    const size = bytes.length;

    logger.info(`[Bundler] Bundle complete for scene ${sceneId}`, { 
      size, 
      hash: hash.substring(0, 8),
      warnings: result.warnings.length 
    });

    // Warn if bundle is large (as per spec)
    if (size > 500 * 1024) { // 500 kB
      logger.warn(`[Bundler] Large bundle size for scene ${sceneId}: ${size} bytes`);
    }

    return { bytes, hash, size };

  } catch (error) {
    logger.error(`[Bundler] Failed to bundle scene ${sceneId}`, { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw error;
  }
}

/**
 * Fix common syntax issues in component code
 * Adapted from buildCustomComponent.ts
 */
function fixSyntaxIssues(code: string): string {
  let fixedCode = code;
  
  // Remove duplicate default exports
  fixedCode = removeDuplicateDefaultExports(fixedCode);
  
  // Fix misplaced semicolons after JSX closing tags
  const faultySemicolonPattern = /<\/\w+>\s*;/g;
  if (faultySemicolonPattern.test(fixedCode)) {
    logger.debug('[Bundler] Fixing misplaced semicolons after JSX closing tags');
    fixedCode = fixedCode.replace(faultySemicolonPattern, (match) => 
      match.replace(';', '')
    );
  }
  
  return fixedCode;
}

/**
 * Remove duplicate default exports from component code
 * Adapted from buildCustomComponent.ts
 */
function removeDuplicateDefaultExports(code: string): string {
  const lines = code.split('\n');
  const defaultExportLines: number[] = [];
  
  // Find all lines with default exports
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('export default') && !trimmed.includes('//')) {
      defaultExportLines.push(index);
    }
  });
  
  // If multiple default exports found, keep only the last one
  if (defaultExportLines.length > 1) {
    logger.debug(`[Bundler] Removing ${defaultExportLines.length - 1} duplicate default exports`);
    
    // Remove all but the last default export
    for (let i = 0; i < defaultExportLines.length - 1; i++) {
      const lineIndex = defaultExportLines[i];
      if (lineIndex !== undefined) {
        lines[lineIndex] = `// ${lines[lineIndex]} // Removed duplicate default export`;
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * Bundle multiple scenes into a single storyboard (future implementation)
 */
export async function bundleStoryboard(
  scenes: Array<{ id: string; code: string; order: number }>,
  opts: BundleOptions = {}
): Promise<BundleResult> {
  // Future implementation for BAZAAR-305
  // Would create an index.tsx that imports and sequences all scenes
  throw new Error('Storyboard bundling not yet implemented - use bundleScene for individual scenes');
}
