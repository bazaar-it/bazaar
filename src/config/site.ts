// src/config/site.ts

/**
 * Returns the base URL for the application
 * - In browser: empty string for relative URLs
 * - In production: https://bazaar.it
 * - In development: http://localhost:3000
 */
export function getBaseUrl() {
  if (typeof window !== 'undefined') return ''; // browser should use relative url
  if (process.env.NODE_ENV === 'production') return 'https://bazaar.it';
  return `http://localhost:${process.env.PORT ?? 3000}`; // local development
}

export const siteConfig = {
  name: "Bazaar",
  description: "Create incredible motion graphics videos with AI",
  url: getBaseUrl(), // Removed NEXT_PUBLIC_BASE_URL since we're hardcoding
  ogImage: "/og-image.png",
  links: {,
  },
};
