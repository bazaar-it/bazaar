import { buildCompositeHeader } from '../buildCompositeHeader';
import { buildSingleSceneModule } from '../buildComposite';

describe('Composite header — Phase 1 guardrails', () => {
  it('does not inject module-scope Remotion destructuring', () => {
    const header = buildCompositeHeader({ includeFontsLoader: true, includeIconFallback: true });
    // The header should not contain any destructuring from window.Remotion at module scope
    expect(header).not.toMatch(/const\s*\{[^}]*\}\s*=\s*window\.Remotion/);
  });

  it('single-scene module does not add module-scope Remotion destructuring in header area', () => {
    const scene = { code: 'function SceneZ(){ return null; }\nreturn SceneZ;', componentName: 'SceneZ' };
    const mod = buildSingleSceneModule(scene, { includeFontsLoader: true, includeIconFallback: true });
    const headerSection = mod.split('var EnhancedAudio')[0];
    expect(headerSection).not.toMatch(/const\s*\{[^}]*\}\s*=\s*window\.Remotion/);
  });
});

