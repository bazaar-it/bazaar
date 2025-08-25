/**
 * UIRebuildSpec - The blueprint for pixel-perfect UI recreation
 * 
 * This is the conditional context that tells scene generators EXACTLY
 * what to rebuild and where. No guessing, no hallucination.
 */

export interface BBox {
  x: number;  // CSS px @ 1920 viewport
  y: number;
  w: number;
  h: number;
}

export interface Screenshot {
  id: string;                    // e.g., "full_v1920_dpr2_1756131793920"
  type: 'full' | 'section' | 'element';
  url: string;                   // R2 URL - ALWAYS populated
  widthPx: number;               // device pixels (e.g., 3840)
  heightPx: number;              // device pixels
  viewportCss: { w: number, h: number }; // CSS px used at capture (1920 default)
  dpr: number;                   // deviceScaleFactor used (2 default)
  // If this is a crop of another screenshot:
  parentId?: string;             
  cropCss?: BBox;                // in CSS px
  cropPx?: BBox;                 // in device px (separate type for clarity)
  digest: string;                // sha256 for immutability
}

// Layer types for the rebuild spec
export type UILayer = 
  | {
      kind: 'text';
      id: string;
      box: BBox;
      text: string;
      role?: 'headline' | 'subhead' | 'body' | 'stat';
      style: {
        fontFamily: string;
        fontSize: number;
        fontWeight: number;
        lineHeight: number;
        color: string;
        letterSpacing?: number;
      };
    }
  | {
      kind: 'button';
      id: string;
      box: BBox;
      label: string;
      href?: string;
      variant: 'filled' | 'outline' | 'ghost';
      style: {
        bg: string;
        text: string;
        radius: number;
        border?: string;
        shadow?: string;
      };
    }
  | {
      kind: 'card';
      id: string;
      box: BBox;
      radius: number;
      shadow?: string;
      bg: string;
      children: string[]; // layer ids contained
    }
  | {
      kind: 'icon';
      id: string;
      box: BBox;
      src: { type: 'svg' | 'img' | 'font-glyph'; ref: string };
      color?: string;
    }
  | {
      kind: 'image';
      id: string;
      box: BBox;
      src: { type: 'sprite'; ref: string }; // screenshot crop fallback
      fit: 'cover' | 'contain';
      radius?: number;
    }
  | {
      kind: 'chart';
      id: string;
      box: BBox;
      chartType: 'line' | 'bar' | 'area';
      series?: Array<{ name: string; points: number[] }>;
      palette?: string[];
    };

export interface UIRebuildSpec {
  sectionId: string;
  screenshotId: string;           // section crop (not full page)
  base: { width: 1920; height: number }; // px space used for coords
  grid?: { columns: 12; gutter: 24 };     // optional grid
  layers: UILayer[];
  zOrder: string[];               // layer ids in paint order
  styleHints?: { 
    spacingUnit?: number; 
    sectionBg?: string; 
    separators?: 'hairline' | 'none' 
  };
  evidence: { 
    screenshotId: string; 
    bbox: BBox;
  };
}

export interface AssetsPack {
  sectionId: string;
  svgs: Record<string, { svg: string; colorizable: boolean }>;
  images: Record<string, { url: string; w: number; h: number; alpha: boolean }>;
  glyphs: Record<string, { fontFamily: string; glyph: string; svg?: string }>;
}

// Scene generation output (compile-safe, not code yet)
export interface SceneCodePlan {
  meta: { 
    durationMs: number; 
    fps: 30; 
    base: { w: 1920; h: number };
  };
  imports: { 
    remotion: string[]; 
    local: string[]; 
    assets: string[] 
  };
  layers: Array<{
    kind: string;
    id: string;
    box: BBox;
    style?: any;
    anim?: Animation[];
    [key: string]: any;
  }>;
  zOrder: string[];
  animationsLibrary: 'minimal' | 'snappy' | 'smooth';
}

export interface Animation {
  type: 'fadeIn' | 'slideUp' | 'scaleIn' | 'slideRight' | 'countUp';
  startFrame: number;
  duration: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'spring';
  params?: Record<string, any>;
}

// Section definition for cropped areas
export interface ScreenshotSection {
  id: string;
  type: 'hero' | 'timeline' | 'features' | 'testimonials' | 'cta' | 'custom';
  bbox: BBox;                  // precise CSS coordinates
  description: string;
  keyElements: string[];
  suggestedDurationMs: number;
  screenshotId: string;        // section crop ID
  screenshotUrl: string;       // R2 URL for the cropped section
  confidence: number;
  evidence: SectionCrop;
}

export interface SectionCrop {
  screenshotId: string;        // ID for reference
  screenshotUrl: string;       // R2 URL - CRITICAL for add tool
  bbox: BBox;                  // CSS px in the full page
  widthPx: number; 
  heightPx: number; 
  dpr: number;
  parentId: string;            // full screenshot id
  digest: string;              // sha256 for cache-busting
}

// Coordinate helpers
export const toPx = (css: number, dpr = 2) => Math.round(css * dpr);
export const toCss = (px: number, dpr = 2) => px / dpr;

// Safe ID for JS variables
export const sanitizeId = (id: string): string => 
  id.replace(/[^a-zA-Z0-9]/g, '_').replace(/^[0-9]/, '_$&');

// Escape text for JSX
export const escapeJsx = (text: string): string => 
  text.replace(/[`${}]/g, '\\$&').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Convert CSS bbox to pixel bbox
export const bboxToPx = (bbox: BBox, dpr = 2): BBox => ({
  x: toPx(bbox.x, dpr),
  y: toPx(bbox.y, dpr),
  w: toPx(bbox.w, dpr),
  h: toPx(bbox.h, dpr),
});

// Convert pixel bbox to CSS bbox
export const bboxToCss = (bbox: BBox, dpr = 2): BBox => ({
  x: toCss(bbox.x, dpr),
  y: toCss(bbox.y, dpr),
  w: toCss(bbox.w, dpr),
  h: toCss(bbox.h, dpr),
});