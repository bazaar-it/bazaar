// src/lib/utils/uniquifyTemplateCode.ts

/**
 * Template code uniquification utilities
 * NOTE: Uniquification is disabled - scenes run in isolated Function constructors
 */

/**
 * No-op uniquification - returns template code unchanged
 * Since each scene runs in its own Function constructor, there are no variable conflicts
 */
export function uniquifyTemplateCode(templateCode: string, uniqueSuffix: string): string {
  // Each scene runs in complete isolation via Function constructor
  // No need to modify the code - just return as-is
  return templateCode;
}

/**
 * Generate a unique suffix for template instances
 * Used only for scene naming, not code modification
 */
export function generateTemplateSuffix(): string {
  // Use random characters for readable unique suffixes
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return suffix;
}