const GameEngine = require('./game/GameEngine');
const engine = new GameEngine([{id: 'p1', name: 'Player 1', avatar: '1', color: {hex: '#000'}}], {});

console.log("Turn phase:", engine.turnPhase);
console.log("Doubles count:", engine.doublesCount);

// 1st double
console.log("\nRoll 1:");
let res = engine.rollDice('normal', 2, 2);
console.log(res);
console.log("rolledDoublesExtraTurn:", engine.rolledDoublesExtraTurn);
console.log("Turn phase before endTurnPhase:", engine.turnPhase);
engine.endTurnPhase();
console.log("Turn phase after endTurnPhase:", engine.turnPhase);

