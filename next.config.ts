import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Skip ESLint during production builds to avoid CI failures
    // when local tooling options differ. We still lint in dev.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
