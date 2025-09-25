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

export interface BrandSceneVariant {
  tsxCode: string;
  jsCode?: string;
  summary?: string;
  updatedAt: string;
}

export type BrandSceneStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface BrandSceneStatusEntry {
  status: BrandSceneStatus;
  summary?: string;
  message?: string;
  updatedAt: string;
}

export interface BrandThemeMeta {
  lastPreparedAt?: string;
  sceneStatuses?: Record<string, BrandSceneStatusEntry>;
}

export interface BrandThemeCopy {
  brand: {
    name: string;
    shortName?: string;
    tagline?: string;
    initial: string;
  };
  hero: {
    headline: string;
    subheadline?: string;
    tagline?: string;
    valueProp?: string;
  };
  ctas: {
    primary?: string;
    secondary?: string;
    additional: string[];
  };
  features: Array<{
    title: string;
    description?: string;
  }>;
  stats: {
    users?: string;
    rating?: string;
    reviews?: string;
  };
  statements: {
    problem?: string;
    solution?: string;
    mission?: string;
    vision?: string;
  };
  voice: {
    tone?: string;
    style?: string;
    adjectives: string[];
  };
  extras: Record<string, string>;
}

export type BrandThemeCopyOverrides = {
  brand?: {
    name?: string | null;
    shortName?: string | null;
    tagline?: string | null;
    initial?: string | null;
  };
  hero?: Partial<BrandThemeCopy['hero']>;
  ctas?: {
    primary?: string | null;
    secondary?: string | null;
    additional?: Array<string | null | undefined>;
  };
  features?: Array<{
    title?: string | null;
    description?: string | null;
  }>;
  stats?: Partial<BrandThemeCopy['stats']>;
  statements?: Partial<BrandThemeCopy['statements']>;
  voice?: {
    tone?: string | null;
    style?: string | null;
    adjectives?: Array<string | null | undefined>;
    keywords?: Array<string | null | undefined>;
  };
  extras?: Record<string, string | null | undefined>;
};

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
  copy: BrandThemeCopy;
  variants?: Record<string, BrandSceneVariant>;
  meta?: BrandThemeMeta;
}

export type BrandThemeOverrides = Partial<Omit<BrandTheme, "copy">> & {
  copy?: BrandThemeCopyOverrides | BrandThemeCopy;
};

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
  copy: {
    brand: {
      name: "Bazaar",
      shortName: "Bazaar",
      tagline: "AI-powered personalization",
      initial: "B",
    },
    hero: {
      headline: "Showcase your product with motion graphics",
      subheadline: "Bring your roadmap, funnels, and product value to life in minutes.",
      tagline: "Personalized product storytelling",
      valueProp: "Launch on-brand motion demos without editors or agencies.",
    },
    ctas: {
      primary: "Get started",
      secondary: "Book a demo",
      additional: [],
    },
    features: [
      {
        title: "Token-driven themes",
        description: "Swap palettes, fonts, and copy across variants instantly.",
      },
      {
        title: "Production ready exports",
        description: "Render MP4s, GIFs, and WebM in the cloud with audit trails.",
      },
    ],
    stats: {
      users: "1K+ teams",
      rating: "4.9/5 satisfaction",
      reviews: "Loved by design & GTM",
    },
    statements: {
      problem: "Teams waste hours customizing demos for every enterprise account.",
      solution: "Bazaar automates mass-personalized videos with deterministic tokens.",
      mission: "Help every team ship bespoke motion narratives in minutes.",
      vision: "A personalized product demo for every prospect, automatically.",
    },
    voice: {
      tone: "Confident",
      style: "Modern",
      adjectives: ["dynamic", "trusted", "elevated"],
    },
    extras: {},
  },
  variants: {},
  meta: {
    sceneStatuses: {},
  },
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
    headlines?: string[];
    subheadlines?: string[];
    tone?: string;
    style?: string;
    adjectives?: string[];
    keywords?: string[];
    hero?: {
      headline?: string;
      subheadline?: string;
      valueProp?: string;
    };
    features?: Array<{
      title?: string;
      description?: string;
    }>;
    stats?: {
      users?: string;
      rating?: string;
      reviews?: string;
    };
    statements?: {
      problem?: string;
      solution?: string;
      mission?: string;
      vision?: string;
    };
    brand?: {
      name?: string;
      shortName?: string;
      tagline?: string;
      initial?: string;
    };
    extras?: Record<string, string>;
  };
}

