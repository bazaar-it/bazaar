import { describe, it, expect } from 'vitest';
import { SceneCompilerService } from '../scene-compiler.service';

describe('SceneCompilerService - Icon normalization', () => {
  const compiler = SceneCompilerService.getInstance();
  const ctx = { projectId: 'p', sceneId: 's' } as any;

  it('rewrites JSX <IconifyIcon/> to <window.IconifyIcon/>', async () => {
    const tsx = `
const { AbsoluteFill } = window.Remotion;
export default function S() {
  return <AbsoluteFill><IconifyIcon icon="mdi:home" /></AbsoluteFill>;
}`;
    const res = await compiler.compileScene(tsx, ctx);
    expect(res.jsCode).toContain('window.IconifyIcon');
    expect(res.jsCode).not.toContain('<IconifyIcon');
  });

  it('rewrites JSX <Icon/> from @iconify/react to <window.IconifyIcon/> and strips import', async () => {
    const tsx = `
import { Icon } from '@iconify/react';
const { AbsoluteFill } = window.Remotion;
export default function S() {
  return <AbsoluteFill><Icon icon="mdi:home" /></AbsoluteFill>;
}`;
    const res = await compiler.compileScene(tsx, ctx);
    expect(res.jsCode).toContain('window.IconifyIcon');
    expect(res.jsCode).not.toContain("from '@iconify/react'");
  });

  it('rewrites React.createElement(IconifyIcon) to window.IconifyIcon', async () => {
    const tsx = `
const { AbsoluteFill } = window.Remotion;
export default function S() {
  return React.createElement(AbsoluteFill, null,
    React.createElement(IconifyIcon, { icon: 'mdi:home' })
  );
}`;
    const res = await compiler.compileScene(tsx, ctx);
    expect(res.jsCode).toContain('React.createElement(window.IconifyIcon');
  });
});

