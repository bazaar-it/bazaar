/*
 * Template Compilation Verifier (Phase 1)
 * - Compiles each TSX template via server SceneCompilerService
 * - Validates compiled JS shape (no imports/exports, has return)
 * - Executes compiled JS in a controlled harness to ensure it returns a component function
 *
 * Run: npm run templates:verify
 */

import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import React from 'react';

// Import the server compiler (runtime safe – only uses sucrase)
import { sceneCompiler } from '../src/server/services/compilation/scene-compiler.service';

type VerifyResult = {
  file: string;
  ok: boolean;
  reason?: string;
};

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const templatesDir = path.resolve(__dirname, '../src/templates');
  const files = walkTsxFiles(templatesDir);

  const results: VerifyResult[] = [];

  for (const file of files) {
    try {
      const tsx = fs.readFileSync(file, 'utf8');
      if (!tsx || tsx.trim().length === 0) {
        results.push({ file, ok: false, reason: 'empty file' });
        continue;
      }

      // Compile with empty context (no cross-scene conflicts for single template)
      const compilation = await sceneCompiler.compileScene(tsx, {
        projectId: 'verify-project',
        sceneId: path.basename(file),
        existingScenes: [],
      });

      const js = compilation.jsCode || '';

      // Static checks (ignore strings and comments to avoid false positives from template code snippets)
      const scrubbed = stripStringsAndComments(js);
      if (/^\s*import\s/m.test(scrubbed)) {
        results.push({ file, ok: false, reason: 'compiled JS contains import statements' });
        continue;
      }
      if (/\bexport\b/.test(scrubbed)) {
        results.push({ file, ok: false, reason: 'compiled JS contains export statements' });
        continue;
      }
      if (!/return\s+[A-Za-z_$][A-Za-z0-9_$]*/.test(scrubbed)) {
        results.push({ file, ok: false, reason: 'compiled JS missing trailing return Component' });
        continue;
      }

      // Execution harness
      const windowStub: any = {};
      windowStub.React = React;
      windowStub.IconifyIcon = (props: any) => React.createElement('span', props);
      windowStub.NativeAudio = function () {};
      windowStub.Audio = function () {};
      windowStub.RemotionGoogleFonts = {
        loadFont: () => ({ waitUntilDone: async () => {} }),
      };

      // Very lightweight Remotion API surface (only needed for safe return; the component will not be rendered here)
      windowStub.Remotion = {
        AbsoluteFill: (...args: any[]) => React.createElement('div', ...args),
        Sequence: (...args: any[]) => React.createElement('div', ...args),
        useCurrentFrame: () => 0,
        useVideoConfig: () => ({ width: 1920, height: 1080, fps: 30 }),
        interpolate: (..._args: any[]) => 0,
        spring: (..._args: any[]) => 0,
        Audio: (...args: any[]) => React.createElement('audio', ...args),
        Video: (...args: any[]) => React.createElement('video', ...args),
        Img: (...args: any[]) => React.createElement('img', ...args),
        staticFile: (p: string) => p,
        random: (_seed: number) => 0.5,
        Series: { Sequence: (...args: any[]) => React.createElement('div', ...args) },
      };

      // Execute compiled JS inside a function scope with window + React provided
      let component: any;
      try {
        const fn = new Function('window', 'React', js);
        component = fn(windowStub, React);
      } catch (e: any) {
        results.push({ file, ok: false, reason: `execution error: ${e?.message || e}` });
        continue;
      }

      if (typeof component !== 'function') {
        results.push({ file, ok: false, reason: 'execution did not return a component function' });
        continue;
      }

      results.push({ file, ok: true });
    } catch (err: any) {
      results.push({ file, ok: false, reason: `unhandled error: ${err?.message || err}` });
    }
  }

  // Print summary
  const ok = results.filter((r) => r.ok).length;
  const fail = results.length - ok;
  console.log('\n=== Template Verification Summary ===');
  console.log('Total:', results.length, 'Pass:', ok, 'Fail:', fail);
  if (fail > 0) {
    console.log('\nFailures:');
    results.filter((r) => !r.ok).forEach((r) => {
      console.log('-', path.relative(process.cwd(), r.file), '→', r.reason);
    });
    process.exitCode = 1;
  }
}

function walkTsxFiles(dir: string): string[] {
  const out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...walkTsxFiles(full));
    } else if (e.isFile() && e.name.endsWith('.tsx')) {
      // Exclude internal helper files unlikely to be standalone scenes
      if (/compiled-templates\.json/.test(full)) continue;
      out.push(full);
    }
  }
  return out;
}

// Remove string literals (", ', `...`) and comments to avoid flagging reserved words inside them
function stripStringsAndComments(code: string): string {
  let out = code;
  // Remove template literals first (including interpolations)
  out = out.replace(/`(?:[^`\\]|\\[\s\S])*`/g, '');
  // Remove double-quoted strings
  out = out.replace(/"(?:[^"\\]|\\.)*"/g, '');
  // Remove single-quoted strings
  out = out.replace(/'(?:[^'\\]|\\.)*'/g, '');
  // Remove line comments
  out = out.replace(/\/\/.*$/gm, '');
  // Remove block comments
  out = out.replace(/\/\*[\s\S]*?\*\//g, '');
  return out;
}

main().catch((e) => {
  console.error('Verification failed with error:', e);
  process.exit(1);
});
