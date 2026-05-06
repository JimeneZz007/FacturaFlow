import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["node_modules/**", "cdk.out/**", "dist/**", "coverage/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json"
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_"
        }
      ]
    }
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      globals: {
        process: "readonly",
        fetch: "readonly",
        console: "readonly",
        __ENV: "readonly",
        __ITER: "readonly",
        __VU: "readonly",
        http: "readonly",
        check: "readonly",
        sleep: "readonly"
      }
    }
  }
];
