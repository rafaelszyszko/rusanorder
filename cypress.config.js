import { defineConfig } from 'cypress';
import { registerSeedTasks } from './cypress/plugins/seed.js';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx}',
    supportFile: 'cypress/support/e2e.js',
    fixturesFolder: 'cypress/fixtures',
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    video: false,
    viewportWidth: 1366,
    viewportHeight: 800,
    defaultCommandTimeout: 8000,
    requestTimeout: 15000,
    retries: { runMode: 1, openMode: 0 },
    setupNodeEvents(on, config) {
      config.env.apiUrl = process.env.CYPRESS_API_URL || config.env.apiUrl || 'http://localhost:3000';
      registerSeedTasks(on, config);
      return config;
    },
  },
});
