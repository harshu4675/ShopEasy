import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "dev-dist", "scripts"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    plugins: { react },
    settings: { react: { version: "detect" } },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      // Unused catch bindings and intentionally-ignored args are written with a
      // leading underscore.
      "no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^[A-Z_]",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-empty": ["error", { allowEmptyCatch: true }],
      /*
       * Defining a component inside another component's body creates a new
       * component type on every render, so React unmounts and remounts the
       * whole subtree. For form inputs that destroys the DOM node on each
       * keystroke, which closes the keyboard on mobile.
       */
      "react/no-unstable-nested-components": ["error", { allowAsProps: false }],
      "react-hooks/rules-of-hooks": "error",
    },
  },
  {
    // Contexts intentionally export both a provider and its hooks; fast refresh
    // still works because the module is only imported, never route-split.
    files: ["src/context/**/*.jsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // The service worker runs in a worker scope, not the browser main thread.
    files: ["src/sw.js"],
    languageOptions: { globals: { ...globals.serviceworker } },
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    files: ["*.config.js", "tailwind.config.js"],
    languageOptions: { globals: { ...globals.node } },
  },
]);
