import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getBaseUrl } from "~/config/site"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
