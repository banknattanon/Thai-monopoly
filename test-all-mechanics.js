const assert = require('assert');
const GameEngine = require('./game/GameEngine');
const Board = require('./game/Board');
const Cards = require('./game/Cards');
const { Player } = require('./game/Player');

console.log('==================================================');
console.log('🧪 Running Complete Monopoly Game Mechanics Tests 🧪');
console.log('==================================================\n');

// Mock players and settings
const mockPlayers = [
    { id: 'p1', name: 'Alice', avatar: '🐘', color: { hex: '#EF4444' } },
    { id: 'p2', name: 'Bob', avatar: '🛺', color: { hex: '#3B82F6' } }
];
const settings = {
    startMoney: 15000,
    goBonus: 2000,
    turnTimer: 0,
    freeParkingRule: true
};

function runTest(testName, testFn) {
    try {
        testFn();
        console.log(`✅ [PASS] ${testName}`);
    } catch (err) {
        console.error(`❌ [FAIL] ${testName}`);
        console.error(err);
        process.exit(1);
    }
}

// ----------------------------------------------------
// 1. Building Houses & Hotels Test
// ----------------------------------------------------
runTest('Building Houses and Hotels Mechanics', () => {
    const engine = new GameEngine(mockPlayers, settings);
    
    // Alice owns the Brown group: space 1 (คลองสาน) and space 3 (บางลำพู)
    engine.propertyOwners[1] = 'p1';
    engine.propertyOwners[3] = 'p1';
    engine.players[0].properties = [1, 3];

    // Alice should be able to build on space 1
    assert.strictEqual(engine.canBuildHouse('p1', 1), true);
    
    // Build 1 house on space 1
    const build1 = engine.buildHouse('p1', 1);
    assert.strictEqual(build1.success, true);
    assert.strictEqual(engine.houses[1], 1);
    assert.strictEqual(engine.players[0].money, 15000 - 500); // 500 build cost

    // Alice CAN build another house on space 1 even without building on space 3
    assert.strictEqual(engine.canBuildHouse('p1', 1), true);
    
    // Alice should be able to build on space 3
    assert.strictEqual(engine.canBuildHouse('p1', 3), true);
    engine.buildHouse('p1', 3);
    
    // Now both have 1 house. Alice can build on space 1 again.
    assert.strictEqual(engine.canBuildHouse('p1', 1), true);
    
    // Build up to 3 houses on both
    engine.houses[1] = 3;
    engine.houses[3] = 3;
    
    // Verify hotel upgrade is valid
    assert.strictEqual(engine.canBuildHotel('p1', 1), true);
    const buildHotel = engine.buildHotel('p1', 1);
    assert.strictEqual(buildHotel.success, true);
    assert.strictEqual(engine.houses[1], 0);
    assert.strictEqual(engine.hotels[1], true);
});

// ----------------------------------------------------
// 2. Mortgage and Rent Mechanics
// ----------------------------------------------------
runTest('Mortgage & Rent Payment System', () => {
    const engine = new GameEngine(mockPlayers, settings);

    // Alice owns space 1 (unimproved, no group completeness)
    engine.propertyOwners[1] = 'p1';
    engine.players[0].properties = [1];
    
    // Bob lands on space 1
    engine.players[1].position = 1;
    const rentAmount = engine.calculateRent(1, 7);
    assert.strictEqual(rentAmount, 20); // Base rent of Khlong San is ฿20

    // Pay Rent
    const rentPay = engine.payRent('p2', 'p1', rentAmount);
    assert.strictEqual(rentPay.success, true);
    assert.strictEqual(engine.players[0].money, 15000 + 20);
    assert.strictEqual(engine.players[1].money, 15000 - 20);

    // Alice mortgages space 1
    const mort = engine.mortgageProperty('p1', 1);
    assert.strictEqual(mort.success, true);
    assert.strictEqual(engine.board[1].isMortgaged, true);
    assert.strictEqual(engine.players[0].money, 15020 + 300); // Received 50% of ฿600 = ฿300

    // Mortgaged property rent should be ฿0
    assert.strictEqual(engine.calculateRent(1, 7), 0);

    // Alice unmortgages space 1
    const unmort = engine.unmortgageProperty('p1', 1);
    assert.strictEqual(unmort.success, true);
    assert.strictEqual(engine.board[1].isMortgaged, false);
    assert.strictEqual(engine.players[0].money, 15320 - 330); // paid ฿330 (300 + 10%)
});

// ----------------------------------------------------
// 3. Jail Mechanics
// ----------------------------------------------------
runTest('Jail Actions & Releases', () => {
    const engine = new GameEngine(mockPlayers, settings);

    // Alice is sent to jail
    engine.sendToJail('p1');
    assert.strictEqual(engine.players[0].inJail, true);
    assert.strictEqual(engine.players[0].position, 10);

    // Pay jail fine
    const payFine = engine.payJailFine('p1');
    assert.strictEqual(payFine.success, true);
    assert.strictEqual(engine.players[0].inJail, false);
    assert.strictEqual(engine.players[0].money, 15000 - 500);

    // Bob is sent to jail, tries rolling for double
    engine.sendToJail('p2');
    
    // Mock Math.random to avoid double roll flakiness
    let count = 0;
    const originalRandom = Math.random;
    Math.random = () => {
        count++;
        return count % 2 === 0 ? 0.1 : 0.8; // rolls 5 and 1
    };
    
    // Simulate attemptJailRoll
    const jailRoll = engine.attemptJailRoll('p2');
    Math.random = originalRandom; // restore
    assert.strictEqual(engine.players[1].jailTurns, 1);
    
    // Bob uses card to escape
    engine.players[1].getOutOfJailCards = 1;
    const useCard = engine.useGetOutOfJailCard('p2');
    assert.strictEqual(useCard.success, true);
    assert.strictEqual(engine.players[1].inJail, false);
    assert.strictEqual(engine.players[1].getOutOfJailCards, 0);
});



