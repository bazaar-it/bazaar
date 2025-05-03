//bazaar-vid/next.config.js
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import('next').NextConfig} */
const config = {
  eslint: {
    // Allow production builds to complete despite ESLint errors
    ignoreDuringBuilds: true,
  },
  
  // Configure webpack to ignore problematic files
  webpack: (config, { isServer }) => {
    if (!config.resolve) {
      config.resolve = {};
    }
    
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    
    // Add aliases for ~ to point to src directory
    config.resolve.alias['~'] = new URL('./src', import.meta.url).pathname;

    // Ignore all .d.ts files (e.g., esbuild/lib/main.d.ts)
    config.module.rules.push({
      test: /\.d\.ts$/,
      use: 'ignore-loader',
    });

    // Mark esbuild as external for server-side bundling
    if (isServer) {
      if (!config.externals) config.externals = [];
      config.externals.push('esbuild');
    }

    return config;
  },
};

export default config;