function normalizeText(value?: string | null): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    const coerced = String(value);
    return coerced.trim() ? coerced.trim() : undefined;
  }
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function dedupeStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

function deriveShortName(value?: string | null): string | undefined {
  const text = normalizeText(value);
  if (!text) return undefined;
  const tokens = text.split(/\s+/).filter(Boolean);
  return tokens[0] ?? undefined;
}

function extractHostname(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return undefined;
  }
}

function convertCtasRecord(record?: Record<string, string>): BrandThemeCopyOverrides['ctas'] {
  if (!record) {
    return {
      primary: undefined,
      secondary: undefined,
      additional: [],
    };
  }

  const entries = Object.entries(record)
    .map(([key, value]) => ({ key: key.toLowerCase(), value: normalizeText(value) }))
    .filter((entry) => Boolean(entry.value)) as Array<{ key: string; value: string }>;

  if (entries.length === 0) {
    return {
      primary: undefined,
      secondary: undefined,
      additional: [],
    };
  }

  const findByKeywords = (keywords: string[]): string | undefined => {
    const match = entries.find(({ key }) => keywords.some((keyword) => key.includes(keyword)));
    return match?.value;
  };

  const primary =
    findByKeywords(["primary", "hero", "main", "cta1", "cta_1", "cta-1"]) ?? entries[0]?.value;
  const secondary =
    findByKeywords(["secondary", "cta2", "cta_2", "cta-2", "alt"])
    ?? entries.find(({ value }) => value !== primary)?.value;

  const additional = entries
    .filter(({ value }) => value !== primary && value !== secondary)
    .map(({ value }) => value)
    .filter(Boolean);

  return {
    primary,
    secondary,
    additional,
  };
}

function convertFeaturesArray(
  features?: Array<{ title?: string | null; description?: string | null; desc?: string | null }> | null,
): BrandThemeCopyOverrides['features'] {
  if (!features || features.length === 0) {
    return undefined;
  }

  const normalized: Array<{ title?: string | null; description?: string | null }> = [];
  for (const feature of features) {
    const title = normalizeText(feature?.title) ?? normalizeText((feature as any)?.name);
    const description = normalizeText(feature?.description ?? feature?.desc);
    if (!title && !description) {
      continue;
    }
    normalized.push({ title: title ?? undefined, description: description ?? undefined });
  }

  return normalized.length > 0 ? normalized : undefined;
}

function convertStatsRecord(stats?: {
  users?: string | null;
  rating?: string | null;
  reviews?: string | null;
} | null): BrandThemeCopyOverrides['stats'] {
  if (!stats) return undefined;
  const users = normalizeText(stats.users);
  const rating = normalizeText(stats.rating);
  const reviews = normalizeText(stats.reviews);
  if (!users && !rating && !reviews) return undefined;
  return {
    users,
    rating,
    reviews,
  };
}

function convertStatementsRecord(statements?: {
  problem?: string | null;
  solution?: string | null;
  mission?: string | null;
  vision?: string | null;
} | null): BrandThemeCopyOverrides['statements'] {
  if (!statements) return undefined;
  const problem = normalizeText(statements.problem);
  const solution = normalizeText(statements.solution);
  const mission = normalizeText(statements.mission);
  const vision = normalizeText(statements.vision);
  if (!problem && !solution && !mission && !vision) return undefined;
  return {
    problem,
    solution,
    mission,
    vision,
  };
}

