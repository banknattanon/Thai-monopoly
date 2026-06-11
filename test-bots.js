const { io } = require('socket.io-client');

// Target server
const SERVER_URL = 'http://localhost:3000';
const NUM_BOTS = 4;
const MAX_TURNS = 60; // Max turn switches before ending the test

console.log('==================================================');
console.log('🤖 Thai Monopoly Multiplayer Bot Test Runner 🤖');
console.log(`Connecting ${NUM_BOTS} bots to ${SERVER_URL}...`);
console.log('==================================================\n');

// Avatars and Names for Bots
const BOT_TEMPLATES = [
    { name: 'Bot_Chang_Host', avatar: '🐘' },
    { name: 'Bot_TukTuk', avatar: '🛺' },
    { name: 'Bot_Noodle', avatar: '🍜' },
    { name: 'Bot_Diamond', avatar: '💎' }
];

const clients = [];
let roomCode = '';
let currentTurnCount = 0;
let gameState = null;

// Connect all bots
async function startTest() {
    // 1. Connect the Host (Bot 1)
    const hostInfo = BOT_TEMPLATES[0];
    const hostSocket = io(SERVER_URL);
    clients.push({ socket: hostSocket, name: hostInfo.name, id: null, position: 0 });

    hostSocket.on('connect', () => {
        console.log(`[Host] Connected! Creating room as ${hostInfo.name}...`);
        hostSocket.emit('create-room', { playerName: hostInfo.name, avatar: hostInfo.avatar });
    });

    hostSocket.on('room-created', ({ roomCode: code, playerId }) => {
        roomCode = code;
        clients[0].id = playerId;
        console.log(`[Host] Room created successfully! Code: \x1b[33m${roomCode}\x1b[0m, Host Player ID: ${playerId}`);

        // 2. Connect Guest Bots (2, 3, 4)
        for (let i = 1; i < NUM_BOTS; i++) {
            connectGuest(i);
        }
    });

    hostSocket.on('room-update', ({ players }) => {
        console.log(`[Room Update] Players in lobby: ${players.map(p => `${p.name} (${p.ready ? 'Ready' : 'Not Ready'})`).join(', ')}`);
        
        // Host checks if all other players are joined and ready
        const guests = players.filter(p => p.id !== clients[0].id);
        const guestsReady = guests.length === NUM_BOTS - 1 && guests.every(p => p.ready);
        
        if (guestsReady && roomCode) {
            console.log(`[Host] All guests ready. Starting the game...`);
            hostSocket.emit('start-game');
        }
    });

    hostSocket.on('game-started', ({ gameState: initialSync }) => {
        console.log('\n==================================================');
        console.log('🎉 GAME STARTED! Initializing Gameplay Simulation 🎉');
        console.log('==================================================\n');
        gameState = initialSync;
        logPlayersState();
        triggerNextBotAction();
    });

    hostSocket.on('dice-rolled', ({ playerId, dice1, dice2, isDouble }) => {
        const bot = getBotById(playerId);
        console.log(`🎲 [\x1b[35m${bot ? bot.name : playerId}\x1b[0m] Rolled dice: ${dice1} + ${dice2} = ${dice1 + dice2} ${isDouble ? '(DOUBLE!)' : ''}`);
    });

    hostSocket.on('player-moved', ({ playerId, from, to, passedGo }) => {
        const bot = getBotById(playerId);
        if (bot) bot.position = to;
        console.log(`🏃 [\x1b[35m${bot ? bot.name : playerId}\x1b[0m] Moved from tile ${from} to tile ${to} ${passedGo ? '(Passed GO! ฿2000 bonus)' : ''}`);
    });

    hostSocket.on('money-changed', ({ playerId, amount, reason, money }) => {
        const bot = getBotById(playerId);
        const color = amount >= 0 ? '\x1b[32m' : '\x1b[31m';
        const sign = amount >= 0 ? '+' : '';
        console.log(`💰 [\x1b[35m${bot ? bot.name : playerId}\x1b[0m] ${color}${sign}฿${amount.toLocaleString()}\x1b[0m (Reason: ${reason}) | New Balance: ฿${money.toLocaleString()}`);
    });

    hostSocket.on('property-bought', ({ playerId, position, cost }) => {
        const bot = getBotById(playerId);
        console.log(`🏠 [\x1b[35m${bot ? bot.name : playerId}\x1b[0m] Purchased Property on space ${position} for ฿${cost}`);
    });

    hostSocket.on('card-drawn', ({ playerId, cardType, card }) => {
        const bot = getBotById(playerId);
        console.log(`🃏 [\x1b[35m${bot ? bot.name : playerId}\x1b[0m] Drew ${cardType.toUpperCase()} Card: "${card.text}" / "${card.textEn}"`);
    });

    hostSocket.on('player-jailed', ({ playerId, reason }) => {
        const bot = getBotById(playerId);
        console.log(`🔒 [\x1b[31m${bot ? bot.name : playerId} SENT TO JAIL\x1b[0m] (Reason: ${reason})`);
    });

    hostSocket.on('player-freed', ({ playerId, method }) => {
        const bot = getBotById(playerId);
        console.log(`🔓 [\x1b[32m${bot ? bot.name : playerId} FREED FROM JAIL\x1b[0m] (Method: ${method})`);
    });

    hostSocket.on('player-bankrupt', ({ playerId, reason }) => {
        const bot = getBotById(playerId);
        console.log(`💀 [\x1b[31m${bot ? bot.name : playerId} DECLARED BANKRUPTCY\x1b[0m] (Reason: ${reason})`);
    });

    hostSocket.on('game-state-sync', ({ gameState: sync }) => {
        gameState = sync;
    });

    hostSocket.on('turn-changed', ({ currentPlayerId }) => {
        currentTurnCount++;
        const activeBot = getBotById(currentPlayerId);
        console.log(`\n------------------ Turn ${currentTurnCount} (Current: \x1b[36m${activeBot ? activeBot.name : currentPlayerId}\x1b[0m) ------------------`);
        
        if (currentTurnCount >= MAX_TURNS) {
            console.log(`\n⚠️ Test reached maximum turn limit (${MAX_TURNS}). Terminating simulation.`);
            shutdownAll();
            return;
        }

        // Give a tiny timeout for realism and logs readability
        setTimeout(() => {
            triggerNextBotAction();
        }, 1500);
    });

    hostSocket.on('game-over', ({ winnerId, stats }) => {
        const winner = getBotById(winnerId);
        console.log('\n==================================================');
        console.log(`🏆 GAME OVER! Winner: \x1b[32m${winner ? winner.name : winnerId}\x1b[0m 🏆`);
        console.log('==================================================');
        console.log('Final Stats:', JSON.stringify(stats, null, 2));
        shutdownAll();
    });

    hostSocket.on('error-msg', ({ message }) => {
        console.log(`❌ [Server Error] ${message}`);
    });
}

