import crypto from 'crypto';

import { uploadBufferToR2 } from '~/lib/utils/r2-upload';

const DEFAULT_TIMEOUT_MS = 10000;

function extFromContentType(ct: string | null): string {
  if (!ct) return 'bin';
  if (ct.includes('svg')) return 'svg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('gif')) return 'gif';
  return 'bin';
}

function guessFromBuffer(buf: Buffer): { ct: string; ext: string } | null {
  // PNG
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { ct: 'image/png', ext: 'png' };
  }
  // JPEG
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8) {
    return { ct: 'image/jpeg', ext: 'jpg' };
  }
  // GIF
  if (buf.length >= 6 && buf.slice(0, 6).toString('ascii').startsWith('GIF8')) {
    return { ct: 'image/gif', ext: 'gif' };
  }
  // WEBP (RIFF....WEBP)
  if (buf.length >= 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') {
    return { ct: 'image/webp', ext: 'webp' };
  }
  // SVG
  const head = buf.slice(0, Math.min(256, buf.length)).toString('utf8').toLowerCase();
  if (head.includes('<svg')) {
    return { ct: 'image/svg+xml', ext: 'svg' };
  }
  return null;
}

function guessFromUrlPath(pathname: string): { ct: string; ext: string } | null {
  const lower = pathname.toLowerCase();
  if (lower.endsWith('.png')) return { ct: 'image/png', ext: 'png' };
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return { ct: 'image/jpeg', ext: 'jpg' };
  if (lower.endsWith('.gif')) return { ct: 'image/gif', ext: 'gif' };
  if (lower.endsWith('.webp')) return { ct: 'image/webp', ext: 'webp' };
  if (lower.endsWith('.svg')) return { ct: 'image/svg+xml', ext: 'svg' };
  return null;
}

function sanitizeConcatenatedR2Url(urlStr: string): string {
  // Fix pattern like: https://host.r2.devhttps//host.r2.dev/path → https://host.r2.dev/path
  urlStr = urlStr.replace(/(\.r2\.dev)https\/+/, '$1/');
  try {
    const u = new URL(urlStr);
    if (u.hostname.endsWith('.r2.dev') && u.pathname.startsWith('/https//')) {
      // Remove duplicated scheme/host in path
      const m = u.pathname.match(/^\/https\/+([^/]+)(\/.*)?$/);
      if (m) {
        const rest = m[2] || '/';
        u.pathname = rest;
        return u.toString();
      }
    }
    return urlStr;
  } catch {
    return urlStr;
  }
}

function shouldCacheHost(hostname: string): boolean {
  // Never cache R2 public domains (any *.r2.dev) or direct R2 API endpoints
  if (/.+\.r2\.dev$/i.test(hostname)) return false;
  if (/r2\.cloudflarestorage\.com$/i.test(hostname)) return false;

  // Skip our own configured public host explicitly
  const own = process.env.CLOUDFLARE_R2_PUBLIC_URL ? new URL(process.env.CLOUDFLARE_R2_PUBLIC_URL).hostname : undefined;
  if (own && hostname === own) return false;

  // Cache common third-party hosts to avoid flakiness
  const cacheList = [
    'upload.wikimedia.org',
    'wikipedia.org',
    'cdn.brandfetch.io',
    'brandfetch.io',
    'images.unsplash.com',
  ];
  return cacheList.some(h => hostname === h || hostname.endsWith(`.${h}`));
}

export async function ensureRemoteAssetsCachedInCode(
  code: string,
  projectId: string
): Promise<{ code: string; rewrites: Array<{ from: string; to: string }> }> {
  // Normalize common malformed patterns before scanning
  code = code.replace(/(\.r2\.dev)https\/+/, '$1/');

  // Rewrite internal avatar aliases to absolute R2 URLs first
  const avatarsBaseDir = process.env.AVATARS_BASE_DIR || 'Bazaar avatars';
  const publicBase = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, '') || '';

  function buildAvatarPublicUrl(fileName: string): string {
    // Encode each segment to preserve spaces
    const encodedDir = encodeURIComponent(avatarsBaseDir);
    const encodedFile = fileName.split('/').map(encodeURIComponent).join('/');
    return `${publicBase}/${encodedDir}/${encodedFile}`;
  }

  // src="/avatars/<file>" or src="avatars/<file>" or src="Bazaar avatars/<file>"
  code = code.replace(/(src|href)=["']\/?avatars\/([^"']+)["']/gi, (m, attr, file) => {
    return `${attr}="${buildAvatarPublicUrl(file)}"`;
  });
  const escapedDir = avatarsBaseDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const dirRegex = new RegExp(`(src|href)=["'](?:\\/)?${escapedDir}\\/([^"']+)["']`, 'gi');
  code = code.replace(dirRegex, (m: string, attr: string, file: string) => {
    return `${attr}="${buildAvatarPublicUrl(file)}"`;
  });
  const urlRegex = /(src|href)=["'](https?:\/\/[^"']+)["']/g;
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(code)) !== null) {
    const url = sanitizeConcatenatedR2Url(match[2]);
    found.add(url);
  }

  const rewrites: Array<{ from: string; to: string }> = [];
  for (const url of found) {
    try {
      const u = new URL(url);
      if (!shouldCacheHost(u.hostname)) continue;

      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(to);
      if (!res.ok) {
        console.warn(`[RemoteCache] Skipping (HTTP ${res.status}) ${url}`);
        continue;
      }
      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      let ct = res.headers.get('content-type');
      let guessed = guessFromBuffer(buf) || guessFromUrlPath(u.pathname);
      if ((!ct || !ct.startsWith('image/')) && guessed) {
        ct = guessed.ct;
      }
      const ext = guessed?.ext || extFromContentType(ct) || (u.pathname.split('.').pop() || 'png');
      const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 10);
      const name = `${hash}.${ext}`;
      const cachedUrl = await uploadBufferToR2(
        buf,
        `remote-cache/${projectId}`,
        name,
        ct || 'image/png',
        { 'source-url': url }
      );
      rewrites.push({ from: url, to: cachedUrl });
      code = code.split(url).join(cachedUrl);
      console.log(`[RemoteCache] Cached ${url} -> ${cachedUrl}`);
    } catch (e) {
      console.warn('[RemoteCache] Failed to cache', url, e);
      // Keep original on failure
    }
  }

  return { code, rewrites };
}
