import type { StaticImageData } from "next/image";
import type { SimplifiedBrandData } from "~/tools/webAnalysis/brandDataAdapter";

export interface FontSpec {
  family: string;
  weights: number[];
  fallback?: string;
}

export interface LogoSet {
  light?: string;
  dark?: string;
  monochrome?: string;
  favicon?: string;
  ogImage?: string;
}

export interface BrandTheme {
  name?: string;
  colors: {
    primary: string;
    secondary: string;
    accents: string[];
    background: string;
    textDefault: string;
    highlight?: string;
    neutrals?: string[];
  };
  fonts: {
    heading: FontSpec;
    body: FontSpec;
    mono?: FontSpec;
  };
  assets: {
    logo?: LogoSet;
    productShots?: string[];
    heroImage?: string | StaticImageData;
  };
  iconography?: {
    style?: "line" | "solid" | "duotone" | "mixed";
    detectedIcons?: string[];
  };
  backgroundEffects?: string[];
  motion?: {
    speedScale?: number;
    easings?: string[];
  };
  copy?: Record<string, string>;
}

export const DEFAULT_BRAND_THEME: BrandTheme = {
  name: "Default",
  colors: {
    primary: "#2563EB",
    secondary: "#1E293B",
    accents: ["#38BDF8", "#22D3EE"],
    background: "#F8FAFC",
    textDefault: "#0F172A",
    neutrals: ["#F8FAFC", "#E2E8F0", "#0F172A"],
  },
  fonts: {
    heading: {
      family: "Inter",
      weights: [600, 700],
      fallback: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    body: {
      family: "Inter",
      weights: [400, 500],
      fallback: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    mono: {
      family: "IBM Plex Mono",
      weights: [400, 500],
    },
  },
  assets: {},
  iconography: {
    style: "line",
    detectedIcons: [],
  },
  backgroundEffects: [],
  motion: {
    speedScale: 1,
    easings: ["easeOut"],
  },
  copy: {},
};

export interface BrandProfileLike {
  colors?: {
    primary?: string;
    secondary?: string;
    accents?: string[];
    neutrals?: string[];
    background?: string;
    text?: {
      default?: string;
    };
  };
  typography?: {
    fonts?: Array<{
      family?: string;
      weights?: number[];
      fallback?: string;
      role?: "heading" | "body" | "mono";
    }>;
  };
  logo?: LogoSet;
  iconography?: {
    style?: "line" | "solid" | "duotone" | "mixed";
    detectedIcons?: string[];
  };
  imageryStyle?: string[];
  backgroundEffects?: string[];
  copyVoice?: {
    ctas?: Record<string, string>;
    taglines?: string[];
  };
}

function resolveFont(fonts: FontSpec | undefined, fallback: FontSpec): FontSpec {
  return {
    family: fonts?.family?.trim() || fallback.family,
    weights: fonts?.weights?.length ? fonts.weights : fallback.weights,
    fallback: fonts?.fallback || fallback.fallback,
  };
}

export function createBrandThemeFromProfile(
  profile?: BrandProfileLike | null,
  overrides?: Partial<BrandTheme>,
): BrandTheme {
  if (!profile) {
    return {
      ...DEFAULT_BRAND_THEME,
      ...overrides,
      colors: {
        ...DEFAULT_BRAND_THEME.colors,
        ...(overrides?.colors ?? {}),
      },
      fonts: {
        ...DEFAULT_BRAND_THEME.fonts,
        ...(overrides?.fonts ?? {}),
      },
      assets: {
        ...DEFAULT_BRAND_THEME.assets,
        ...(overrides?.assets ?? {}),
      },
    };
  }

  const primaryFont = profile.typography?.fonts?.find((font) => font.role === "heading")
    ?? profile.typography?.fonts?.[0];
  const bodyFont = profile.typography?.fonts?.find((font) => font.role === "body")
    ?? profile.typography?.fonts?.[1];
  const monoFont = profile.typography?.fonts?.find((font) => font.role === "mono");

  const theme: BrandTheme = {
    name: overrides?.name,
    colors: {
      primary: profile.colors?.primary ?? DEFAULT_BRAND_THEME.colors.primary,
      secondary: profile.colors?.secondary ?? DEFAULT_BRAND_THEME.colors.secondary,
      accents: profile.colors?.accents?.length
        ? profile.colors.accents
        : DEFAULT_BRAND_THEME.colors.accents,
      background: profile.colors?.background ?? DEFAULT_BRAND_THEME.colors.background,
      textDefault: profile.colors?.text?.default ?? DEFAULT_BRAND_THEME.colors.textDefault,
      neutrals: profile.colors?.neutrals ?? DEFAULT_BRAND_THEME.colors.neutrals,
      highlight: DEFAULT_BRAND_THEME.colors.highlight,
    },
    fonts: {
      heading: resolveFont(
        primaryFont && {
          family: primaryFont.family ?? DEFAULT_BRAND_THEME.fonts.heading.family,
          weights: primaryFont.weights ?? DEFAULT_BRAND_THEME.fonts.heading.weights,
          fallback: primaryFont.fallback,
        },
        DEFAULT_BRAND_THEME.fonts.heading,
      ),
      body: resolveFont(
        bodyFont && {
          family: bodyFont.family ?? DEFAULT_BRAND_THEME.fonts.body.family,
          weights: bodyFont.weights ?? DEFAULT_BRAND_THEME.fonts.body.weights,
          fallback: bodyFont.fallback,
        },
        DEFAULT_BRAND_THEME.fonts.body,
      ),
      mono: monoFont
        ? resolveFont(
            {
              family: monoFont.family ?? DEFAULT_BRAND_THEME.fonts.mono?.family ?? "IBM Plex Mono",
              weights: monoFont.weights ?? DEFAULT_BRAND_THEME.fonts.mono?.weights ?? [400],
              fallback: monoFont.fallback,
            },
            DEFAULT_BRAND_THEME.fonts.mono ?? {
              family: "IBM Plex Mono",
              weights: [400],
            },
          )
        : DEFAULT_BRAND_THEME.fonts.mono,
    },
    assets: {
      logo: profile.logo ?? DEFAULT_BRAND_THEME.assets.logo,
      productShots: DEFAULT_BRAND_THEME.assets.productShots,
      heroImage: DEFAULT_BRAND_THEME.assets.heroImage,
    },
    iconography: profile.iconography ?? DEFAULT_BRAND_THEME.iconography,
    backgroundEffects: profile.backgroundEffects ?? DEFAULT_BRAND_THEME.backgroundEffects,
    motion: DEFAULT_BRAND_THEME.motion,
    copy: profile.copyVoice?.ctas ?? DEFAULT_BRAND_THEME.copy,
  };

  return {
    ...theme,
    ...overrides,
    colors: {
      ...theme.colors,
      ...(overrides?.colors ?? {}),
    },
    fonts: {
      ...theme.fonts,
      ...(overrides?.fonts ?? {}),
    },
    assets: {
      ...theme.assets,
      ...(overrides?.assets ?? {}),
    },
    iconography: {
      ...theme.iconography,
      ...(overrides?.iconography ?? {}),
    },
    backgroundEffects: overrides?.backgroundEffects ?? theme.backgroundEffects,
    motion: {
      ...theme.motion,
      ...(overrides?.motion ?? {}),
    },
    copy: {
      ...theme.copy,
      ...(overrides?.copy ?? {}),
    },
  };
}

export function createBrandThemeFromExtraction(
  extraction?: SimplifiedBrandData | null,
  overrides?: Partial<BrandTheme>,
): BrandTheme {
  if (!extraction) {
    return createBrandThemeFromProfile(undefined, overrides);
  }

  const colors = extraction.brand?.colors ?? {};
  const typography = extraction.brand?.typography ?? {};
  const fonts = typography.fonts ?? [];

  const primaryColor = normalizeColorValue(colors.primary) ?? DEFAULT_BRAND_THEME.colors.primary;
  const secondaryColor = normalizeColorValue(colors.secondary) ?? DEFAULT_BRAND_THEME.colors.secondary;
  const backgroundColor = normalizeColorValue(colors.background)
    ?? normalizeColorValue(colors.neutrals?.[0])
    ?? secondaryColor
    ?? DEFAULT_BRAND_THEME.colors.background;
  const textDefault = normalizeColorValue(colors?.text?.default)
    ?? normalizeColorValue(colors.neutrals?.[colors.neutrals.length - 1])
    ?? DEFAULT_BRAND_THEME.colors.textDefault;

  const accentCandidates: string[] = [];
  if (Array.isArray(colors.accents)) {
    accentCandidates.push(...colors.accents);
  }
  if (Array.isArray(colors.palette)) {
    colors.palette.forEach((entry: any) => {
      if (!entry) return;
      if (typeof entry === "string") {
        accentCandidates.push(entry);
      } else if (typeof entry.hex === "string") {
        accentCandidates.push(entry.hex);
      }
    });
  }

  const sanitizedAccents = accentCandidates
    .map((value) => normalizeColorValue(value))
    .filter((value): value is string => Boolean(value))
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 4);

  const sanitizedNeutrals = Array.isArray(colors.neutrals)
    ? colors.neutrals
        .map((value) => normalizeColorValue(value))
        .filter((value): value is string => Boolean(value))
    : undefined;

  const profileLike: BrandProfileLike = {
    colors: {
      primary: primaryColor,
      secondary: secondaryColor,
      accents: sanitizedAccents,
      neutrals: sanitizedNeutrals,
      background: backgroundColor,
      text: {
        default: textDefault,
      },
    },
    typography: {
      fonts: fonts.map((font, index) => ({
        family: font.family,
        weights: font.weights ?? [400, 600],
        role: index === 0 ? "heading" : index === 1 ? "body" : undefined,
      })),
    },
    logo: extraction.brand?.logo,
    iconography: extraction.brand?.iconography,
    backgroundEffects: extraction.brand?.backgroundEffects,
    copyVoice: extraction.brand?.voice
      ? {
          ctas: Array.isArray(extraction.ctas)
            ? extraction.ctas.reduce<Record<string, string>>((acc, cta, idx) => {
                const label = typeof cta?.label === "string" ? cta.label : `CTA ${idx + 1}`;
                acc[`cta_${idx + 1}`] = label;
                return acc;
              }, {})
            : {},
          taglines: Array.isArray(extraction.brand.voice?.taglines)
            ? extraction.brand.voice.taglines
            : [],
        }
      : undefined,
  };

  return createBrandThemeFromProfile(profileLike, {
    name: extraction.page?.title ?? extraction.page?.url,
    ...overrides,
  });
}

function normalizeColorValue(input?: string | null): string | undefined {
  if (!input) return undefined;
  const value = input.trim();
  if (!value || value.toLowerCase() === "transparent") {
    return undefined;
  }

  if (value.startsWith("#")) {
    const hex = value.replace(/[^0-9a-fA-F]/g, "");
    if (hex.length === 3) {
      return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toUpperCase();
    }
    if (hex.length === 4) {
      return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toUpperCase();
    }
    if (hex.length === 6 || hex.length === 8) {
      return `#${hex.slice(0, 6)}`.toUpperCase();
    }
    return undefined;
  }

  const rgbMatch = value.match(/^rgba?\((.*)\)$/i);
  if (rgbMatch) {
    const channels = rgbMatch[1]
      .replace(/\//g, " ")
      .split(/[,\s]+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((part) => parseFloat(part));
    if (channels.length === 3 && channels.every((channel) => Number.isFinite(channel))) {
      const [r, g, b] = channels.map((channel) => clamp(Math.round(channel), 0, 255));
      return toHex(r, g, b);
    }
  }

  const oklchMatch = value.match(/^oklch\((.*)\)$/i);
  if (oklchMatch) {
    const converted = oklchToHex(oklchMatch[1]);
    if (converted) return converted;
  }

  const oklabMatch = value.match(/^oklab\((.*)\)$/i);
  if (oklabMatch) {
    const converted = oklabToHex(oklabMatch[1]);
    if (converted) return converted;
  }

  return undefined;
}

function oklchToHex(componentString: string): string | undefined {
  const parts = componentString.split("/");
  const main = parts[0] ?? "";
  const tokens = main.trim().split(/\s+/);
  if (tokens.length < 3) return undefined;

  const lToken = tokens[0];
  const cToken = tokens[1];
  const hToken = tokens[2];

  const L = parseComponent(lToken, true);
  const C = parseComponent(cToken, false);
  const H = parseComponent(hToken, false);

  if (L === undefined || C === undefined || H === undefined) {
    return undefined;
  }

  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  return oklabChannelsToHex(L, a, b);
}

function oklabToHex(componentString: string): string | undefined {
  const parts = componentString.split("/");
  const tokens = parts[0]?.trim().split(/\s+/) ?? [];
  if (tokens.length < 3) return undefined;

  const L = parseComponent(tokens[0], true);
  const a = parseComponent(tokens[1], false);
  const b = parseComponent(tokens[2], false);

  if (L === undefined || a === undefined || b === undefined) {
    return undefined;
  }

  return oklabChannelsToHex(L, a, b);
}

function oklabChannelsToHex(L: number, a: number, b: number): string | undefined {
  const l_ = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m_ = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s_ = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);

  let r = +4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
  let g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
  let bChannel = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_;

  r = linearToSrgb(r);
  g = linearToSrgb(g);
  bChannel = linearToSrgb(bChannel);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(bChannel)) {
    return undefined;
  }

  return toHex(Math.round(clamp(r * 255, 0, 255)), Math.round(clamp(g * 255, 0, 255)), Math.round(clamp(bChannel * 255, 0, 255)));
}

function linearToSrgb(value: number): number {
  if (value <= 0.0031308) {
    return clamp(12.92 * value, 0, 1);
  }
  return clamp(1.055 * Math.pow(value, 1 / 2.4) - 0.055, 0, 1);
}

function toHex(r: number, g: number, b: number): string {
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`.toUpperCase();
}

function channelToHex(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

function parseComponent(token: string, allowPercentage: boolean): number | undefined {
  const trimmed = token.trim();
  if (!trimmed) return undefined;

  if (allowPercentage && trimmed.endsWith("%")) {
    const numeric = parseFloat(trimmed.slice(0, -1));
    if (!Number.isFinite(numeric)) return undefined;
    return clamp(numeric / 100, 0, 1);
  }

  const numeric = parseFloat(trimmed);
  if (!Number.isFinite(numeric)) return undefined;
  return numeric;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
