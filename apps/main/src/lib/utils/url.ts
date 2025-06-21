import { getBaseUrl } from "~/config/site"

/**
 * Environment-aware URL utility functions
 */
export function getAppUrl(): string {
  return getBaseUrl();
}

export function getShareUrl(shareId: string): string {
  return `${getAppUrl()}/share/${shareId}`;
}

export function getApiUrl(): string {
  const appUrl = getAppUrl();
  return `${appUrl}/api`;
}

export function getBazaarUrl(path = ''): string {
  return `${getAppUrl()}${path}`;
}