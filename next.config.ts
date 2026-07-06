import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],

  outputFileTracingIncludes: {
    "/api/scan": [
      "./node_modules/axe-core/axe.min.js",
      "./node_modules/playwright-core/**",
      "./node_modules/@sparticuz/chromium/**",
    ],
    "/api/site-scan/page": [
      "./node_modules/axe-core/axe.min.js",
      "./node_modules/playwright-core/**",
      "./node_modules/@sparticuz/chromium/**",
    ],
  },

  outputFileTracingExcludes: {
    "/api/scan": ["./node_modules/playwright/**", "./node_modules/@playwright/**"],
    "/api/site-scan/page": ["./node_modules/playwright/**", "./node_modules/@playwright/**"],
  },
};

export default nextConfig;
