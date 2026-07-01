import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@studio/parser-csharp",
    "@studio/metadata-engine",
    "@studio/widget-generator",
    "@studio/preview-engine",
    "@studio/widget-registry",
    "@studio/shared",
  ],
  typedRoutes: true,
};

export default nextConfig;
