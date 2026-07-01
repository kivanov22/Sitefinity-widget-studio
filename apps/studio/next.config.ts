import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    proxyTimeout: 60000,
  },
  skipTrailingSlashRedirect: true,
  turbopack: {
    resolveAlias: {
      "@widgetregistry": "./src/app/widget-registry.ts",
    },
  },
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