function convertVoiceDescriptor(voice?: {
  tone?: string | null;
  style?: string | null;
  adjectives?: string[] | null;
  keywords?: string[] | null;
} | null): BrandThemeCopyOverrides['voice'] {
  if (!voice) return undefined;
  const adjectiveSource = [
    ...(voice.adjectives ?? []),
    ...(voice.keywords ?? []),
  ];

  const tone = normalizeText(voice.tone);
  const style = normalizeText(voice.style);
  const adjectives = dedupeStrings(adjectiveSource).slice(0, 8);

  if (!tone && !style && adjectives.length === 0) {
    return undefined;
  }

  return {
    tone,
    style,
    adjectives: adjectives.length > 0 ? adjectives : undefined,
  };
}

function mergeCopy(
  base: BrandThemeCopy,
  override?: BrandThemeCopyOverrides | BrandThemeCopy,
): BrandThemeCopy {
  if (!override) {
    return base;
  }

  const overrideBrand = (override as any)?.brand ?? {};
  const overrideBrandName = normalizeText(overrideBrand?.name);
  const brandName = overrideBrandName ?? base.brand.name;
  const brandShortName = normalizeText(overrideBrand?.shortName)
    ?? overrideBrandName
    ?? base.brand.shortName
    ?? base.brand.name;
  const brandTagline = normalizeText(overrideBrand?.tagline) ?? base.brand.tagline;
  const overrideInitial = normalizeText(overrideBrand?.initial);
  const initialSource = overrideInitial ?? brandShortName ?? brandName ?? base.brand.initial;
  const brand: BrandThemeCopy['brand'] = {
    name: brandName,
    shortName: brandShortName ?? undefined,
    tagline: brandTagline ?? undefined,
    initial: (initialSource?.charAt(0) ?? base.brand.initial).toUpperCase(),
  };

  const heroOverride = (override.hero ?? {}) as Partial<BrandThemeCopy['hero']>;
  const hero: BrandThemeCopy['hero'] = {
    headline: normalizeText(heroOverride.headline) ?? base.hero.headline,
    subheadline: normalizeText(heroOverride.subheadline) ?? base.hero.subheadline,
    tagline: normalizeText(heroOverride.tagline) ?? base.hero.tagline,
    valueProp: normalizeText(heroOverride.valueProp) ?? base.hero.valueProp,
  };

  const ctasOverride = override.ctas;
  const ctasAdditional = Array.isArray(ctasOverride?.additional)
    ? ctasOverride.additional
        .map((value) => normalizeText(value ?? undefined))
        .filter((value): value is string => Boolean(value))
    : undefined;

  const ctas: BrandThemeCopy['ctas'] = {
    primary: normalizeText(ctasOverride?.primary ?? undefined) ?? base.ctas.primary,
    secondary: normalizeText(ctasOverride?.secondary ?? undefined) ?? base.ctas.secondary,
    additional:
      ctasOverride && Array.isArray(ctasOverride.additional)
        ? ctasAdditional ?? []
        : base.ctas.additional,
  };

  const featuresOverride = Array.isArray(override.features) ? override.features : undefined;
  let features = base.features;
  if (featuresOverride && featuresOverride.length > 0) {
    const sanitized: BrandThemeCopy['features'] = [];
    featuresOverride.forEach((feature, index) => {
      if (!feature) return;
      const baseFeature = base.features[index] ?? base.features[base.features.length - 1];
      const title = normalizeText(feature.title) ?? baseFeature?.title ?? brandName;
      const description = normalizeText(feature.description) ?? baseFeature?.description ?? undefined;
      sanitized.push({ title, description });
    });
    if (sanitized.length > 0) {
      features = [...sanitized];
      if (sanitized.length < base.features.length) {
        features = [...features, ...base.features.slice(sanitized.length)];
      }
    }
  }

  const statsOverride = override.stats;
  const stats: BrandThemeCopy['stats'] = {
    users: normalizeText(statsOverride?.users ?? undefined) ?? base.stats.users,
    rating: normalizeText(statsOverride?.rating ?? undefined) ?? base.stats.rating,
    reviews: normalizeText(statsOverride?.reviews ?? undefined) ?? base.stats.reviews,
  };

  const statementsOverride = override.statements;
  const statements: BrandThemeCopy['statements'] = {
    problem: normalizeText(statementsOverride?.problem ?? undefined) ?? base.statements.problem,
    solution: normalizeText(statementsOverride?.solution ?? undefined) ?? base.statements.solution,
    mission: normalizeText(statementsOverride?.mission ?? undefined) ?? base.statements.mission,
    vision: normalizeText(statementsOverride?.vision ?? undefined) ?? base.statements.vision,
  };

  const voiceOverride = override.voice;
  const voiceAdjectives = voiceOverride
    ? dedupeStrings([
        ...(voiceOverride.adjectives ?? []),
        ...(((voiceOverride as any).keywords as Array<string | null | undefined>) ?? []),
      ])
    : [];

  const voice: BrandThemeCopy['voice'] = {
    tone: normalizeText(voiceOverride?.tone ?? undefined) ?? base.voice.tone,
    style: normalizeText(voiceOverride?.style ?? undefined) ?? base.voice.style,
    adjectives: voiceAdjectives.length > 0 ? voiceAdjectives : base.voice.adjectives,
  };

  const extras: Record<string, string> = { ...base.extras };
  if (override.extras) {
    for (const [key, rawValue] of Object.entries(override.extras)) {
      if (rawValue === null) {
        delete extras[key];
        continue;
      }
      const normalized = normalizeText(rawValue ?? undefined);
      if (normalized) {
        extras[key] = normalized;
      }
    }
  }

  const mergedCopy: BrandThemeCopy = {
    brand,
    hero,
    ctas,
    features,
    stats,
    statements,
    voice,
    extras,
  };
  return finalizeCopy(mergedCopy);
}

