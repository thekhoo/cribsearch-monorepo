import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compile the shared TypeScript package directly (no pre-build step needed).
  transpilePackages: ["@cribsearch/shared-types"],
};

export default nextConfig;
