import React from 'react';
import { sceneCompiler } from '../../../server/services/compilation/scene-compiler.service';
import { transform } from 'sucrase';
import { wrapSceneNamespace } from '../../video/wrapSceneNamespace';
import { buildCompositeHeader } from '../../video/buildCompositeHeader';
import { buildSingleSceneModule, buildMultiSceneModule } from '../../video/buildComposite';

function makeWindowStub() {
  const win: any = {};
  win.React = React;
  win.IconifyIcon = (props: any) => React.createElement('span', props);
  win.NativeAudio = function () {};
  win.Audio = function () {};
  win.RemotionGoogleFonts = { loadFont: () => ({ waitUntilDone: async () => {} }) };
  win.Remotion = {
    AbsoluteFill: (...args: any[]) => React.createElement('div', ...args),
    Sequence: (...args: any[]) => React.createElement('div', ...args),
    useCurrentFrame: () => 0,
    useVideoConfig: () => ({ width: 1920, height: 1080, fps: 30 }),
    interpolate: () => 0,
    spring: () => 0,
    Audio: (...args: any[]) => React.createElement('audio', ...args),
    Video: (...args: any[]) => React.createElement('video', ...args),
    Img: (...args: any[]) => React.createElement('img', ...args),
    staticFile: (p: string) => p,
    random: () => 0.5,
    Series: { Sequence: (...args: any[]) => React.createElement('div', ...args) },
  };
  return win;
}

describe('Preview composite glue (no destructuring, multi-scene safety)', () => {
  it('executes a single compiled scene without module-scope destructuring', async () => {
    const tsx = `
      const { AbsoluteFill } = window.Remotion;
      export default function SceneA(){
        return React.createElement(AbsoluteFill, {});
      }
    `;
    const compiled = await sceneCompiler.compileScene(tsx, {
      projectId: 'p', sceneId: 'A', existingScenes: []
    });
    const wrapped = wrapSceneNamespace({
      sceneCode: compiled.jsCode,
      index: 0,
      componentName: 'SceneA',
    });

    const composite = buildSingleSceneModule({ code: wrapped.code, componentName: 'SceneA' }, { includeFontsLoader: false, includeIconFallback: true, withAudio: false });

    const win = makeWindowStub();
    const transformed = transform(composite, { transforms: ['typescript', 'jsx'], jsxRuntime: 'classic', production: false }).code;
    const match = transformed.match(/export\s+default\s+function\s+(\w+)/);
    const name = match ? match[1] : 'Composite';
    const runnable = transformed
      .replace(/export\s+default\s+function\s+\w+/, 'function ' + name)
      + `\nreturn ${name};`;
    (global as any).window = win;
    const fn = new Function('window', runnable);
    const Comp: any = fn(win);
    expect(typeof Comp).toBe('function');
    const el = React.createElement(Comp);
    expect(el).toBeTruthy();
    // Execution path validated; header included by builder
  });

  it('renders two scenes with colliding identifiers via auto-rename', async () => {
    const tsxA = `
      const Button = () => React.createElement('div', {});
      export default function SceneA(){ return React.createElement(Button, {}); }
    `;
    const tsxB = `
      const Button = () => React.createElement('div', {});
      export default function SceneB(){ return React.createElement(Button, {}); }
    `;
    const compA = await sceneCompiler.compileScene(tsxA, { projectId: 'p2', sceneId: 'S1', existingScenes: [] });
    const compB = await sceneCompiler.compileScene(tsxB, { projectId: 'p2', sceneId: 'S2', existingScenes: [{ id: 'S1', tsxCode: tsxA, name: 'A' }] });

    const wA = wrapSceneNamespace({ sceneCode: compA.jsCode, index: 0, componentName: 'SceneA' });
    const wB = wrapSceneNamespace({ sceneCode: compB.jsCode, index: 1, componentName: 'SceneB' });
    const composite = buildMultiSceneModule({
      sceneImports: [wA.code, wB.code],
      sceneComponents: [
        'React.createElement(SceneNS_0.Comp, {})',
        'React.createElement(SceneNS_1.Comp, {})'
      ],
      includeFontsLoader: false,
      includeIconFallback: true,
      totalDurationInFrames: 300,
    });
    const win = makeWindowStub();
    const transformed = transform(composite, { transforms: ['typescript', 'jsx'], jsxRuntime: 'classic', production: false }).code;
    const match = transformed.match(/export\s+default\s+function\s+(\w+)/);
    const name = match ? match[1] : 'Composite';
    const runnable = transformed
      .replace(/export\s+default\s+function\s+\w+/, 'function ' + name)
      + `\nreturn ${name};`;
    (global as any).window = win;
    const fn = new Function('window', runnable);
    const Comp: any = fn(win);
    expect(typeof Comp).toBe('function');
    // If identifiers collided, the Function would throw at evaluation time.
  });
});
