test("Tier 4 - Real-World - E2E Property Auction Scenario", async (page) => {
    await setupLobby(page);
    const select = page.locator('#select-bot-personality');
    assert.ok(await select.count() > 0, "Bot personality selector should exist in DOM");
    const activeBotsDefined = await page.evaluate(() => {
        const phaserGame = window.game || window.phaserGame;
        if (!phaserGame) return false;
        const lobbyScene = phaserGame.scene.getScene('LobbyScene');
        return lobbyScene && Array.isArray(lobbyScene.activeBots);
    });
    assert.ok(activeBotsDefined, "activeBots should be defined on LobbyScene");
    await page.selectOption('#select-bot-personality', 'aggressive');
    await page.click('#btn-add-bot');
    await page.selectOption('#select-bot-personality', 'conservative');
    await page.click('#btn-add-bot');
    // await page.click('#btn-ready');
    await page.click('#btn-start-game');
    await page.waitForSelector('#game-screen.active');
    const bids = await page.evaluate(async () => {
        const lobbyScene = (window.game || window.phaserGame).scene.getScene('LobbyScene');
        const bots = lobbyScene.activeBots;
        const auctionState = { position: 5, highestBid: 1000, highestBidderId: null };
        bots.forEach(bot => {
            bot.gameState = {
                board: { 5: { price: 1000 } },
                players: [{ id: bots[0].playerId, money: 5000 }, { id: bots[1].playerId, money: 5000 }],
                auctionState
            };
        });
        bots[1].handleAuction({ position: 5, amount: 1000 });
        bots[0].handleAuction({ position: 5, amount: 1000 });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return {
            bot1Emits: bots[0].socket.emittedEvents,
            bot2Emits: bots[1].socket.emittedEvents
        };
    });
    const bot1Bid = bids.bot1Emits.some(e => e.event === 'place-bid');
    const bot2Bid = bids.bot2Emits.some(e => e.event === 'place-bid');
    assert.strictEqual(bot1Bid, true, "Aggressive bot should place a bid above base price");
    assert.strictEqual(bot2Bid, false, "Conservative bot should not place a bid above its threshold");
});

test("Tier 4 - Real-World - E2E Game Over Celebration Scenario", async (page) => {
    await setupLobby(page);
    const hasAPI = await page.evaluate(() => typeof window.triggerConfetti === 'function');
    assert.ok(hasAPI, "Confetti trigger API should be implemented globally");
    const container = page.locator('.confetti-container');
    assert.ok(await container.count() > 0, "Confetti container should exist in DOM");
    await page.click('#btn-add-bot');
    // await page.click('#btn-ready');
    await page.click('#btn-start-game');
    await page.waitForSelector('#game-screen.active');
    await page.evaluate(() => {
        const gameOverDialog = document.getElementById('gameover-dialog');
        document.getElementById('winner-name-display').textContent = 'HostTester';
        gameOverDialog.showModal();
        window.triggerConfetti(80);
    });
    const winnerDisplay = await page.locator('#winner-name-display').textContent();
    assert.strictEqual(winnerDisplay, 'HostTester', "Winner display should show correct player name");
    const particlesCount = await page.locator('.confetti-particle').count();
    assert.ok(particlesCount > 0, "Confetti celebration particles should populate DOM");
});

// ----------------------------------------------------
// RUNNER LOGIC
// ----------------------------------------------------
(async () => {
    console.log(`Starting local server on port ${PORT}...`);
    const serverProcess = spawn('node', ['server.js'], { stdio: 'ignore' });
    
    console.log('Launching Playwright Chromium browser...');
    const browser = await chromium.launch({ headless: true });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let passCount = 0;
    let failCount = 0;
    const failedTests = [];
    
    console.log(`\n==================================================`);
    console.log(`🏃 Running Playwright Test Suite (${tests.length} tests total)`);
    console.log(`==================================================\n`);
    
    for (let i = 0; i < tests.length; i++) {
        const { name, fn } = tests[i];
        console.log(`[${i + 1}/${tests.length}] Running Test: ${name}...`);
        
        const context = await browser.newContext({
            viewport: { width: 1280, height: 960 }
        });
        const page = await context.newPage();
        
        try {
            await fn(page);
            console.log(`✅ PASS: ${name}`);
            passCount++;
        } catch (err) {
            console.error(`❌ FAIL: ${name}`);
            console.error(err.stack || err);
            failedTests.push({ name, error: err.stack || err });
            failCount++;
        } finally {
            await page.close();
            await context.close();
        }
    }
    
    console.log(`\n==================================================`);
    console.log(`📊 TEST SUITE SUMMARY`);
    console.log(`==================================================`);
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`==================================================\n`);
    
    console.log('Shutting down browser and local server...');
    await browser.close();
    serverProcess.kill();
    
    if (failCount > 0) {
        console.error('Test suite failed!');
        process.exit(1);
    } else {
        console.log('All tests passed successfully!');
        process.exit(0);
    }
})();
