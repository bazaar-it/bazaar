//src/app/api/test/compile-component/route.ts
import { NextRequest, NextResponse } from 'next/server';
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
    
    // Sanitize TSX code (reusing existing function)
    const sanitizedCode = sanitizeTsx(tsxCode);
    
    // Compile with esbuild
    const result = await esbuild.build({
      stdin: {
        contents: sanitizedCode,
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm', // ES Module format for React.lazy
      platform: 'browser',
      target: 'es2020',
      minify: false, // Skip minification for better debugging
      write: false, // Return result instead of writing to file
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      external: ['react', 'react-dom', 'remotion', '@remotion/*'],
      logLevel: 'warning',
    });
    
    if (result.errors.length > 0) {
      return NextResponse.json(
        { error: `Compilation errors: ${JSON.stringify(result.errors)}` },
        { status: 400 }
      );
    }
    
    const compiledCode = result.outputFiles?.[0]?.text || '';
    
    return NextResponse.json({
      success: true,
      compiledCode,
      originalCode: sanitizedCode,
      warnings: result.warnings
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Compilation failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
