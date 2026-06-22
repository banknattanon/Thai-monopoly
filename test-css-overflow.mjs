import { chromium } from 'playwright';
import { spawn } from 'child_process';
import assert from 'assert';

(async () => {
  console.log('🧪 Running Test: CSS Layout & Overflow Check 🧪');
  
  // Start local server
  const serverProcess = spawn('node', ['server.js'], { stdio: 'ignore' });
  const browser = await chromium.launch({ headless: true });
  
  try {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for server

    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Test on small screen viewport (iPhone SE width: 375px)
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Fill name & create room
    await page.fill('#input-player-name', 'OverflowTester');
    await page.click('#btn-create-room');
    await page.waitForSelector('#room-code-display', { state: 'visible', timeout: 5000 });
    
    // Verify touch targets (buttons) height >= 44px
    const buttonDimensions = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.btn'));
      return btns.map(btn => ({
        id: btn.id || btn.className,
        height: btn.offsetHeight
      }));
    });
    
    console.log('Checking button touch targets (min-height >= 44px):');
    buttonDimensions.forEach(btn => {
      console.log(`  Button "${btn.id}": height ${btn.height}px`);
      // We skip checking currently hidden elements (height 0)
      if (btn.height > 0) {
        assert.ok(btn.height >= 44, `Button "${btn.id}" height (${btn.height}px) should be >= 44px for touch targets`);
      }
    });
    console.log('  ✅ All visible buttons satisfy min-height >= 44px');
    
    // Check overflow on the game layout screen
    await page.click('#btn-add-bot');
    await page.waitForTimeout(1000);
    await page.click('#btn-start-game');
    await page.waitForSelector('#game-screen.active', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const pageLayoutInfo = await page.evaluate(() => {
      return {
        bodyScrollWidth: document.body.scrollWidth,
        docScrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        gameAreaWidth: document.querySelector('.game-area') ? document.querySelector('.game-area').offsetWidth : 0,
        gameHudWidth: document.querySelector('.game-hud-side') ? document.querySelector('.game-hud-side').offsetWidth : 0
      };
    });
    
    console.log(`\nLayout Info on Game Screen:`);
    console.log(`  Viewport Width: ${pageLayoutInfo.viewportWidth}px`);
    console.log(`  Document Scroll Width: ${pageLayoutInfo.docScrollWidth}px`);
    console.log(`  Game Area Width: ${pageLayoutInfo.gameAreaWidth}px`);
    console.log(`  Game HUD Side Width: ${pageLayoutInfo.gameHudWidth}px`);
    
    // Check that layout width matches or is within viewport bounds
    assert.ok(pageLayoutInfo.docScrollWidth <= pageLayoutInfo.viewportWidth, 'Game screen should not overflow horizontally on mobile');
    console.log('  ✅ Game screen does not overflow horizontally');
    
    console.log('\n==================================================');
    console.log('✅ [PASS] CSS Layout & Overflow Tests Passed!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n❌ [FAIL] CSS Overflow Test Failed:');
    console.error(err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    serverProcess.kill();
  }
})();