function finalizeCopy(copy: BrandThemeCopy): BrandThemeCopy {
  const shortName = copy.brand.shortName ?? deriveShortName(copy.brand.name) ?? copy.brand.name;
  const initial = (copy.brand.initial || shortName || copy.brand.name || 'B').charAt(0).toUpperCase();
  return {
    ...copy,
    brand: {
      ...copy.brand,
      shortName: shortName ?? undefined,
      initial,
    },
  };
}

function deriveCopyFromVoice(voice?: BrandProfileLike['copyVoice']): BrandThemeCopyOverrides | undefined {
  if (!voice) return undefined;

  const result: BrandThemeCopyOverrides = {};

  const brandName = normalizeText(
    voice.brand?.name
      ?? voice.extras?.brandName
      ?? voice.hero?.headline
      ?? voice.taglines?.[0]
      ?? voice.headlines?.[0],
  );
  const brandShortName = normalizeText(
    voice.brand?.shortName
      ?? voice.extras?.brandShortName
      ?? brandName,
  );
  const brandTagline = normalizeText(
    voice.brand?.tagline
      ?? voice.extras?.brandTagline
      ?? voice.taglines?.[0],
  );
  const brandInitialSource = normalizeText(voice.brand?.initial)
    ?? brandShortName
    ?? brandName;
  if (brandName || brandShortName || brandTagline || brandInitialSource) {
    result.brand = {
      name: brandName ?? undefined,
      shortName: brandShortName ?? undefined,
      tagline: brandTagline ?? undefined,
      initial: brandInitialSource ? brandInitialSource.charAt(0).toUpperCase() : undefined,
    };
  }

  const hero: Record<string, string> = {};
  const headline =
    normalizeText(voice.hero?.headline)
    ?? normalizeText(voice.headlines?.[0])
    ?? normalizeText(voice.taglines?.[0]);
  if (headline) hero.headline = headline;

  const subheadline =
    normalizeText(voice.hero?.subheadline)
    ?? normalizeText(voice.subheadlines?.[0])
    ?? normalizeText(voice.headlines?.[1]);
  if (subheadline) hero.subheadline = subheadline;

  const tagline = normalizeText(voice.taglines?.[0]);
  if (tagline) hero.tagline = tagline;

  const valueProp =
    normalizeText(voice.hero?.valueProp)
    ?? normalizeText(voice.statements?.solution)
    ?? normalizeText(voice.taglines?.[1]);
  if (valueProp) hero.valueProp = valueProp;

  if (Object.keys(hero).length > 0) {
    result.hero = hero;
  }

  const ctas = convertCtasRecord(voice.ctas);
  if (ctas && (ctas.primary || ctas.secondary || (ctas.additional && ctas.additional.length > 0))) {
    result.ctas = ctas;
  }

  const features = convertFeaturesArray(voice.features);
  if (features) {
    result.features = features;
  }

  const stats = convertStatsRecord(voice.stats);
  if (stats) {
    result.stats = stats;
  }

  const statements = convertStatementsRecord(voice.statements);
  if (statements) {
    result.statements = statements;
  }

  const voiceMeta = convertVoiceDescriptor({
    tone: voice.tone,
    style: voice.style,
    adjectives: voice.adjectives,
    keywords: voice.keywords,
  });
  if (voiceMeta) {
    result.voice = voiceMeta;
  }

  if (voice.extras) {
    const sanitizedExtras: Record<string, string> = {};
    for (const [key, value] of Object.entries(voice.extras)) {
      const normalized = normalizeText(value);
      if (normalized) {
        sanitizedExtras[key] = normalized;
      }
    }
    if (Object.keys(sanitizedExtras).length > 0) {
      result.extras = sanitizedExtras;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function deriveCopyFromLegacyRecord(record: Record<string, string>): BrandThemeCopyOverrides {
  const entries = Object.entries(record)
    .map(([key, value]) => ({ key: key.toLowerCase(), value: normalizeText(value) }))
    .filter((entry) => Boolean(entry.value)) as Array<{ key: string; value: string }>;

  if (entries.length === 0) {
    return {};
  }

  const pick = (...keywords: string[]) => {
    const match = entries.find((entry) => keywords.some((keyword) => entry.key.includes(keyword)));
    return match?.value;
  };

  const result: BrandThemeCopyOverrides = {};
  const brandName = pick('brand', 'company', 'name', 'title', 'product');
  const brandShortName = pick('shortname', 'abbr', 'short', 'code');
  const brandTagline = pick('brand_tagline', 'brandtagline', 'slogan', 'tagline');
  const brandInitial = pick('initial', 'initials');
  if (brandName || brandShortName || brandTagline || brandInitial) {
    result.brand = {
      name: brandName ?? undefined,
      shortName: brandShortName ?? brandName ?? undefined,
      tagline: brandTagline ?? undefined,
      initial: (brandInitial ?? brandShortName ?? brandName)?.charAt(0).toUpperCase() ?? undefined,
    };
  }

  const hero: Record<string, string> = {};
  const headline = pick('hero_headline', 'headline', 'title');
  if (headline) hero.headline = headline;
  const subheadline = pick('hero_sub', 'subheadline', 'subtitle');
  if (subheadline) hero.subheadline = subheadline;
  const tagline = pick('tagline');
  if (tagline) hero.tagline = tagline;
  const valueProp = pick('value_prop', 'valueprop', 'value', 'benefit');
  if (valueProp) hero.valueProp = valueProp;
  if (Object.keys(hero).length > 0) {
    result.hero = hero;
  }

  const ctaEntries: Record<string, string> = {};
  entries
    .filter((entry) => entry.key.includes('cta') || entry.key.includes('button'))
    .forEach((entry, index) => {
      ctaEntries[entry.key || `cta_${index + 1}`] = entry.value;
    });
  const ctas = convertCtasRecord(ctaEntries);
  if (ctas && (ctas.primary || ctas.secondary || (ctas.additional && ctas.additional.length > 0))) {
    result.ctas = ctas;
  }

  const stats = convertStatsRecord({
    users: pick('users', 'customers'),
    rating: pick('rating', 'score'),
    reviews: pick('reviews', 'testimonials'),
  });
  if (stats) {
    result.stats = stats;
  }

  const statements = convertStatementsRecord({
    problem: pick('problem'),
    solution: pick('solution'),
    mission: pick('mission'),
    vision: pick('vision'),
  });
  if (statements) {
    result.statements = statements;
  }

  const adjectivesRaw = pick('adjectives', 'keywords');
  const tone = pick('tone');
  const style = pick('style', 'voice');
  const voice = convertVoiceDescriptor({
    tone,
    style,
    adjectives: adjectivesRaw ? adjectivesRaw.split(/[;,]/) : undefined,
    keywords: undefined,
  });
  if (voice) {
    result.voice = voice;
  }

  const handledKeywords = new Set([
    'hero',
    'headline',
    'title',
    'subheadline',
    'subtitle',
    'tagline',
    'value',
    'cta',
    'button',
    'brand',
    'company',
    'name',
    'product',
    'shortname',
    'abbr',
    'short',
    'code',
    'brand_tagline',
    'brandtagline',
    'slogan',
    'initial',
    'initials',
    'users',
    'customers',
    'rating',
    'score',
    'review',
    'testimonial',
    'problem',
    'solution',
    'mission',
    'vision',
    'tone',
    'style',
    'voice',
    'adjective',
    'keyword',
  ]);

  const extrasEntries: Array<[string, string]> = [];
  entries.forEach((entry) => {
    const matchesHandled = Array.from(handledKeywords).some((keyword) => entry.key.includes(keyword));
    if (!matchesHandled && entry.value) {
      extrasEntries.push([entry.key, entry.value]);
    }
  });
  if (extrasEntries.length > 0) {
    result.extras = Object.fromEntries(extrasEntries);
  }

  return result;
}

export function ensureBrandThemeCopy(
  copyLike?: BrandThemeCopy | BrandThemeCopyOverrides | Record<string, string> | null,
): BrandThemeCopy {
  if (!copyLike) {
    return DEFAULT_BRAND_THEME.copy;
  }

  if (
    typeof copyLike === 'object'
    && (
      'brand' in copyLike
      ||
      'hero' in copyLike
      || 'ctas' in copyLike
      || 'features' in copyLike
      || 'stats' in copyLike
      || 'statements' in copyLike
      || 'voice' in copyLike
      || 'extras' in copyLike
    )
  ) {
    return mergeCopy(DEFAULT_BRAND_THEME.copy, copyLike as BrandThemeCopyOverrides | BrandThemeCopy);
  }

  if (typeof copyLike === 'object') {
    return mergeCopy(
      DEFAULT_BRAND_THEME.copy,
      deriveCopyFromLegacyRecord(copyLike as Record<string, string>),
    );
  }

  return DEFAULT_BRAND_THEME.copy;
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
  overrides?: BrandThemeOverrides,
): BrandTheme {
  if (!profile) {
    const copy = mergeCopy(DEFAULT_BRAND_THEME.copy, overrides?.copy);

    return {
      ...DEFAULT_BRAND_THEME,
      ...overrides,
      colors: {
        ...DEFAULT_BRAND_THEME.colors,
        ...(overrides?.colors ?? {}),
      },
      fonts: {
        heading: resolveFont(overrides?.fonts?.heading, DEFAULT_BRAND_THEME.fonts.heading),
        body: resolveFont(overrides?.fonts?.body, DEFAULT_BRAND_THEME.fonts.body),
        mono: overrides?.fonts?.mono
          ? resolveFont(
              overrides.fonts.mono,
              DEFAULT_BRAND_THEME.fonts.mono ?? {
                family: "IBM Plex Mono",
                weights: [400],
              },
            )
          : DEFAULT_BRAND_THEME.fonts.mono,
      },
      assets: {
        ...DEFAULT_BRAND_THEME.assets,
        ...(overrides?.assets ?? {}),
      },
      iconography: {
        ...DEFAULT_BRAND_THEME.iconography,
        ...(overrides?.iconography ?? {}),
      },
      backgroundEffects: overrides?.backgroundEffects ?? DEFAULT_BRAND_THEME.backgroundEffects,
      motion: {
        ...DEFAULT_BRAND_THEME.motion,
        ...(overrides?.motion ?? {}),
      },
      copy,
      variants: overrides?.variants ?? DEFAULT_BRAND_THEME.variants,
      meta: overrides?.meta ?? DEFAULT_BRAND_THEME.meta,
    };
  }

  const primaryFont = profile.typography?.fonts?.find((font) => font.role === "heading")
    ?? profile.typography?.fonts?.[0];
  const bodyFont = profile.typography?.fonts?.find((font) => font.role === "body")
    ?? profile.typography?.fonts?.[1];
  const monoFont = profile.typography?.fonts?.find((font) => font.role === "mono");

  const voiceCopy = deriveCopyFromVoice(profile.copyVoice);
  const baseCopy = mergeCopy(DEFAULT_BRAND_THEME.copy, voiceCopy);

  const theme: BrandTheme = {
    name:
      overrides?.name
      ?? normalizeText((profile.copyVoice?.extras ?? {}).brandName)
      ?? normalizeText(profile.copyVoice?.hero?.headline)
      ?? normalizeText(profile.copyVoice?.taglines?.[0]),
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
    copy: baseCopy,
    variants: (overrides?.variants as Record<string, BrandSceneVariant>)
      ?? (profile as any)?.variants
      ?? DEFAULT_BRAND_THEME.variants,
    meta: overrides?.meta
      ?? (profile as any)?.meta
      ?? DEFAULT_BRAND_THEME.meta,
  };

  return {
    ...theme,
    ...overrides,
    colors: {
      ...theme.colors,
      ...(overrides?.colors ?? {}),
    },
    fonts: {
      heading: resolveFont(overrides?.fonts?.heading, theme.fonts.heading),
      body: resolveFont(overrides?.fonts?.body, theme.fonts.body),
      mono: overrides?.fonts?.mono
        ? resolveFont(
            overrides.fonts.mono,
            theme.fonts.mono ?? DEFAULT_BRAND_THEME.fonts.mono ?? {
              family: "IBM Plex Mono",
              weights: [400],
            },
          )
        : theme.fonts.mono,
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
    copy: mergeCopy(theme.copy, overrides?.copy),
    variants: overrides?.variants ?? theme.variants,
    meta: overrides?.meta ?? theme.meta,
  };
}

export function createBrandThemeFromExtraction(
  extraction?: SimplifiedBrandData | null,
  overrides?: BrandThemeOverrides,
): BrandTheme {
  if (!extraction) {
    return createBrandThemeFromProfile(undefined, overrides);
  }

  const colors = extraction.brand?.colors ?? {};
  const typography = extraction.brand?.typography ?? {};
  const fonts = typography.fonts ?? [];

  const extractedBrandName = normalizeText(extraction.brand?.identity?.name)
    ?? normalizeText(extraction.page?.title)
    ?? normalizeText(extraction.page?.url);
  const extractedBrandShortName =
    deriveShortName(extraction.brand?.identity?.name)
    ?? deriveShortName(extraction.page?.title)
    ?? deriveShortName(extractHostname(extraction.page?.url));
  const extractedBrandTagline = normalizeText(
    extraction.brand?.identity?.tagline
      ?? extraction.product?.value_prop?.headline
      ?? extraction.page?.description,
  );
  const extractedBrandInitialSource = normalizeText((extraction.brand?.identity as any)?.acronym)
    ?? extractedBrandShortName
    ?? extractedBrandName;
  const extractedBrandInitial = (extractedBrandInitialSource?.charAt(0) ?? 'B').toUpperCase();

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
        family: normalizeText(font.family) ?? DEFAULT_BRAND_THEME.fonts.body.family,
        weights: Array.isArray(font.weights) && font.weights.length > 0 ? font.weights : [400, 600],
        fallback: normalizeText((font as any)?.fallback),
        role: (font as any)?.role ?? (index === 0 ? "heading" : index === 1 ? "body" : undefined),
      })),
    },
    logo: (extraction.brand as any)?.logo ?? undefined,
    iconography: extraction.brand?.iconography,
    backgroundEffects: extraction.brand?.backgroundEffects,
    copyVoice: {
      brand: {
        name: extractedBrandName ?? undefined,
        shortName: extractedBrandShortName ?? extractedBrandName ?? undefined,
        tagline: extractedBrandTagline ?? undefined,
        initial: extractedBrandInitial,
      },
      hero: {
        headline:
          extraction.product?.value_prop?.headline
          ?? extraction.brand?.identity?.tagline
          ?? extraction.page?.title,
        subheadline:
          extraction.product?.value_prop?.subhead
          ?? extraction.page?.description,
        valueProp:
          extraction.product?.value_prop?.subhead
          ?? extraction.product?.value_prop?.headline,
      },
      taglines: Array.isArray(extraction.brand?.voice?.taglines)
        ? extraction.brand?.voice?.taglines
        : extraction.brand?.identity?.tagline
          ? [extraction.brand.identity.tagline]
          : [],
      headlines: Array.isArray(extraction.page?.headings) ? extraction.page?.headings : undefined,
      tone: extraction.brand?.voice?.tone,
      style: (extraction.brand?.voice as any)?.style
        ?? extraction.brand?.voice?.personality
        ?? extraction.brand?.identity?.archetype,
      adjectives: Array.isArray(extraction.brand?.voice?.adjectives)
        ? extraction.brand?.voice?.adjectives
        : Array.isArray(extraction.brand?.voice?.keywords)
          ? extraction.brand?.voice?.keywords
          : undefined,
      features: Array.isArray(extraction.product?.features)
        ? extraction.product?.features.map((feature) => ({
            title: (feature as any)?.title ?? (feature as any)?.name ?? undefined,
            description: (feature as any)?.desc ?? (feature as any)?.description ?? undefined,
          }))
        : undefined,
      stats: extraction.social_proof?.stats,
      statements: {
        problem: extraction.product?.problem,
        solution: extraction.product?.solution,
        mission: extraction.brand?.identity?.mission,
        vision: extraction.brand?.identity?.vision,
      },
      ctas: (() => {
        if (!Array.isArray(extraction.ctas)) {
          return undefined;
        }
        const record = extraction.ctas.reduce<Record<string, string>>((acc, cta, idx) => {
          const label = normalizeText(cta?.label);
          if (!label) {
            return acc;
          }
          const key = cta?.type
            ? `cta_${String(cta.type).toLowerCase()}`
            : idx === 0
              ? 'primary'
              : idx === 1
                ? 'secondary'
                : `cta_${idx + 1}`;
          if (!acc[key]) {
            acc[key] = label;
          }
          return acc;
        }, {});
        return Object.keys(record).length > 0 ? record : undefined;
      })(),
      extras: {
        pageTitle: extraction.page?.title ?? '',
        pageDescription: extraction.page?.description ?? '',
        brandName: extractedBrandName ?? '',
        brandShortName: extractedBrandShortName ?? '',
        brandTagline: extractedBrandTagline ?? '',
        brandInitial: extractedBrandInitial,
      },
    },
  };

  return createBrandThemeFromProfile(profileLike, {
    name: extraction.page?.title ?? extraction.page?.url,
    assets: {
      ...DEFAULT_BRAND_THEME.assets,
      ...(overrides?.assets ?? {}),
      logo: (extraction.brand as any)?.logo ?? overrides?.assets?.logo ?? DEFAULT_BRAND_THEME.assets.logo,
      heroImage: extraction.media?.screenshots?.[0]?.url
        ?? overrides?.assets?.heroImage
        ?? DEFAULT_BRAND_THEME.assets.heroImage,
    },
    meta: {
      sceneStatuses: {},
      ...(overrides?.meta ?? {}),
    },
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
