import { chromium } from 'playwright';
import { spawn } from 'child_process';
import assert from 'assert';

(async () => {
  console.log('🧪 Running Test: Mobile Board Zoom & Pan 🧪');
  
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
    await page.fill('#input-player-name', 'ZoomTester');
    await page.click('#btn-create-room');
    await page.waitForSelector('#room-code-display', { state: 'visible', timeout: 5000 });
    
    // Add 1 bot and start game
    await page.click('#btn-add-bot');
    await page.waitForTimeout(1000);
    await page.click('#btn-start-game');
    await page.waitForSelector('#game-screen.active', { timeout: 10000 });
    await page.waitForTimeout(2000); // Wait for transition animation
    
    // 1. Verify Zoom Overlay Controls exist in DOM
    console.log('Verifying zoom buttons are present in DOM...');
    const zoomInVisible = await page.isVisible('#btn-zoom-in');
    const zoomOutVisible = await page.isVisible('#btn-zoom-out');
    const zoomResetVisible = await page.isVisible('#btn-zoom-reset');
    
    assert.strictEqual(zoomInVisible, true, 'Zoom In button should be visible');
    assert.strictEqual(zoomOutVisible, true, 'Zoom Out button should be visible');
    assert.strictEqual(zoomResetVisible, true, 'Zoom Reset button should be visible');
    console.log('  ✅ Floating zoom buttons are present and visible');

    // Get initial Phaser Camera state
    let cameraState = await page.evaluate(() => {
      const phaserGame = window.game || window.phaserGame;
      const gameScene = phaserGame.scene.getScene('GameScene');
      return {
        zoom: gameScene.cameras.main.zoom,
        scrollX: gameScene.cameras.main.scrollX,
        scrollY: gameScene.cameras.main.scrollY
      };
    });
    console.log(`  Initial camera state: zoom=${cameraState.zoom}, scrollX=${cameraState.scrollX}, scrollY=${cameraState.scrollY}`);
    assert.strictEqual(cameraState.zoom, 1.0, 'Initial zoom should be 1.0');

    // 2. Click Zoom In Button (+)
    console.log('Clicking Zoom In button...');
    await page.click('#btn-zoom-in');
    await page.waitForTimeout(200);
    
    cameraState = await page.evaluate(() => {
      const phaserGame = window.game || window.phaserGame;
      const gameScene = phaserGame.scene.getScene('GameScene');
      return {
        zoom: gameScene.cameras.main.zoom,
        scrollX: gameScene.cameras.main.scrollX,
        scrollY: gameScene.cameras.main.scrollY
      };
    });
    console.log(`  After Zoom In click: zoom=${cameraState.zoom.toFixed(2)}`);
    assert.ok(cameraState.zoom > 1.0, 'Zoom should be greater than 1.0 after clicking Zoom In');

    // 3. Click Zoom Out Button (-)
    console.log('Clicking Zoom Out button...');
    await page.click('#btn-zoom-out');
    await page.waitForTimeout(200);
    
    cameraState = await page.evaluate(() => {
      const phaserGame = window.game || window.phaserGame;
      const gameScene = phaserGame.scene.getScene('GameScene');
      return {
        zoom: gameScene.cameras.main.zoom
      };
    });
    console.log(`  After Zoom Out click: zoom=${cameraState.zoom.toFixed(2)}`);
    assert.strictEqual(cameraState.zoom, 1.0, 'Zoom should return to 1.0 after clicking Zoom Out');

    // 4. Test Double Tap on Board to Zoom
    console.log('Simulating double tap on Phaser canvas...');
    await page.evaluate(() => {
      const phaserGame = window.game || window.phaserGame;
      const gameScene = phaserGame.scene.getScene('GameScene');
      
      // Simulate double tap via pointer events or programmatically dispatching to GameScene
      const pointer = { x: 400, y: 400 };
      gameScene.input.emit('pointerdown', pointer, []);
      
      // Advance time programmatically for tap delay (e.g. 50ms later)
      gameScene.time.now += 50;
      gameScene.input.emit('pointerdown', pointer, []);
    });
    await page.waitForTimeout(500);

    cameraState = await page.evaluate(() => {
      const phaserGame = window.game || window.phaserGame;
      const gameScene = phaserGame.scene.getScene('GameScene');
      return {
        zoom: gameScene.cameras.main.zoom,
        scrollX: gameScene.cameras.main.scrollX,
        scrollY: gameScene.cameras.main.scrollY
      };
    });
    console.log(`  After Double Tap: zoom=${cameraState.zoom.toFixed(2)}, scrollX=${cameraState.scrollX.toFixed(2)}, scrollY=${cameraState.scrollY.toFixed(2)}`);
    assert.strictEqual(cameraState.zoom, 1.8, 'Double tap should set zoom to 1.8');

    // 5. Click Reset Button (🔄)
    console.log('Clicking Reset Zoom button...');
    await page.click('#btn-zoom-reset');
    await page.waitForTimeout(200);
    
    cameraState = await page.evaluate(() => {
      const phaserGame = window.game || window.phaserGame;
      const gameScene = phaserGame.scene.getScene('GameScene');
      return {
        zoom: gameScene.cameras.main.zoom,
        scrollX: gameScene.cameras.main.scrollX,
        scrollY: gameScene.cameras.main.scrollY
      };
    });
    console.log(`  After Reset Zoom click: zoom=${cameraState.zoom}, scrollX=${cameraState.scrollX}, scrollY=${cameraState.scrollY}`);
    assert.strictEqual(cameraState.zoom, 1.0, 'Zoom should be reset to 1.0');
    assert.strictEqual(cameraState.scrollX, 0, 'ScrollX should be reset to 0');
    assert.strictEqual(cameraState.scrollY, 0, 'ScrollY should be reset to 0');
    console.log('  ✅ Camera zoom, pan reset, and double-tap gestures function correctly');

    console.log('\n==================================================');
    console.log('✅ [PASS] Mobile Board Zoom & Pan Tests Passed!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n❌ [FAIL] Mobile Board Zoom & Pan Test Failed:');
    console.error(err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    serverProcess.kill();
  }
})();
