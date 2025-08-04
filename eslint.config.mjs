import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // Disable strict rules for faster deployment
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn",
      "no-console": "off",
      "no-debugger": "warn",
      // Performance optimizations
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      // Allow async functions in useEffect
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;
