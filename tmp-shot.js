const { chromium } = require('C:/Users/Meghan Camacho/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Users/Meghan Camacho/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGEERROR:', err.message));
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'preview-home.png' });
  console.log('title:', await page.title());
  console.log('body view:', await page.locator('body').getAttribute('data-view'));
  await browser.close();
})();
