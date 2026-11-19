import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:8788",
    browserName: "chromium",
    headless: true,
    locale: "en-US",
  },
  webServer: {
    command: "npm run dev:web -- --port 8788",
    url: "http://127.0.0.1:8788",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
