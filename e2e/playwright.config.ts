import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }], // Reporte visual navegable
    ['junit', { outputFile: 'test-results/junit.xml' }], // Útil para Jenkins
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure', // Evidencia automática si falla
    trace: 'retain-on-failure',
  },
  projects: [
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      channel: process.env.CI ? undefined : 'chrome', // cambia a 'msedge' si no tienes Chrome
    },
  },
],
});