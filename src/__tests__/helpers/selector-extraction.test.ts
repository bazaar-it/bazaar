import { extractTargetSelectorFromDirectives } from '../../server/api/routers/generation/util';

describe('extractTargetSelectorFromDirectives', () => {
  test('returns undefined when no directives', () => {
    expect(extractTargetSelectorFromDirectives(undefined, 's1')).toBeUndefined();
    expect(extractTargetSelectorFromDirectives([], 's1')).toBeUndefined();
  });

  test('returns undefined when no sceneId', () => {
    const directives = [{ url: 'u', action: 'embed', target: { sceneId: 's1', selector: '#a' } }];
    expect(extractTargetSelectorFromDirectives(directives, undefined)).toBeUndefined();
  });

  test('returns selector for matching sceneId', () => {
    const directives = [
      { url: 'u1', action: 'recreate', target: { sceneId: 'sX', selector: '#x' } },
      { url: 'u2', action: 'embed', target: { sceneId: 's1', selector: '#left-card' } },
    ];
    expect(extractTargetSelectorFromDirectives(directives as any, 's1')).toBe('#left-card');
  });
});

