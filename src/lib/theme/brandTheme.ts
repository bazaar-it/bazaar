import type { StaticImageData } from "next/image";

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
