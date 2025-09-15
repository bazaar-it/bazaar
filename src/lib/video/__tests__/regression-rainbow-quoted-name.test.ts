import React from 'react';
import { transform } from 'sucrase';
import { sceneCompiler } from '../../../server/services/compilation/scene-compiler.service';
import { wrapSceneNamespace } from '../../video/wrapSceneNamespace';
import { buildMultiSceneModule } from '../../video/buildComposite';

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
    interpolate: (f: number, r: number[], o: number[]) => o[0],
    spring: () => 1,
    Audio: (...args: any[]) => React.createElement('audio', ...args),
    Video: (...args: any[]) => React.createElement('video', ...args),
    Img: (...args: any[]) => React.createElement('img', ...args),
    staticFile: (p: string) => p,
    random: () => 0.5,
    Series: { Sequence: (...args: any[]) => React.createElement('div', ...args) },
  };
  return win;
}

// Minimalized versions of the two problematic templates, exercising the same classes of issues:
// 1) Quoted scene name in wrapper path (we simulate only the code content here)
// 2) Rainbow with SVG defs + url(#id) references

const BUILD_WORD_SLIDE_TSX = `
  const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
  export default function TemplateScene_23690547(){
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const scale = spring({ frame, fps, from: 0.95, to: 1 });
    const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return (
      React.createElement(AbsoluteFill, { style: { background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        React.createElement('div', { style: { transform: 'scale(' + scale + ')', opacity } }, 'Build a — word slide')
      )
    );
  }
`;

const RAINBOW_STROKE_TSX = `
  const { AbsoluteFill, useCurrentFrame, useVideoConfig } = window.Remotion;
  function TemplateScene_14e224bc(){
    const { width, height } = useVideoConfig();
    const word = 'Meet';
    return (
      React.createElement(AbsoluteFill, { style: { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', display: 'flex' } },
        React.createElement('svg', { width: 800, height: 300, viewBox: '0 0 ' + 800 + ' ' + 300 },
          React.createElement('defs', null,
            React.createElement('linearGradient', { id: 'rainbow-gradient', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
              React.createElement('stop', { offset: '0%', stopColor: '#ff0000' }),
              React.createElement('stop', { offset: '100%', stopColor: '#00ff00' })
            ),
            React.createElement('filter', { id: 'neon-glow' }, React.createElement('feGaussianBlur', { stdDeviation: '12' }))
          ),
          React.createElement('text', { x: 50, y: 200, fill: 'none', stroke: 'url(#rainbow-gradient)', filter: 'url(#neon-glow)', strokeWidth: '8' }, word)
        )
      )
    );
  }
  export default TemplateScene_14e224bc;
`;

describe('Regression: Rainbow defs + quoted-name scene combine cleanly', () => {
  it('builds and evaluates multi-scene composite without parser/runtime errors', async () => {
    const compA = await sceneCompiler.compileScene(RAINBOW_STROKE_TSX, {
      projectId: 'proj', sceneId: 'RAINBOW1234', existingScenes: []
    });
    const compB = await sceneCompiler.compileScene(BUILD_WORD_SLIDE_TSX, {
      projectId: 'proj', sceneId: 'BUILD5678', existingScenes: [{ id: 'RAINBOW1234', tsxCode: RAINBOW_STROKE_TSX, name: "Rainbow stroke text effect" }]
    });

    const wA = wrapSceneNamespace({ sceneCode: compA.jsCode, index: 0, componentName: 'RainbowScene' });
    const wB = wrapSceneNamespace({ sceneCode: compB.jsCode, index: 1, componentName: 'BuildScene' });

    // Ensure SVG ids were prefixed and url(#...) updated in wrapped rainbow code
    expect(wA.code).toMatch(/id\s*:\s*['"]SceneNS_0__rainbow-gradient['"]/);
    expect(wA.code).toMatch(/url\(#SceneNS_0__rainbow-gradient\)/);

    const composite = buildMultiSceneModule({
      sceneImports: [wA.code, wB.code],
      sceneComponents: [
        'React.createElement(SceneNS_0.Comp, {})',
        'React.createElement(SceneNS_1.Comp, {})'
      ],
      includeFontsLoader: false,
      includeIconFallback: true,
      totalDurationInFrames: 195,
    });

    // Transform should not throw (guards the prior Sucrase parser failure)
    const transformed = transform(composite, { transforms: ['typescript', 'jsx'], jsxRuntime: 'classic', production: false }).code;

    // Evaluate with stubs to catch syntax/redeclare issues at runtime
    const win = makeWindowStub();
    (global as any).window = win;
    const match = transformed.match(/export\s+default\s+function\s+(\w+)/);
    const name = match ? match[1] : 'Composite';
    const runnable = transformed
      .replace(/export\s+default\s+function\s+\w+/, 'function ' + name)
      + `\nreturn ${name};`;
    const fn = new Function('window', runnable);
    const Comp: any = fn(win);
    expect(typeof Comp).toBe('function');
  });
});
