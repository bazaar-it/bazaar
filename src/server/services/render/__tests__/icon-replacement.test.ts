/**
 * Tests for icon replacement logic
 * Validates that IconifyIcon references are properly replaced
 */

describe('Icon Replacement Validation', () => {
  // Mock the replace function to test the logic
  const mockReplaceIconifyIcons = (code: string): string => {
    let result = code;
    
    // Replace window.IconifyIcon
    result = result.replace(/window\.IconifyIcon/g, '__InlineIcon');
    
    // Replace bare IconifyIcon
    result = result.replace(/\bIconifyIcon\b/g, '__InlineIcon');
    
    // Add runtime map if needed
    if (result.includes('__InlineIcon')) {
      const runtimeMap = `
const __INLINE_ICON_MAP = {};
function __InlineIcon(props) {
  return React.createElement('svg', {
    viewBox: '0 0 24 24',
    width: '1em',
    height: '1em',
    fill: 'currentColor',
    dangerouslySetInnerHTML: { __html: '<circle cx="12" cy="12" r="10" />' }
  });
}
`;
      result = runtimeMap + result;
    }
    
    return result;
  };

  describe('Post-validation checks', () => {
    it('should remove all window.IconifyIcon references', () => {
      const input = `
        const icon1 = window.IconifyIcon;
        const element = React.createElement(window.IconifyIcon, { icon: "mdi:heart" });
      `;
      
      const output = mockReplaceIconifyIcons(input);
      
      expect(output).not.toContain('window.IconifyIcon');
      expect(output).toContain('__InlineIcon');
    });

    it('should remove all bare IconifyIcon references', () => {
      const input = `
        import { IconifyIcon } from '@iconify/react';
        const element = <IconifyIcon icon="mdi:heart" />;
        const another = React.createElement(IconifyIcon, props);
      `;
      
      const output = mockReplaceIconifyIcons(input);
      
      expect(output).not.toContain('IconifyIcon');
      expect(output).toContain('__InlineIcon');
    });

    it('should handle mixed references', () => {
      const input = `
        const Component = () => {
          return (
            <div>
              <IconifyIcon icon="mdi:heart" />
              {window.IconifyIcon && <window.IconifyIcon icon="mdi:home" />}
              {React.createElement(IconifyIcon, { icon: dynamicIcon })}
            </div>
          );
        };
      `;
      
      const output = mockReplaceIconifyIcons(input);
      
      // No IconifyIcon references should remain
      const iconifyMatches = output.match(/window\.IconifyIcon|\bIconifyIcon\b/g);
      expect(iconifyMatches).toBeNull();
    });

    it('should add runtime components when replacements are made', () => {
      const input = `<IconifyIcon icon="mdi:heart" />`;
      const output = mockReplaceIconifyIcons(input);
      
      expect(output).toContain('__INLINE_ICON_MAP');
      expect(output).toContain('function __InlineIcon');
    });

    it('should not modify code without IconifyIcon', () => {
      const input = `
        const Component = () => {
          return <div>No icons here</div>;
        };
      `;
      
      const output = mockReplaceIconifyIcons(input);
      
      expect(output).not.toContain('__INLINE_ICON_MAP');
      expect(output).not.toContain('__InlineIcon');
      expect(output).toBe(input);
    });
  });

  describe('Scene isolation validation', () => {
    it('should handle each scene independently', () => {
      const scenes = [
        `<IconifyIcon icon="valid:icon" />`,
        `<IconifyIcon icon="invalid:icon" />`,
        `<IconifyIcon icon="another:icon" />`,
      ];
      
      const results = scenes.map(mockReplaceIconifyIcons);
      
      // All scenes should be processed
      expect(results).toHaveLength(3);
      
      // Each should have no IconifyIcon references
      results.forEach(result => {
        expect(result).not.toContain('IconifyIcon');
        expect(result).toContain('__InlineIcon');
      });
    });

    it('should not let one bad scene affect others', () => {
      const goodScene = `<IconifyIcon icon="mdi:heart" />`;
      const badScene = `<IconifyIcon icon={undefined} />`; // Problematic icon
      const anotherGoodScene = `<IconifyIcon icon="lucide:search" />`;
      
      // Process all scenes
      const results = [goodScene, badScene, anotherGoodScene].map(scene => {
        try {
          return mockReplaceIconifyIcons(scene);
        } catch (error) {
          // Scene processing failed, return with fallback
          return scene.replace(/IconifyIcon/g, '__InlineIcon');
        }
      });
      
      // All should have been processed
      expect(results).toHaveLength(3);
      
      // None should have IconifyIcon
      results.forEach(result => {
        expect(result).not.toContain('IconifyIcon');
      });
    });
  });

  describe('Lambda compatibility', () => {
    it('should produce code evaluable by Function constructor', () => {
      const input = `
        const Component = () => {
          return React.createElement(__InlineIcon, { icon: "mdi:heart" });
        };
        Component;
      `;
      
      const output = mockReplaceIconifyIcons(input);
      
      // Should not throw when creating function
      expect(() => {
        new Function('React', output);
      }).not.toThrow();
    });

    it('should handle Remotion hooks properly', () => {
      const input = `
        const Component = () => {
          const frame = useCurrentFrame();
          return <IconifyIcon icon="mdi:heart" />;
        };
      `;
      
      const output = mockReplaceIconifyIcons(input);
      
      // Should preserve Remotion hooks
      expect(output).toContain('useCurrentFrame');
      
      // But remove IconifyIcon
      expect(output).not.toContain('IconifyIcon');
    });
  });
});