function connectGuest(index) {
    const info = BOT_TEMPLATES[index];
    const socket = io(SERVER_URL);
    clients.push({ socket, name: info.name, id: null, position: 0 });

    socket.on('connect', () => {
        console.log(`[${info.name}] Connected! Joining room ${roomCode}...`);
        socket.emit('join-room', { roomCode, playerName: info.name, avatar: info.avatar });
    });

    socket.on('room-joined', ({ roomState }) => {
        const playerSelf = roomState.players.find(p => p.name === info.name);
        clients[index].id = playerSelf.id;
        console.log(`[${info.name}] Joined room successfully. My Player ID: ${playerSelf.id}. Readying up...`);
        socket.emit('player-ready', { ready: true });
    });
}

function getBotById(id) {
    return clients.find(c => c.id === id);
}

function logPlayersState() {
    if (!gameState) return;
    console.log('Current Players Standings:');
    gameState.players.forEach(p => {
        console.log(` - ${p.name} (ID: ${p.id}): ฿${p.money.toLocaleString()} | Space: ${p.position} | Bankrupt: ${p.isBankrupt}`);
    });
    console.log('');
}

function triggerNextBotAction() {
    if (!gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer) return;

    const botObj = getBotById(currentPlayer.id);
    if (!botObj) return;

    const socket = botObj.socket;
    console.log(`🤖 Action triggered for bot: ${botObj.name} | Phase: ${gameState.turnPhase}`);

    // 1. Jail Decision Check
    if (currentPlayer.inJail && gameState.turnPhase === 'roll') {
        console.log(`[Jail Action] ${botObj.name} is in jail. Deciding action...`);
        if (currentPlayer.money > 2000) {
            console.log(`[Jail Action] ${botObj.name} can afford fine. Emitting jail fine pay...`);
            socket.emit('jail-action', { action: 'pay' });
            
            // Wait, then roll, then decide landing and end turn
            setTimeout(() => {
                socket.emit('roll-dice');
                setTimeout(() => {
                    processLandingDecision(botObj, socket);
                }, 1000);
            }, 1000);
        } else {
            console.log(`[Jail Action] ${botObj.name} is low on cash. Emitting roll double escape...`);
            socket.emit('jail-action', { action: 'roll' });
            
            // Server rolls automatically for double, we just need to wait, decide landing, and end turn
            setTimeout(() => {
                processLandingDecision(botObj, socket);
            }, 1000);
        }
        return;
    }

    // 2. Dice rolling phase
    if (gameState.turnPhase === 'roll') {
        socket.emit('roll-dice');
        
        // Check landing buy options after roll has been processed on server
        setTimeout(() => {
            processLandingDecision(botObj, socket);
        }, 1000);
    }
}

function processLandingDecision(botObj, socket) {
    if (!gameState) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const currentPosition = currentPlayer.position;
    
    // Check if the current square is an unowned property
    const square = gameState.board[currentPosition];
    
    if (square && (square.type === 'property' || square.type === 'railroad' || square.type === 'utility')) {
        const ownerId = gameState.propertyOwners[currentPosition];
        
        if (!ownerId) {
            // Unowned! Let's decide to buy if we have enough cash
            const cost = square.price;
            if (currentPlayer.money >= cost) {
                console.log(`🤖 [Decision] ${botObj.name} decides to buy property ${square.name} for ฿${cost}`);
                socket.emit('buy-property', { position: currentPosition });
            } else {
                console.log(`🤖 [Decision] ${botObj.name} cannot afford property ${square.name} (Cost: ฿${cost}, Money: ฿${currentPlayer.money}). Declining...`);
                socket.emit('decline-property');
            }
        }
    }

    // Wait a brief moment, then end turn
    setTimeout(() => {
        console.log(`🤖 [Decision] ${botObj.name} ending turn.`);
        socket.emit('end-turn');
    }, 1000);
}

function shutdownAll() {
    console.log('\nDisconnecting all bot clients and shutting down simulation...');
    clients.forEach(c => {
        if (c.socket.connected) {
            c.socket.disconnect();
        }
    });
    console.log('Done.');
    process.exit(0);
}

// Start simulation
startTest();
