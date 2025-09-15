// src/lib/avatars/avatarRegistry.ts
import { AVATAR_MAP, AVATAR_KEYS, buildAvatarMap } from '~/lib/avatars/catalog';

export interface AvatarAsset {
  id: string;
  name: string;
  url: string;
  description?: string;
}

const toTitle = (id: string) => id
  .replace(/-/g, ' ')
  .replace(/\b\w/g, (m) => m.toUpperCase());

function resolveMap(): Record<string, string> {
  const base = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL;
  const dir = process.env.NEXT_PUBLIC_AVATARS_BASE_DIR || process.env.AVATARS_BASE_DIR || 'Bazaar avatars';
  return base ? buildAvatarMap(base, dir) : AVATAR_MAP;
}

const MAP = resolveMap();

function fallbackUrl(id: string): string {
  const base = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL;
  const dir = process.env.NEXT_PUBLIC_AVATARS_BASE_DIR || process.env.AVATARS_BASE_DIR || 'Bazaar avatars';
  if (!base) return '';
  const enc = (s: string) => s.split('/').map(encodeURIComponent).join('/');
  return `${base}/${encodeURIComponent(dir)}/${enc(id)}.png`;
}

export const AVATAR_REGISTRY: AvatarAsset[] = AVATAR_KEYS.map((id) => ({
  id,
  name: toTitle(id),
  url: MAP[id] ?? fallbackUrl(id),
}));

export const getAvatarById = (id: string): AvatarAsset | undefined => AVATAR_REGISTRY.find(a => a.id === id);
export const getAllAvatars = (): AvatarAsset[] => AVATAR_REGISTRY;
export const getRandomAvatar = (): AvatarAsset => AVATAR_REGISTRY[Math.floor(Math.random() * AVATAR_REGISTRY.length)]!;
