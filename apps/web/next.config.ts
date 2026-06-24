import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compile the shared TypeScript package directly (no pre-build step needed).
  transpilePackages: ["@homefinder/shared-types"],
};

export default nextConfig;
