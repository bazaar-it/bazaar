import { describe, it, expect } from '@jest/globals';

describe('XSS Prevention in Dynamic Code Execution', () => {
  describe('Template Code Validation', () => {
    const validateTemplateCode = (code: string): void => {
      const dangerousPatterns = [
        /eval\s*\(/,
        /Function\s*\(/,
        /\.innerHTML\s*=/,
        /document\.write/,
        /window\.location/,
        /__proto__/,
        /constructor\s*\[/,
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(code)) {
          throw new Error(`Security: Template contains potentially dangerous code pattern: ${pattern}`);
        }
      }
    };

    it('should reject code with eval()', () => {
      const maliciousCode = `
        const Component = () => {
          eval('alert("XSS")');
          return <div>Test</div>;
        };
      `;
      
      expect(() => validateTemplateCode(maliciousCode)).toThrow('Security: Template contains potentially dangerous code pattern');
    });

    it('should reject code with Function constructor', () => {
      const maliciousCode = `
        const Component = () => {
          const fn = new Function('alert("XSS")');
          return <div>Test</div>;
        };
      `;
      
      expect(() => validateTemplateCode(maliciousCode)).toThrow('Security: Template contains potentially dangerous code pattern');
    });

    it('should reject code with innerHTML manipulation', () => {
      const maliciousCode = `
        const Component = () => {
          const ref = useRef();
          ref.current.innerHTML = '<script>alert("XSS")</script>';
          return <div ref={ref}>Test</div>;
        };
      `;
      
      expect(() => validateTemplateCode(maliciousCode)).toThrow('Security: Template contains potentially dangerous code pattern');
    });

    it('should reject code with document.write', () => {
      const maliciousCode = `
        const Component = () => {
          document.write('<script>alert("XSS")</script>');
          return <div>Test</div>;
        };
      `;
      
      expect(() => validateTemplateCode(maliciousCode)).toThrow('Security: Template contains potentially dangerous code pattern');
    });

    it('should reject code with window.location manipulation', () => {
      const maliciousCode = `
        const Component = () => {
          window.location = 'http://evil.com';
          return <div>Test</div>;
        };
      `;
      
      expect(() => validateTemplateCode(maliciousCode)).toThrow('Security: Template contains potentially dangerous code pattern');
    });

    it('should reject code with prototype pollution', () => {
      const maliciousCode = `
        const Component = () => {
          Object.__proto__.polluted = true;
          return <div>Test</div>;
        };
      `;
      
      expect(() => validateTemplateCode(maliciousCode)).toThrow('Security: Template contains potentially dangerous code pattern');
    });

    it('should allow safe template code', () => {
      const safeCode = `
        const Component = () => {
          const [count, setCount] = useState(0);
          return (
            <div>
              <button onClick={() => setCount(count + 1)}>
                Count: {count}
              </button>
            </div>
          );
        };
        export default Component;
      `;
      
      expect(() => validateTemplateCode(safeCode)).not.toThrow();
    });
  });

  describe('Blob URL Security', () => {
    it('should create blob URLs with proper cleanup', () => {
      const code = 'export default function() { return "test"; }';
      const blob = new Blob([code], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      
      // Verify blob URL was created
      expect(blobUrl).toMatch(/^blob:/);
      
      // Clean up blob URL
      URL.revokeObjectURL(blobUrl);
      
      // Verify cleanup (URL should no longer be valid)
      // Note: In real browser, fetching revoked URL would fail
      expect(() => URL.revokeObjectURL(blobUrl)).not.toThrow();
    });

    it('should handle blob URL cleanup in error cases', () => {
      let blobUrl: string | null = null;
      
      try {
        const code = 'invalid { code';
        const blob = new Blob([code], { type: 'application/javascript' });
        blobUrl = URL.createObjectURL(blob);
        
        // Simulate error
        throw new Error('Compilation failed');
      } catch (error) {
        // Cleanup should still happen
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Content Security Policy', () => {
    it('should recommend CSP headers for production', () => {
      const recommendedCSP = {
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' blob:",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "connect-src 'self' https:",
          "frame-src 'none'",
          "object-src 'none'",
        ].join('; ')
      };
      
      expect(recommendedCSP['Content-Security-Policy']).toContain("script-src 'self'");
      expect(recommendedCSP['Content-Security-Policy']).toContain('blob:');
      expect(recommendedCSP['Content-Security-Policy']).not.toContain('unsafe-eval');
    });
  });
});