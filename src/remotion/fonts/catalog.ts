// src/remotion/fonts/catalog.ts
// Catalog of supported fonts. Files must exist under public/fonts.

export type FontWeights = Record<string, string>; // weight -> filename
export type FontCatalog = Record<string, FontWeights>; // family -> weights

export const FONT_CATALOG: FontCatalog = {
  'Inter': {
    '300': 'Inter-Light.woff2',
    '400': 'Inter-Regular.woff2',
    '500': 'Inter-Medium.woff2',
    '600': 'Inter-SemiBold.woff2',
    '700': 'Inter-Bold.woff2',
    '800': 'Inter-ExtraBold.woff2',
    '900': 'Inter-Black.woff2',
  },
  'DM Sans': {
    '400': 'DMSans-Regular.woff2',
    '500': 'DMSans-Medium.woff2',
    '700': 'DMSans-Bold.woff2',
  },
  'Roboto': {
    '400': 'Roboto-Regular.woff2',
    '700': 'Roboto-Bold.woff2',
  },
  'Poppins': {
    '400': 'Poppins-Regular.woff2',
    '500': 'Poppins-Medium.woff2',
    '700': 'Poppins-Bold.woff2',
  },
  'Montserrat': {
    '400': 'Montserrat-Regular.woff2',
    '500': 'Montserrat-Medium.woff2',
    '700': 'Montserrat-Bold.woff2',
  },
  'Playfair Display': {
    '400': 'PlayfairDisplay-Regular.woff2',
    '700': 'PlayfairDisplay-Bold.woff2',
  },
  'Merriweather': {
    '400': 'Merriweather-Regular.woff2',
    '700': 'Merriweather-Bold.woff2',
  },
  'Lobster': {
    '400': 'Lobster-Regular.woff2',
  },
  'Dancing Script': {
    '400': 'DancingScript-Regular.woff2',
    '700': 'DancingScript-Bold.woff2',
  },
  'Pacifico': {
    '400': 'Pacifico-Regular.woff2',
  },
  'Fira Code': {
    '400': 'FiraCode-Regular.woff2',
    '700': 'FiraCode-Bold.woff2',
  },
  'JetBrains Mono': {
    '400': 'JetBrainsMono-Regular.woff2',
    '700': 'JetBrainsMono-Bold.woff2',
  },
  'Raleway': {
    '200': 'Raleway-ExtraLight.woff2',
    '400': 'Raleway-Regular.woff2',
    '700': 'Raleway-Bold.woff2',
  },
  'Ubuntu': {
    '400': 'Ubuntu-Regular.woff2',
    '700': 'Ubuntu-Bold.woff2',
  },
  'Bebas Neue': {
    '400': 'BebasNeue-Regular.woff2',
  },
  'Plus Jakarta Sans': {
    '200': 'PlusJakartaSans-ExtraLight.woff2',
    '400': 'PlusJakartaSans-Regular.woff2',
    '500': 'PlusJakartaSans-Medium.woff2',
    '700': 'PlusJakartaSans-Bold.woff2',
  },
};
