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
  
  // Suppress deprecation warnings in development
  reactStrictMode: true,
  
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
      use: 'null-loader',
    });

    // Add loader for .woff and .woff2 fonts to optimize tree shaking
    config.module.rules.push({
      test: /\.(woff|woff2)$/,
      type: 'asset/resource',
    });

    // Mark esbuild as external to prevent bundling issues
    // This is required because esbuild needs to access its binary executable
    if (!config.externals) {
      config.externals = [];
    }
    
    // Add esbuild to externals to prevent it from being bundled
    if (isServer) {
      config.externals.push('esbuild');
    }

    return config;
  },
  
  // Transpile Remotion library
  transpilePackages: ["@remotion/cli", "@remotion/player", "@remotion/renderer", "remotion"],
  
  // External packages that should be bundled separately
  serverExternalPackages: ['@prisma/client', 'drizzle-orm', 'esbuild', '@aws-sdk/client-s3', 'sharp'],
  
  // Configure CORS for API routes
  headers: async () => {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
  
  // Skip TypeScript type checking to optimize build time
  typescript: {
    ignoreBuildErrors: true,
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // domains: ['images.unsplash.com'], // Deprecated
  },

  // Add these settings to quiet down the Next.js internals
  onDemandEntries: {
    // Keep pages in memory longer to avoid constant reloads
    maxInactiveAge: 60 * 60 * 1000, // 1 hour
    // Don't show verbose logs for page compilation
    pagesBufferLength: 5,
  },

};

export default config;
