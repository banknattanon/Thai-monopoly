import { chromium } from 'playwright';
import { spawn } from 'child_process';
import assert from 'assert';

const viewports = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'Samsung Galaxy S21', width: 360, height: 800 },
  { name: 'iPad Mini', width: 768, height: 1024 }
];

(async () => {
  console.log('🧪 Running Test: Mobile Viewport Rendering 🧪');
  
  // Start local server
  const serverProcess = spawn('node', ['server.js'], { stdio: 'ignore' });
  
  // Launch Playwright Chromium browser
  const browser = await chromium.launch({ headless: true });
  
  try {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for server to start

    for (const vp of viewports) {
      console.log(`\nChecking Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      
      // Fill name & create room
      await page.fill('#input-player-name', 'ViewportTester');
      await page.click('#btn-create-room');
      
      // Wait for lobby to show up
      await page.waitForSelector('#room-code-display', { state: 'visible', timeout: 5000 });
      
      // Check for horizontal scrollbars (no overflow)
      const scrollInfo = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth
        };
      });
      
      console.log(`  Scroll width: ${scrollInfo.scrollWidth}px, Viewport width: ${scrollInfo.innerWidth}px`);
      assert.strictEqual(scrollInfo.hasHorizontalScroll, false, `Viewport ${vp.name} should not have horizontal scrollbar`);
      console.log(`  ✅ Viewport fits correctly without horizontal overflow`);
      
      // Check lobby buttons wrapper styling
      const lobbyActionsDisplay = await page.evaluate(() => {
        const el = document.querySelector('.lobby-actions');
        return el ? {
          flexDirection: getComputedStyle(el).flexDirection,
          width: el.offsetWidth
        } : null;
      });
      
      if (vp.width <= 768) {
        assert.ok(lobbyActionsDisplay, 'Lobby actions element should exist');
        assert.strictEqual(lobbyActionsDisplay.flexDirection, 'column', 'Lobby actions should display as column on mobile');
        console.log(`  ✅ Lobby actions are stacked vertically`);
      }
      
      await page.close();
      await context.close();
    }
    
    console.log('\n==================================================');
    console.log('✅ [PASS] Mobile Viewport Rendering Tests Passed!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n❌ [FAIL] Mobile Viewport Test Failed:');
    console.error(err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    serverProcess.kill();
  }
})();
