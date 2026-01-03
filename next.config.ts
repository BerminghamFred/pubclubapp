import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
