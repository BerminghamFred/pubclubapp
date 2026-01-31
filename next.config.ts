import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    // Avoid ChunkLoadError (timeout) on slow dev server or first load
    config.output = config.output ?? {};
    (config.output as { chunkLoadTimeout?: number }).chunkLoadTimeout = 30_000;
    return config;
  },
  eslint: {
    // Skip ESLint during production builds to avoid CI failures
    // when local tooling options differ. We still lint in dev.
    ignoreDuringBuilds: true,
  },
  images: {
    // Allow images from external sources
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Allow SVG images (for fallback)
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
