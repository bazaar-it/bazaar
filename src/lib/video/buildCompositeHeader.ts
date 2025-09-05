"use client";
// src/lib/video/buildCompositeHeader.ts
// Builds the preview composite header glue as a string.
// Important: Never inject module-scope Remotion destructuring.

export interface CompositeHeaderOptions {
  includeIconFallback?: boolean;
  includeFontsLoader?: boolean;
}

export function buildCompositeHeader(options: CompositeHeaderOptions = {}): string {
  const { includeIconFallback = true, includeFontsLoader = true } = options;

  const lines: string[] = [];
  lines.push(`var React = window.React;`);
  lines.push(`// Preserve native Audio constructor for scenes that might need it`);
  lines.push(`var NativeAudio = window.NativeAudio || window.Audio;`);

  if (includeIconFallback) {
    lines.push(``);
    lines.push(`// Add IconifyIcon fallback to prevent runtime errors when icons haven't been set up yet`);
    lines.push(`if (!window.IconifyIcon) {`);
    lines.push(`  window.IconifyIcon = (props) => {`);
    lines.push(`    const style = props?.style || {};`);
    lines.push(`    return React.createElement('span', {`);
    lines.push(`      ...props,`);
    lines.push(`      style: {`);
    lines.push(`        display: 'inline-block',`);
    lines.push(`        width: style.width || '1em',`);
    lines.push(`        height: style.height || '1em',`);
    lines.push(`        background: style.background || 'currentColor',`);
    lines.push(`        borderRadius: style.borderRadius || '2px',`);
    lines.push(`        ...style,`);
    lines.push(`      }`);
    lines.push(`    });`);
    lines.push(`  };`);
    lines.push(`}`);
  }

  if (includeFontsLoader) {
    lines.push(``);
    lines.push(`// Create a wrapper component that loads fonts before rendering the scene`);
    lines.push(`if (typeof FontLoader === 'undefined') {`);
    lines.push(`var FontLoader = ({ children }) => {`);
    lines.push(`  const [fontsLoaded, setFontsLoaded] = React.useState(false);`);
    lines.push(`  React.useEffect(() => {`);
    lines.push(`    if (!document.getElementById('bazaar-preview-fonts')) {`);
    lines.push(`      const style = document.createElement('style');`);
    lines.push(`      style.id = 'bazaar-preview-fonts';`);
    lines.push(`      style.textContent = \``);
    lines.push(`        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');`);
    lines.push(`        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');`);
    lines.push(`        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');`);
    lines.push(`        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&display=swap');`);
    lines.push(`        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');`);
    lines.push(`        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');`);
    lines.push(`      \`;`);
    lines.push(`      document.head.appendChild(style);`);
    lines.push(`      setTimeout(() => setFontsLoaded(true), 100);`);
    lines.push(`    } else {`);
    lines.push(`      setFontsLoaded(true);`);
    lines.push(`    }`);
    lines.push(`  }, []);`);
    lines.push(`  if (!fontsLoaded) {`);
    lines.push(`    return React.createElement(window.Remotion.AbsoluteFill, { style: { backgroundColor: 'white' } });`);
    lines.push(`  }`);
    lines.push(`  return children;`);
    lines.push(`};`);
    lines.push(`}`);
    lines.push(``);
    lines.push(`// Create a REAL implementation of RemotionGoogleFonts that actually loads fonts`);
    lines.push(`if (!window.RemotionGoogleFontsLoaded) { window.RemotionGoogleFontsLoaded = new Set(); }`);
    lines.push(`if (typeof RemotionGoogleFonts === 'undefined') {`);
    lines.push(`var RemotionGoogleFonts = {`);
    lines.push(`  loadFont: (fontFamily, options) => {`);
    lines.push(`    const fontKey = fontFamily + '-' + JSON.stringify(options?.weights || []);`);
    lines.push(`    if (!window.RemotionGoogleFontsLoaded.has(fontKey)) {`);
    lines.push(`      window.RemotionGoogleFontsLoaded.add(fontKey);`);
    lines.push(`      const weights = options?.weights || ['400'];`);
    lines.push(`      const weightString = weights.join(';');`);
    lines.push(`      const fontUrl = 'https://fonts.googleapis.com/css2?family=' + fontFamily.replace(' ', '+') + ':wght@' + weightString + '&display=swap';`);
    lines.push(`      const linkId = ('font-' + fontFamily + '-' + weightString).replace(/[^a-zA-Z0-9-]/g, '');`);
    lines.push(`      if (!document.getElementById(linkId)) {`);
    lines.push(`        const link = document.createElement('link');`);
    lines.push(`        link.id = linkId; link.rel = 'stylesheet'; link.href = fontUrl;`);
    lines.push(`        document.head.appendChild(link);`);
    lines.push(`        if (document.fonts && document.fonts.check) {`);
    lines.push(`          setTimeout(() => {`);
    lines.push(`            weights.forEach(weight => {`);
    lines.push(`              const testString = String(weight) + ' 16px "' + fontFamily + '"';`);
    lines.push(`              if (!document.fonts.check(testString)) {`);
    lines.push(`                const testDiv = document.createElement('div');`);
    lines.push(`                testDiv.style.fontFamily = '"' + fontFamily + '", sans-serif';`);
    lines.push(`                testDiv.style.fontWeight = String(weight);`);
    lines.push(`                testDiv.style.position = 'absolute';`);
    lines.push(`                testDiv.style.visibility = 'hidden';`);
    lines.push(`                testDiv.textContent = 'Test';`);
    lines.push(`                document.body.appendChild(testDiv);`);
    lines.push(`                setTimeout(() => document.body.removeChild(testDiv), 100);`);
    lines.push(`              }`);
    lines.push(`            });`);
    lines.push(`          }, 500);`);
    lines.push(`        }`);
    lines.push(`      }`);
    lines.push(`    }`);
    lines.push(`    return { fontFamily, fonts: {}, unicodeRanges: {}, waitUntilDone: () => Promise.resolve() };
  }
};`);
    lines.push(`}`);
  }

  const header = lines.join('\n');
  try {
    if (typeof window !== 'undefined') {
      const debugFlag = (window as any).BAZAAR_DEBUG_HEADER || (typeof localStorage !== 'undefined' && localStorage.getItem('BAZAAR_DEBUG_HEADER') === '1');
      if (debugFlag) {
        (window as any).__bazaarHeader = header;
        // eslint-disable-next-line no-console
        console.log('[CompositeHeader][DEBUG] Current header string:', header);
      }
    }
  } catch {}
  return header;
}
