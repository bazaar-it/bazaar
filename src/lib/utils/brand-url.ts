import crypto from "crypto";
import { URL } from "node:url";

const ASSET_PATTERNS = [
  /\.r2\.dev\//i,
  /\.r2cloudflarestorage\.com\//i,
  /\.s3([.-][a-z0-9-]+)?\.amazonaws\.com\//i,
  /\.(png|jpe?g|gif|svg|webp|avif|heic|heif)$/i,
  /\/(assets|images?|media|uploads?)\//i,
];

const DISALLOWED_PROTOCOLS = new Set(["javascript:", "data:", "file:"]);

export type NormalizeUrlOptions = {
  keepQuery?: boolean;
};

export function isLikelyAssetUrl(url: string | URL): boolean {
  const target = typeof url === "string" ? url : `${url.hostname}${url.pathname}`;
  const lowered = target.toLowerCase();
  return ASSET_PATTERNS.some((pattern) => pattern.test(lowered));
}

export function normalizeBrandUrl(rawUrl: string, options: NormalizeUrlOptions = {}): string | null {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);

    if (DISALLOWED_PROTOCOLS.has(url.protocol)) {
      return null;
    }

    url.protocol = "https:";
    url.username = "";
    url.password = "";
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    if (!options.keepQuery) {
      url.search = "";
    }

    if (!url.hostname || !url.hostname.includes(".")) {
      return null;
    }

    const normalizedPath = url.pathname.replace(/\/+/, "/").replace(/\/$/, "");
    url.pathname = normalizedPath === "/" ? "" : normalizedPath;

    const pathCandidate = `${url.pathname}${url.search}`.toLowerCase();
    const hostCandidate = url.hostname.toLowerCase();

    if (ASSET_PATTERNS.some((pattern) => pattern.test(hostCandidate)) ||
        ASSET_PATTERNS.some((pattern) => pattern.test(pathCandidate))) {
      return null;
    }

    const normalized = url.toString();
    return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  } catch {
    return null;
  }
}

export function normalizeBrandUrlOrThrow(rawUrl: string, options?: NormalizeUrlOptions): string {
  const normalized = normalizeBrandUrl(rawUrl, options);
  if (!normalized) {
    throw new Error(`Invalid or unsupported brand URL: ${rawUrl}`);
  }
  return normalized;
}

export function hashNormalizedUrl(normalizedUrl: string): string {
  return crypto.createHash("sha256").update(normalizedUrl).digest("hex");
}
