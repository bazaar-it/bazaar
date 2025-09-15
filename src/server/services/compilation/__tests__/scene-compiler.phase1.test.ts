import React from 'react';
import { sceneCompiler } from '../../compilation/scene-compiler.service';

describe('SceneCompilerService — Phase 1 guarantees', () => {
  function makeWindowStub() {
    const win: any = {};
    win.React = React;
    win.Remotion = {
      AbsoluteFill: (...args: any[]) => React.createElement('div', ...args),
      useCurrentFrame: () => 0,
      useVideoConfig: () => ({ width: 1920, height: 1080, fps: 30 }),
      interpolate: () => 0,
      spring: () => 0,
      Sequence: (...args: any[]) => React.createElement('div', ...args),
      Audio: (...args: any[]) => React.createElement('audio', ...args),
      Video: (...args: any[]) => React.createElement('video', ...args),
      Img: (...args: any[]) => React.createElement('img', ...args),
      staticFile: (p: string) => p,
      random: () => 0.5,
    };
    return win;
  }

  it('appends an auto-return for Function constructor compatibility', async () => {
    const tsx = `
      const { AbsoluteFill } = window.Remotion;
      function SceneA(){ return React.createElement(AbsoluteFill, {}); }
      export default SceneA;
    `;
    const res = await sceneCompiler.compileScene(tsx, { projectId: 'p', sceneId: 'ret1' });
    expect(res.success).toBe(true);
    expect(res.jsCode).toMatch(/return\s+SceneA;\s*$/m);

    // Sanity: can execute via Function and receive the component back
    const win = makeWindowStub();
    (global as any).window = win;
    const fn = new Function('window', res.jsCode);
    const Comp: any = fn(win);
    expect(typeof Comp).toBe('function');
    const el = React.createElement(Comp);
    expect(el).toBeTruthy();
  });

  it('appends auto-return for const component default export', async () => {
    const tsx = `
      const { AbsoluteFill } = window.Remotion;
      const SceneB = () => React.createElement(AbsoluteFill, {});
      export default SceneB;
    `;
    const res = await sceneCompiler.compileScene(tsx, { projectId: 'p', sceneId: 'ret2' });
    expect(res.success).toBe(true);
    expect(res.jsCode).toMatch(/return\s+SceneB;\s*$/m);
  });

  it('appends auto-return for function declaration default export', async () => {
    const tsx = `
      const { AbsoluteFill } = window.Remotion;
      export default function SceneC(){ return React.createElement(AbsoluteFill, {}); }
    `;
    const res = await sceneCompiler.compileScene(tsx, { projectId: 'p', sceneId: 'ret3' });
    expect(res.success).toBe(true);
    expect(res.jsCode).toMatch(/return\s+SceneC;\s*$/m);
  });

  it('auto-renames colliding identifiers using sceneId suffix', async () => {
    const existingTsx = `const Button = () => React.createElement('div', {});
export default function S1(){ return React.createElement(Button, {}); }`;
    const newTsx = `const Button = () => React.createElement('div', {});
export default function S2(){ return React.createElement(Button, {}); }`;
    const existingScenes = [
      { id: 'f5b2d141-1111-2222-3333-444444444444', tsxCode: existingTsx, name: 'S1' },
    ];
    const res = await sceneCompiler.compileScene(newTsx, {
      projectId: 'p2',
      sceneId: 'f5b2d141-aaaa-bbbb-cccc-dddddddddddd',
      existingScenes,
    });

    // Suffix is first 8 chars of sceneId without dashes
    expect(res.tsxCode).toContain('Button_f5b2d141');
    expect(res.jsCode).toContain('Button_f5b2d141');
  });
});
