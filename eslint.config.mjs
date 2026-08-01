import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // El panel /admin carga datos (productos, categorias, cotizaciones,
      // usuarios) con un fetch en el efecto de montaje; el setState ocurre
      // despues de un await, no sincronicamente, asi que no causa cascading
      // renders. Es el patron estandar de data-fetching en client components.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
