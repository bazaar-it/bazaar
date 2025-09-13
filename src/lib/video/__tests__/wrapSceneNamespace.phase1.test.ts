import React from 'react';
import { transform } from 'sucrase';
import { wrapSceneNamespace } from '../wrapSceneNamespace';

function makeWindowStub() {
  const win: any = {};
  win.React = React;
  win.Remotion = {
    AbsoluteFill: (...args: any[]) => React.createElement('div', ...args),
    useCurrentFrame: () => 3,
    useVideoConfig: () => ({ width: 1920, height: 1080, fps: 30 }),
    interpolate: () => 0,
    spring: () => 0,
  };
  return win;
}

describe('wrapSceneNamespace — Phase 1 wrapper guarantees', () => {
  it('does not inject extra Remotion destructuring', () => {
    const scene = `const { AbsoluteFill, useCurrentFrame } = window.Remotion;\nfunction SceneX(){ const f = useCurrentFrame(); return React.createElement(AbsoluteFill, {}); }`;
    const beforeCount = (scene.match(/=\s*window\.Remotion/g) || []).length;
    const wrapped = wrapSceneNamespace({ sceneCode: scene, index: 0, componentName: 'SceneX' });
    const afterCount = (wrapped.code.match(/=\s*window\.Remotion/g) || []).length;
    expect(afterCount).toBe(beforeCount); // No duplicate destructuring injected
  });

  it('uses var for namespace to tolerate redeclarations', () => {
    const scene = `function SceneX(){ return React.createElement('div', {}); }`;
    const w1 = wrapSceneNamespace({ sceneCode: scene, index: 0, componentName: 'SceneX', namespaceName: 'SceneNS_TEST' });
    const w2 = wrapSceneNamespace({ sceneCode: scene, index: 0, componentName: 'SceneX', namespaceName: 'SceneNS_TEST' });
    const code = `${w1.code}\n${w2.code}`;
    // Re-declaration should not throw because wrapper uses 'var'
    expect(code).toMatch(/^var\s+SceneNS_TEST\s*=\s*\(\(\)\s*=>/m);
    // Evaluate twice in one module scope
    const runnable = `${code}\nreturn typeof SceneNS_TEST === 'object' && typeof SceneNS_TEST.Comp === 'function';`;
    const fn = new Function(runnable);
    const ok = fn();
    expect(ok).toBe(true);
  });

  it('remaps useCurrentFrame with startOffset (window.Remotion and bare calls)', () => {
    const scene = `
      const { useCurrentFrame, AbsoluteFill } = window.Remotion;
      function SceneX(){ const a = window.Remotion.useCurrentFrame(); const b = useCurrentFrame(); window.__TEST_F = a + b; return React.createElement(AbsoluteFill, {}); }
    `;
    const wrapped = wrapSceneNamespace({ sceneCode: scene, index: 0, componentName: 'SceneX', startOffset: 7 });
    const win = makeWindowStub();
    (global as any).window = win;
    const transformed = transform(wrapped.code + `\nSceneNS_0.Comp();\nreturn window.__TEST_F;`, { transforms: ['typescript', 'jsx'], jsxRuntime: 'classic', production: false }).code;
    // Provide React in the function scope (scene uses bare React.createElement)
    const fn = new Function('window', `const React = window.React;\n${transformed}`);
    const sum: any = fn(win);
    expect(sum).toBe(20); // (3+7) + (3+7) = 20
  });
});
