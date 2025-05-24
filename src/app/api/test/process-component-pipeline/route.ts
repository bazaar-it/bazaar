//src/app/api/test/process-component-pipeline/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import * as esbuild from 'esbuild';
import { sanitizeTsx } from '~/server/workers/buildCustomComponent';

export async function POST(request: NextRequest) {
  try {
    const { tsxCode } = await request.json();
    
    if (!tsxCode) {
      return NextResponse.json(
        { error: 'No TSX code provided' },
        { status: 400 }
      );
    }
    
    // Step 1: Sanitize TSX code
    const sanitizedCode = sanitizeTsx(tsxCode);
    
    // Step 2: Compile with esbuild
    const result = await esbuild.build({
      stdin: {
        contents: sanitizedCode,
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2020',
      minify: false,
      write: false,
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      external: ['react', 'react-dom', 'remotion', '@remotion/*'],
      logLevel: 'warning',
    });
    
    const compiledCode = result.outputFiles?.[0]?.text || '';
    
    return NextResponse.json({
      success: true,
      sanitizedCode,
      compiledCode,
      warnings: result.warnings,
      errors: result.errors,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Processing failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
