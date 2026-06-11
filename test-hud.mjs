import { chromium } from 'playwright';
import { spawn } from 'child_process';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.stack || err.message));
  
  // Start local server
  const serverProcess = spawn('node', ['server.js'], { stdio: 'inherit' });
  await page.waitForTimeout(2000); // Wait for server to start

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  await page.fill('#input-player-name', 'HostTester');
  await page.click('#btn-create-room');
  await page.waitForSelector('#room-code-display', { state: 'visible' });
  await page.waitForTimeout(1000);
  
  const roomCode = await page.textContent('#room-code-display');
  console.log(`Room: ${roomCode.trim()}`);
  
  // Spawn bots
  const botProcess = spawn('node', ['run-live-bots.js', roomCode.trim(), 'http://localhost:3000'], { stdio: 'inherit' });
  
  console.log('Waiting for Start Game button...');
  await page.waitForFunction(() => {
      const startBtn = document.getElementById('btn-start-game');
      return startBtn && !startBtn.disabled;
  }, { timeout: 30000 });
  
  await page.waitForTimeout(2000);
  
  console.log('Clicking Start Game...');
  await page.click('#btn-start-game');
  
  console.log('Waiting for game screen...');
  await page.waitForSelector('#game-screen.active', { timeout: 10000 });
  
  await page.waitForTimeout(3000); // Wait for UIScene to fully update
  
  // Check button visibility
  const buttonStates = await page.evaluate(() => {
      const buttons = [
        'btn-roll-dice', 'btn-buy', 'btn-decline', 'btn-end-turn',
        'btn-build-house', 'btn-build-hotel', 'btn-mortgage', 'btn-trade',
        'btn-jail-pay', 'btn-jail-card', 'btn-jail-roll'
      ];
      const result = {};
      buttons.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          result[id] = {
            display: getComputedStyle(el).display,
            visible: el.offsetParent !== null
          };
        } else {
          result[id] = 'NOT FOUND';
        }
      });
      return result;
  });
  
  console.log('\n=== BUTTON VISIBILITY ===');
  for (const [id, state] of Object.entries(buttonStates)) {
    const status = typeof state === 'string' ? state : 
      (state.display !== 'none' ? `✅ VISIBLE (display: ${state.display})` : `❌ HIDDEN`);
    console.log(`  ${id}: ${status}`);
  }
  
  // Check current turnPhase in gameState
  const gameInfo = await page.evaluate(() => {
    // Try to get the Phaser game state
    const phaserGame = window.game || window.phaserGame;
    if (phaserGame) {
      const gameScene = phaserGame.scene.getScene('GameScene');
      if (gameScene && gameScene.gameState) {
        return {
          turnPhase: gameScene.gameState.turnPhase,
          currentPlayerId: gameScene.gameState.currentPlayerId,
          hasSettings: !!gameScene.gameState.settings,
          settingsKeys: gameScene.gameState.settings ? Object.keys(gameScene.gameState.settings) : []
        };
      }
    }
    return 'Could not access game state';
  });
  
  console.log('\n=== GAME STATE ===');
  console.log(JSON.stringify(gameInfo, null, 2));
  
  const turnName = await page.evaluate(() => {
      return document.getElementById('current-player-name').textContent;
  });
  console.log('\nCURRENT PLAYER NAME IN HUD:', turnName);
  
  // Try clicking roll dice if visible
  const rollVisible = buttonStates['btn-roll-dice'];
  if (rollVisible && typeof rollVisible !== 'string' && rollVisible.display !== 'none') {
    console.log('\n>>> Clicking Roll Dice...');
    await page.click('#btn-roll-dice');
    await page.waitForTimeout(4000); // Wait for dice + move animation
    
    // Check buttons again after roll
    const afterRollButtons = await page.evaluate(() => {
      const buttons = ['btn-roll-dice', 'btn-buy', 'btn-decline', 'btn-end-turn'];
      const result = {};
      buttons.forEach(id => {
        const el = document.getElementById(id);
        result[id] = el ? getComputedStyle(el).display : 'NOT FOUND';
      });
      return result;
    });
    console.log('\n=== BUTTONS AFTER ROLL ===');
    for (const [id, display] of Object.entries(afterRollButtons)) {
      console.log(`  ${id}: ${display !== 'none' ? '✅ VISIBLE' : '❌ HIDDEN'}`);
    }

    const afterGameInfo = await page.evaluate(() => {
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
      return 'N/A';
    });
    console.log('GAME STATE AFTER ROLL:', JSON.stringify(afterGameInfo));
  }
  
  await browser.close();
  botProcess.kill();
  serverProcess.kill();
})();
