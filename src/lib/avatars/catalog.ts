/**
 * Avatar Catalog (single source of truth)
 * Builds canonical public URLs for avatar assets in R2.
 */

// Prefer NEXT_PUBLIC_ for client bundles; fall back to server env
const PUBLIC_BASE = (
  (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL))
  || (typeof window !== 'undefined' && (window as any).__R2_PUBLIC_URL)
  || ''
).replace(/\/$/, '');
const AVATARS_DIR = (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_AVATARS_BASE_DIR || process.env.AVATARS_BASE_DIR)) || 'Bazaar avatars';

const enc = (s: string) => s.split('/').map(encodeURIComponent).join('/');
const urlFor = (file: string) => `${PUBLIC_BASE}/${encodeURIComponent(AVATARS_DIR)}/${enc(file)}`;

// Canonical keys mapped to filenames (including spaces where applicable)
export const AVATAR_MAP: Record<string, string> = {
  // Primary 5
  'asian-woman': urlFor('asian-woman.png'),
  'black-man': urlFor('black-man.png'),
  'hispanic-man': urlFor('hispanic-man.png'),
  'middle-eastern-man': urlFor('middle-eastern-man.png'),
  'white-woman': urlFor('white-woman.png'),
  // Extended
  'jackatar': urlFor('Jackatar.png'),
  'markatar': urlFor('Markatar.png'),
  'downie': urlFor('downie.png'),
  'hotrussian': urlFor('hotrussian.png'),
  'hottie': urlFor('hottie.png'),
  'irish-guy': urlFor('irish guy.png'),
  'nigerian-princess': urlFor('nigerian princess.png'),
  'norway-girl': urlFor('norway girl.png'),
  'wise-ceo': urlFor('wise-ceo.png'),
  // Aliases (optional)
  'Jackatar': urlFor('Jackatar.png'),
  'Markatar': urlFor('Markatar.png'),
};

export const AVATAR_KEYS = Object.keys(AVATAR_MAP);

// Builder for custom bases (e.g., client override)
export function buildAvatarMap(baseUrl: string, dir: string = AVATARS_DIR): Record<string, string> {
  const enc = (s: string) => s.split('/').map(encodeURIComponent).join('/');
  const urlFor = (file: string) => `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(dir)}/${enc(file)}`;
  return {
    'asian-woman': urlFor('asian-woman.png'),
    'black-man': urlFor('black-man.png'),
    'hispanic-man': urlFor('hispanic-man.png'),
    'middle-eastern-man': urlFor('middle-eastern-man.png'),
    'white-woman': urlFor('white-woman.png'),
    'jackatar': urlFor('Jackatar.png'),
    'markatar': urlFor('Markatar.png'),
    'downie': urlFor('downie.png'),
    'hotrussian': urlFor('hotrussian.png'),
    'hottie': urlFor('hottie.png'),
    'irish-guy': urlFor('irish guy.png'),
    'nigerian-princess': urlFor('nigerian princess.png'),
    'norway-girl': urlFor('norway girl.png'),
    'wise-ceo': urlFor('wise-ceo.png'),
    'Jackatar': urlFor('Jackatar.png'),
    'Markatar': urlFor('Markatar.png'),
  };
}
