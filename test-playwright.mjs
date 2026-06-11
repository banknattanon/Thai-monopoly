import { chromium } from 'playwright';
import { spawn } from 'child_process';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  await page.setViewportSize({ width: 1280, height: 960 });
  
  console.log('Navigating to game...');
  await page.goto('https://thai-monopoly.onrender.com', { waitUntil: 'networkidle' });
  
  console.log('Filling in name...');
  await page.fill('#input-player-name', 'HostTester');
  
  console.log('Clicking Create Room...');
  await page.click('#btn-create-room');
  
  console.log('Waiting for Lobby...');
  await page.waitForSelector('#room-code-display', { state: 'visible' });
  
  // Wait a moment for room code to be populated
  await page.waitForTimeout(1000);
  
  const roomCode = await page.textContent('#room-code-display');
  console.log(`Room created successfully! Code: ${roomCode.trim()}`);
  
  console.log('Spawning bots...');
  const botProcess = spawn('node', ['run-live-bots.js', roomCode.trim()], { stdio: 'inherit' });
  
  console.log('Waiting for Start Game button to be enabled...');
  await page.waitForFunction(() => {
      const startBtn = document.getElementById('btn-start-game');
      return startBtn && !startBtn.disabled;
  }, { timeout: 30000 });
  
  console.log('Bots are ready! Clicking Start Game...');
  await page.click('#btn-start-game');
  
  console.log('Waiting for board to render completely...');
  await page.waitForTimeout(5000);
  
  const screenshotPath = '/Users/home/.gemini/antigravity/brain/5252f702-bdb5-4806-811f-f4f29df26d48/game_screenshot.png';
  console.log('Taking screenshot to ' + screenshotPath);
  await page.screenshot({ path: screenshotPath });
  
  console.log('Closing browser and bots...');
  await browser.close();
  botProcess.kill();
  console.log('Done!');
})();
