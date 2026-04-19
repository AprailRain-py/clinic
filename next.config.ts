import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Netlify's pnpm install doesn't always expose eslint-config-next's flat-config
  // submodules correctly. We still run `pnpm lint` locally — skip during build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
