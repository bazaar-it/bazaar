import { applyFrameOffset } from '../../routers/scenes';

describe('applyFrameOffset', () => {
  it('returns original code for empty or invalid input', () => {
    expect(applyFrameOffset('', 10)).toBe('');
    // @ts-ignore
    expect(applyFrameOffset(undefined, 10)).toBeUndefined();
  });

  it('bounds and floors the offset', () => {
    const src = 'const { useCurrentFrame } = window.Remotion;\nconst frame = useCurrentFrame();';
    const out = applyFrameOffset(src, 3.9);
    expect(out).toContain('+ 3');
  });

  it('injects offset into const frame declaration', () => {
    const src = 'const frame = useCurrentFrame();\nexport default function X() { return frame; }';
    const out = applyFrameOffset(src, 12);
    expect(out).toContain('return __f + 12');
  });

  it('replaces direct useCurrentFrame() calls', () => {
    const src = 'export default function X(){ return useCurrentFrame(); }';
    const out = applyFrameOffset(src, 8);
    expect(out).toContain('useCurrentFrame() + 8');
  });

  it('injects header when using frame variable without declaration', () => {
    const src = 'export default function X(){ return frame; }';
    const out = applyFrameOffset(src, 5);
    expect(out).toContain('Applied frame offset');
    expect(out).toContain('+ 5');
  });
});

