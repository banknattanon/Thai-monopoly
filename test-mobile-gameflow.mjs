import { chromium } from 'playwright';
import { spawn } from 'child_process';
import assert from 'assert';

(async () => {
  console.log('🧪 Running Test: Mobile E2E Game Flow & Chat Toggle 🧪');
  
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
    await page.fill('#input-player-name', 'FlowTester');
    await page.click('#btn-create-room');
    await page.waitForSelector('#room-code-display', { state: 'visible', timeout: 5000 });
    
    // Add bot and start
    await page.click('#btn-add-bot');
    await page.waitForTimeout(1000);
    await page.click('#btn-start-game');
    await page.waitForSelector('#game-screen.active', { timeout: 10000 });
    await page.waitForTimeout(2000); // Wait for transition
    
    // Check default chat panel state on mobile (should be hidden)
    const chatHiddenDefault = await page.evaluate(() => {
      const panel = document.getElementById('chat-panel');
      return panel ? panel.classList.contains('chat-hidden') : false;
    });
    console.log(`  Chat panel starts hidden: ${chatHiddenDefault}`);
    assert.strictEqual(chatHiddenDefault, true, 'Chat panel should start hidden on mobile on load');
    console.log('  ✅ Chat panel successfully starts collapsed by default');
    
    // Click chat toggle button to show
    console.log('Clicking chat toggle button...');
    await page.click('#chat-toggle-btn');
    await page.waitForTimeout(300);
    
    const chatShown = await page.evaluate(() => {
      const panel = document.getElementById('chat-panel');
      return panel ? !panel.classList.contains('chat-hidden') : false;
    });
    console.log(`  Chat panel is shown after click: ${chatShown}`);
    assert.strictEqual(chatShown, true, 'Chat panel should be shown after toggle click');
    console.log('  ✅ Chat panel opens correctly on button click');
    
    // Click toggle button again to hide
    console.log('Clicking chat toggle button again...');
    await page.click('#chat-toggle-btn');
    await page.waitForTimeout(300);
    
    const chatHiddenAgain = await page.evaluate(() => {
      const panel = document.getElementById('chat-panel');
      return panel ? panel.classList.contains('chat-hidden') : false;
    });
    console.log(`  Chat panel is hidden again: ${chatHiddenAgain}`);
    assert.strictEqual(chatHiddenAgain, true, 'Chat panel should be hidden again after second toggle click');
    console.log('  ✅ Chat panel collapses correctly on second click');
    
    // Test Roll Dice
    console.log('Waiting for Roll Dice button...');
    await page.waitForFunction(() => {
      const rollBtn = document.getElementById('btn-roll-dice');
      return rollBtn && !rollBtn.disabled && getComputedStyle(rollBtn).display !== 'none';
    }, { timeout: 10000 });
    
    console.log('Clicking Roll Dice...');
    await page.click('#btn-roll-dice');
    await page.waitForTimeout(4000); // Wait for movement
    
    const turnInfo = await page.evaluate(() => {
      const phaserGame = window.game || window.phaserGame;
      if (phaserGame) {
        const gameScene = phaserGame.scene.getScene('GameScene');
        if (gameScene && gameScene.gameState) {
          return {
            turnPhase: gameScene.gameState.turnPhase,
            currentPlayerId: gameScene.gameState.currentPlayerId
          };
        }
      }
      return null;
    });
    console.log('  Current Turn Phase after roll:', turnInfo ? turnInfo.turnPhase : 'N/A');
    
    console.log('\n==================================================');
    console.log('✅ [PASS] Mobile E2E Game Flow Tests Passed!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n❌ [FAIL] Mobile E2E Game Flow Test Failed:');
    console.error(err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    serverProcess.kill();
  }
})();
