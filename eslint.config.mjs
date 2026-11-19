import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  globalIgnores(["node_modules", "main.js", "web/dist/**"]),
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.mjs", "web/build.mjs", "web/sw.js"],
        },
      },
    },
    rules: {
      "obsidianmd/no-static-styles-assignment": "warn",
    },
  },
  {
    files: ["web/**/*.{js,mjs,ts}", "tests/**/*.ts"],
    rules: {
      "no-restricted-globals": "off",
      "obsidianmd/no-nodejs-modules": "off",
      "obsidianmd/prefer-active-doc": "off",
    },
  },
  prettier,
]);
