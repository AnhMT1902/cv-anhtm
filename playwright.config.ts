import { defineConfig } from '@playwright/test';

const frontend = 'http://127.0.0.1:3100';
const backend = 'http://127.0.0.1:3101';
const externalFrontend = process.env.CV_E2E_BASE_URL;

export default defineConfig({
  testDir: './tests',
  use: { baseURL: externalFrontend ?? frontend, browserName: 'chromium' },
  workers: 1,
  webServer: externalFrontend ? undefined : [
    {
      command: 'node apps/backend/dist/main.js',
      url: backend + '/api/public/cv',
      env: { PORT: '3101' },
    },
    {
      command: 'node node_modules/next/dist/bin/next start apps/frontend --hostname 127.0.0.1 --port 3100',
      url: frontend,
      env: { CV_API_ORIGIN: backend, NEXT_TELEMETRY_DISABLED: '1' },
    },
  ],
});
