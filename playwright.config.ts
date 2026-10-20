import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  timeout: 30000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4200",
    trace: "retain-on-failure",
    launchOptions: process.env["CHROMIUM_EXECUTABLE"]
      ? {
          executablePath: process.env["CHROMIUM_EXECUTABLE"],
          args: ["--no-sandbox", "--disable-dev-shm-usage"],
        }
      : {},
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npx ng serve --host 127.0.0.1 --port 4200",
    url: "http://localhost:4200",
    reuseExistingServer: !process.env["CI"],
    timeout: 120000,
  },
});
