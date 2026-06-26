import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Não empacotar o Chromium serverless — ele é carregado em runtime.
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],

  // Garante que o axe.min.js entre no bundle da função /api/scan
  // (lemos ele do disco via process.cwd(), então precisa estar presente).
  outputFileTracingIncludes: {
    "/api/scan": ["./node_modules/axe-core/axe.min.js"],
  },

  // O Playwright completo só roda local (devDep). Fora do bundle serverless —
  // o import dele é gated por ambiente e nunca executa na Vercel.
  outputFileTracingExcludes: {
    "/api/scan": ["./node_modules/playwright/**", "./node_modules/@playwright/**"],
  },
};

export default nextConfig;
