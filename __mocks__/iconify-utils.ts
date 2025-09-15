// __mocks__/iconify-utils.ts
// ts-jest ESM-friendly mock for @iconify/utils

export function getIconData(iconSet: any, name: string) {
  try {
    const icons = (iconSet?.icons as Record<string, any>) || (iconSet?.default?.icons as Record<string, any>) || {};
    return icons[name] || null;
  } catch {
    return null;
  }
}

export function iconToSVG(iconData: any, options: { width?: string; height?: string } = {}) {
  const width = options.width || '1em';
  const height = options.height || '1em';
  const viewBox = iconData?.viewBox || '0 0 24 24';
  const body = iconData?.body || '<rect x="4" y="4" width="16" height="16" rx="2" />';
  return {
    attributes: { viewBox, width, height },
    body,
  } as { attributes: Record<string, string>; body: string };
}

export function replaceIDs(body: string, _prefix: string) {
  // No-op in tests
  return body;
}

