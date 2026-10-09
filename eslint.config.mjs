import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  globalIgnores([
    ".next/**",
    ".next-results-ux/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    "extension/dist/**",
    ".claude/**",
    "design_handoff_vegetal_2a/**",
    "design_exploration_cor_tipo/**",
  ]),
]);

export default eslintConfig;
