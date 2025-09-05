/**
 * Tests for icon replacement and scene isolation
 * Ensures one bad icon doesn't break the entire export
 */
import { replaceIconifyIcons } from '../replace-iconify-icons';
import { processSceneCode } from '../render.service';

describe('Icon Replacement and Scene Isolation', () => {
  describe('Icon transformation', () => {
    it('should replace valid icons with inline SVG', async () => {
      const code = `
        import React from 'react';
        const Component = () => {
          return (
            <div>
              <IconifyIcon icon="mdi:heart" />
            </div>
          );
        };
        export default Component;
      `;
      
      const result = await replaceIconifyIcons(code);
      
      // Should have replaced IconifyIcon
      expect(result).not.toContain('IconifyIcon');
      expect(result).not.toContain('window.IconifyIcon');
      
      // Should contain inline SVG or runtime component
      expect(result).toMatch(/__InlineIcon|<svg/);
    });

    it('should handle unknown icon sets with fallback', async () => {
      const code = `
        import React from 'react';
        const Component = () => {
          return (
            <div>
              <IconifyIcon icon="unknownset:fakename" />
            </div>
          );
        };
        export default Component;
      `;
      
      const result = await replaceIconifyIcons(code);
      
      // Should NOT contain IconifyIcon references
      expect(result).not.toContain('window.IconifyIcon');
      expect(result).not.toContain('IconifyIcon');
      
      // Should have fallback handling
      expect(result).toContain('__InlineIcon');
      expect(result).toContain('__INLINE_ICON_MAP');
    });

    it('should handle missing icon names gracefully', async () => {
      const code = `
        import React from 'react';
        const Component = () => {
          return (
            <div>
              <IconifyIcon icon="mdi:this-icon-definitely-does-not-exist-12345" />
            </div>
          );
        };
        export default Component;
      `;
      
      const result = await replaceIconifyIcons(code);
      
      // Critical: No IconifyIcon references should remain
      expect(result).not.toContain('window.IconifyIcon');
      expect(result).not.toContain('IconifyIcon');
      
      // Should have replacement
      expect(result).toMatch(/__InlineIcon|<svg/);
    });

    it('should handle dynamic icons with runtime map', async () => {
      const code = `
        import React from 'react';
        const Component = () => {
          const icons = ['mdi:heart', 'lucide:search'];
          return (
            <div>
              {icons.map(icon => (
                <IconifyIcon key={icon} icon={icon} />
              ))}
            </div>
          );
        };
        export default Component;
      `;
      
      const result = await replaceIconifyIcons(code);
      
      // Should have runtime map for dynamic icons
      expect(result).toContain('__INLINE_ICON_MAP');
      expect(result).toContain('__InlineIcon');
      
      // No IconifyIcon references
      expect(result).not.toContain('window.IconifyIcon');
    });

    it('should pass post-validation with no IconifyIcon references', async () => {
      const testCases = [
        // Simple icon
        `<IconifyIcon icon="mdi:home" />`,
        // Dynamic icon
        `<IconifyIcon icon={selectedIcon} />`,
        // React.createElement
        `React.createElement(IconifyIcon, { icon: "mdi:home" })`,
        // window.IconifyIcon
        `React.createElement(window.IconifyIcon, { icon: "mdi:home" })`,
      ];
      
      for (const testCase of testCases) {
        const code = `
          import React from 'react';
          const Component = () => {
            return <div>${testCase}</div>;
          };
          export default Component;
        `;
        
        const result = await replaceIconifyIcons(code);
        
        // Post-validation: ZERO IconifyIcon references allowed
        const iconifyMatches = result.match(/window\.IconifyIcon|\bIconifyIcon\b/g);
        expect(iconifyMatches).toBeNull();
      }
    });
  });

  describe('Scene isolation', () => {
    it('should isolate scenes - bad icon in one scene should not affect others', async () => {
      // Scene 1: Valid icon
      const scene1 = `
        import React from 'react';
        const Component = () => {
          return <div><IconifyIcon icon="mdi:heart" /></div>;
        };
        export default Component;
      `;
      
      // Scene 2: Invalid icon
      const scene2 = `
        import React from 'react';
        const Component = () => {
          return <div><IconifyIcon icon="invalid:nonexistent" /></div>;
        };
        export default Component;
      `;
      
      // Scene 3: Another valid icon
      const scene3 = `
        import React from 'react';
        const Component = () => {
          return <div><IconifyIcon icon="lucide:search" /></div>;
        };
        export default Component;
      `;
      
      // Process all scenes
      const results = await Promise.all([
        replaceIconifyIcons(scene1),
        replaceIconifyIcons(scene2),
        replaceIconifyIcons(scene3),
      ]);
      
      // All scenes should process successfully
      expect(results).toHaveLength(3);
      
      // No scene should have IconifyIcon references
      for (const result of results) {
        expect(result).not.toContain('window.IconifyIcon');
        expect(result).not.toContain('IconifyIcon');
      }
      
      // Each should have proper replacements
      expect(results[0]).toMatch(/__InlineIcon|<svg/); // Valid icon
      expect(results[1]).toMatch(/__InlineIcon|<svg/); // Invalid icon with fallback
      expect(results[2]).toMatch(/__InlineIcon|<svg/); // Another valid icon
    });

    it('should handle scene with multiple icon issues', async () => {
      const problematicScene = `
        import React from 'react';
        const Component = () => {
          return (
            <div>
              <IconifyIcon icon="mdi:heart" />
              <IconifyIcon icon="unknownset:fake" />
              <IconifyIcon icon="another-invalid-format" />
              {window.IconifyIcon && <window.IconifyIcon icon="mdi:home" />}
            </div>
          );
        };
        export default Component;
      `;
      
      const result = await replaceIconifyIcons(problematicScene);
      
      // Should handle all cases without crashing
      expect(result).toBeDefined();
      
      // CRITICAL: No IconifyIcon references should remain
      expect(result).not.toContain('window.IconifyIcon');
      expect(result).not.toContain('IconifyIcon');
      
      // Should have replacements
      expect(result).toContain('__InlineIcon');
    });
  });

  describe('Lambda compilation', () => {
    it('should produce Lambda-compatible code', async () => {
      const tsxCode = `
        import React from 'react';
        import { useCurrentFrame } from 'remotion';
        
        const Component = () => {
          const frame = useCurrentFrame();
          return (
            <div>
              <IconifyIcon icon="mdi:heart" />
              <span>Frame: {frame}</span>
            </div>
          );
        };
        
        export default Component;
      `;
      
      // Process through the full pipeline
      const processed = await processSceneCode(tsxCode, 'test-scene');
      
      // Should be valid JavaScript (not TypeScript)
      expect(processed).not.toContain('import React');
      expect(processed).not.toContain('import { useCurrentFrame }');
      
      // Should not have IconifyIcon
      expect(processed).not.toContain('IconifyIcon');
      expect(processed).not.toContain('window.IconifyIcon');
      
      // Should be evaluable by Function constructor
      expect(() => {
        // This simulates what Lambda does
        new Function('React', 'useCurrentFrame', processed);
      }).not.toThrow();
    });
  });
});