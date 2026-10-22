import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',testMatch:'capture.spec.ts',outputDir:'test-results/capture-v2',workers:1,
 use:{baseURL:'http://127.0.0.1:5191',browserName:'chromium',channel:'msedge',viewport:{width:1440,height:1000}},
 webServer:{command:'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5191 --strictPort',url:'http://127.0.0.1:5191',reuseExistingServer:!process.env.CI},
});