// ----------------------------------------------------
// 6. Bankruptcy Mechanics
// ----------------------------------------------------
runTest('Player Bankruptcy & Liquidation', () => {
    const engine = new GameEngine(mockPlayers, settings);

    // Alice is low on cash, owns property space 1
    engine.players[0].money = 100;
    engine.propertyOwners[1] = 'p1';
    engine.players[0].properties = [1]; // mortgage value: 300

    // Bob is creditor. Alice owes Bob ฿2,000 rent
    // Process the rent payment through engine.payRent
    engine.payRent('p1', 'p2', 2000);

    // Alice net worth: -1900 (cash) + 300 (mortgage value) = -1600.
    // alice cannot afford the debt.
    assert.strictEqual(engine.getPlayerNetWorth('p1'), -1600);
    assert.strictEqual(engine.checkBankruptcy('p1'), false); // Cannot cover debt of 2000

    // Declare Bankruptcy to Bob
    engine.declareBankruptcy('p1', 'p2');
    
    // Alice is bankrupt. Properties and remaining cash transfer to Bob.
    assert.strictEqual(engine.players[0].isBankrupt, true);
    assert.strictEqual(engine.players[0].money, 0);
    assert.strictEqual(engine.players[0].properties.length, 0);

    assert.strictEqual(engine.propertyOwners[1], 'p2');
    assert.strictEqual(engine.players[1].money, 15000 + 100); // got Alice's ฿100 cash
    assert.ok(engine.players[1].properties.includes(1));      // got Alice's property 1

    // Game Over check should succeed (Bob wins)
    const gameOver = engine.checkGameOver();
    assert.strictEqual(gameOver.isOver, true);
    assert.strictEqual(gameOver.winnerId, 'p2');
});

// ----------------------------------------------------
// 7. Card Effects Mechanics
// ----------------------------------------------------
runTest('Chance & Community Chest Card Effects Loop', () => {
    const engine = new GameEngine(mockPlayers, settings);

    // Mock cards and test execution of ALL action types
    const testCards = [
        { id: 't1', effect: { action: 'move-to', destination: 39, collectGo: true } },
        { id: 't2', effect: { action: 'move-back', amount: 3 } },
        { id: 't3', effect: { action: 'receive', amount: 1000 } },
        { id: 't4', effect: { action: 'pay', amount: 500 } },
        { id: 't5', effect: { action: 'pay-all', amount: 200 } },
        { id: 't6', effect: { action: 'collect-all', amount: 100 } },
        { id: 't7', effect: { action: 'repair', house: 250, hotel: 1000 } }
    ];

    testCards.forEach(card => {
        // Run executeCardEffect for Alice
        const result = engine.executeCardEffect('p1', card);
        assert.ok(Array.isArray(result));
    });
});

// ----------------------------------------------------
// 8. Dice Odd/Even Selector Mechanics Test
// ----------------------------------------------------
runTest('Dice Odd/Even Selector Rules & Validation', () => {
    const engine = new GameEngine(mockPlayers, settings);

    // 1. Verify engine.rollDice('odd') always yields an odd sum (run 50 times to be sure)
    for (let i = 0; i < 50; i++) {
        engine.turnPhase = 'roll';
        const result = engine.rollDice('odd');
        const sum = result.dice1 + result.dice2;
        assert.strictEqual(sum % 2 !== 0, true, `Expected odd sum, got ${sum} (${result.dice1} + ${result.dice2})`);
    }

    // 2. Verify engine.rollDice('even') always yields an even sum (run 50 times to be sure)
    for (let i = 0; i < 50; i++) {
        engine.turnPhase = 'roll';
        const result = engine.rollDice('even');
        const sum = result.dice1 + result.dice2;
        assert.strictEqual(sum % 2 === 0, true, `Expected even sum, got ${sum} (${result.dice1} + ${result.dice2})`);
    }

    // 3. Verify passing matched custom dice works
    engine.turnPhase = 'roll';
    const matchOdd = engine.rollDice('odd', 3, 4);
    assert.strictEqual(matchOdd.total, 7);

    engine.turnPhase = 'roll';
    const matchEven = engine.rollDice('even', 2, 4);
    assert.strictEqual(matchEven.total, 6);

    // 4. Verify passing mismatched custom dice throws an error
    engine.turnPhase = 'roll';
    assert.throws(() => {
        engine.rollDice('odd', 2, 4);
    }, /Dice sum must be odd/);

    engine.turnPhase = 'roll';
    assert.throws(() => {
        engine.rollDice('even', 3, 4);
    }, /Dice sum must be even/);
    
    // 5. Verify invalid selection defaults to normal
    engine.turnPhase = 'roll';
    const normalResult = engine.rollDice('invalid_selection', 3, 4);
    assert.strictEqual(normalResult.total, 7);
});

console.log('\n==================================================');
console.log('🎉 ALL GAME MECHANICS TESTS COMPLETED SUCCESSFULLY! 🎉');
console.log('==================================================\n');
