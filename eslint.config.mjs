import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  globalIgnores(["node_modules", "main.js"]),
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.mjs"],
        },
      },
    },
    rules: {
      "obsidianmd/no-static-styles-assignment": "warn",
    },
  },
  prettier,
]);
