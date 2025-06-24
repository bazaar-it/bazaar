//src/types/global.d.ts
import type React from 'react';
import type * as Remotion from 'remotion';
import type * as HeroiconsSolid from '@heroicons/react/24/solid';
import type * as HeroiconsOutline from '@heroicons/react/24/outline';
import type * as RemotionShapes from '@remotion/shapes';
import type * as LucideIcons from 'lucide-react';
import type rough from 'roughjs';
import type { Icon } from '@iconify/react';

// Google Fonts types
interface GoogleFontResult {
  fontFamily: string;
  fonts: Record<string, Record<string, Record<string, string>>>;
  unicodeRanges: Record<string, string>;
  waitUntilDone: () => Promise<void>;
}

interface RemotionGoogleFonts {
  loadFont: (fontName: string) => GoogleFontResult;
  Inter: () => GoogleFontResult;
  Roboto: () => GoogleFontResult;
  OpenSans: () => GoogleFontResult;
  Poppins: () => GoogleFontResult;
  Montserrat: () => GoogleFontResult;
}

declare global {
  interface Window {
    React: typeof React;
    Remotion: typeof Remotion;
    HeroiconsSolid: typeof HeroiconsSolid;
    HeroiconsOutline: typeof HeroiconsOutline;
    RemotionShapes: typeof RemotionShapes;
    LucideIcons: typeof LucideIcons;
    Rough: typeof rough;
    RemotionGoogleFonts: RemotionGoogleFonts;
    IconifyIcon: typeof Icon;
    react?: typeof React;
    remotion?: typeof Remotion;
    __REMOTION_COMPONENT?: React.ComponentType<any>;
  }
}

export {};
