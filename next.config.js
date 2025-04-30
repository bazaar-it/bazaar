/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules replacement for __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
  eslint: {
    // Allow production builds to complete despite ESLint errors
    ignoreDuringBuilds: true,
  },
  webpack(config) {
    // Resolve '~/*' to '<root>/src/*'
    config.resolve.alias['~'] = path.resolve(__dirname, 'src');
    // Polyfill for the crypto module
    config.resolve.fallback = {
      crypto: require.resolve('crypto-browserify'),
    };
    return config;
  },
};

export default config;
