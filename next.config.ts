import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Não empacotar o Chromium serverless — ele é carregado em runtime.
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],

  // Força a inclusão no bundle da função /api/scan de arquivos que o tracer
  // não detecta sozinho (carregados por caminho dinâmico em runtime):
  //  - axe.min.js: lido via process.cwd();
  //  - playwright-core: lê browsers.json / coreBundle em runtime;
  //  - @sparticuz/chromium: extrai o binário do próprio /bin.
  outputFileTracingIncludes: {
    "/api/scan": [
      "./node_modules/axe-core/axe.min.js",
      "./node_modules/playwright-core/**",
      "./node_modules/@sparticuz/chromium/**",
    ],
  },

  // O Playwright completo só roda local (devDep). Fora do bundle serverless —
  // o import dele é gated por ambiente e nunca executa na Vercel.
  outputFileTracingExcludes: {
    "/api/scan": ["./node_modules/playwright/**", "./node_modules/@playwright/**"],
  },
};

export default nextConfig;
