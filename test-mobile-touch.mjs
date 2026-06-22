import { chromium } from 'playwright';
import { spawn } from 'child_process';
import assert from 'assert';

(async () => {
  console.log('🧪 Running Test: Mobile Touch Interaction 🧪');
  
  // Start local server
  const serverProcess = spawn('node', ['server.js'], { stdio: 'ignore' });
  const browser = await chromium.launch({ headless: true });
  
  try {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for server

    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      hasTouch: true
    });
    const page = await context.newPage();
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Create room
    await page.fill('#input-player-name', 'TouchTester');
    await page.click('#btn-create-room');
    await page.waitForSelector('#room-code-display', { state: 'visible', timeout: 5000 });
    
    // Add 1 bot and start game
    await page.click('#btn-add-bot');
    await page.waitForTimeout(1000);
    await page.click('#btn-start-game');
    await page.waitForSelector('#game-screen.active', { timeout: 10000 });
    await page.waitForTimeout(2000); // Wait for animation
    
    // Tap tile index 1 (Khlong San)
    console.log('Simulating tap on tile index 1 (Khlong San)...');
    await page.evaluate(() => {
      const phaserGame = window.game || window.phaserGame;
      const gameScene = phaserGame.scene.getScene('GameScene');
      const container = gameScene.boardRenderer.squareContainers[1];
      container.emit('pointerup');
    });
    
    await page.waitForTimeout(500); // Wait for transition
    
    // Verify PropertyCard is shown in mobile-card mode
    const cardInfo = await page.evaluate(() => {
      const card = document.getElementById('hover-property-card');
      const backdrop = document.querySelector('.property-card-backdrop');
      return {
        display: card ? getComputedStyle(card).display : 'none',
        isMobileCard: card ? card.classList.contains('mobile-card') : false,
        hasBackdrop: !!backdrop
      };
    });
    
    console.log(`  Card display: ${cardInfo.display}, isMobileCard: ${cardInfo.isMobileCard}, hasBackdrop: ${cardInfo.hasBackdrop}`);
    assert.strictEqual(cardInfo.display, 'block', 'Property card should be displayed');
    assert.strictEqual(cardInfo.isMobileCard, true, 'Property card should have mobile-card class');
    assert.strictEqual(cardInfo.hasBackdrop, true, 'Property card backdrop should be present in DOM');
    console.log('  ✅ Property card opened as centered modal with backdrop');
    
    // Tap the backdrop to close the card
    console.log('Simulating tap on the backdrop to close...');
    await page.evaluate(() => {
      const backdrop = document.querySelector('.property-card-backdrop');
      if (backdrop) {
        // Trigger touchstart event on backdrop
        const event = new TouchEvent('touchstart', { bubbles: true, cancelable: true });
        backdrop.dispatchEvent(event);
      }
    });
    
    await page.waitForTimeout(500);
    
    const cardInfoClosed = await page.evaluate(() => {
      const card = document.getElementById('hover-property-card');
      const backdrop = document.querySelector('.property-card-backdrop');
      return {
        display: card ? getComputedStyle(card).display : 'none',
        hasBackdrop: !!backdrop
      };
    });
    
    console.log(`  Card display after close: ${cardInfoClosed.display}, hasBackdrop: ${cardInfoClosed.hasBackdrop}`);
    assert.strictEqual(cardInfoClosed.display, 'none', 'Property card should be hidden');
    assert.strictEqual(cardInfoClosed.hasBackdrop, false, 'Property card backdrop should be removed');
    console.log('  ✅ Property card successfully closed on tapping backdrop');
    
    console.log('\n==================================================');
    console.log('✅ [PASS] Mobile Touch Interaction Tests Passed!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n❌ [FAIL] Mobile Touch Test Failed:');
    console.error(err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    serverProcess.kill();
  }
})();
