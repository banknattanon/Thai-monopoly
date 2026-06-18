const { io } = require('socket.io-client');

// Target server
const SERVER_URL = 'http://localhost:3000';
const NUM_BOTS = 4;
const MAX_TURNS = 60; // Max turn switches before ending the test

console.log('==================================================');
console.log('🤖 Thai Monopoly Multiplayer Bot Test Runner 🤖');
console.log(`Connecting ${NUM_BOTS} bots to ${SERVER_URL}...`);
console.log('==================================================\n');

// Avatars and Names for Bots with Personality Configuration
const BOT_TEMPLATES = [
    { name: 'Bot_Kitten_Host', avatar: '🐱', personality: 'aggressive' },
    { name: 'Bot_Puppy', avatar: '🐶', personality: 'conservative' },
    { name: 'Bot_Bunny', avatar: '🐰', personality: 'aggressive' },
    { name: 'Bot_Dino', avatar: '🦖', personality: 'conservative' }
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
    const hostClient = { socket: hostSocket, name: hostInfo.name, id: null, position: 0, personality: hostInfo.personality, actionTimer: null };
    clients.push(hostClient);

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
        handleGameStateSync(hostClient, initialSync);
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
        handleGameStateSync(hostClient, sync);
    });

    hostSocket.on('turn-changed', ({ currentPlayerId }) => {
        currentTurnCount++;
        const activeBot = getBotById(currentPlayerId);
        console.log(`\n------------------ Turn ${currentTurnCount} (Current: \x1b[36m${activeBot ? activeBot.name : currentPlayerId}\x1b[0m) ------------------`);
        
        if (currentTurnCount >= MAX_TURNS) {
            console.log(`\n⚠️ Test reached maximum turn limit (${MAX_TURNS}). Terminating simulation.`);
            shutdownAll();
        }
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
    const guestClient = { socket, name: info.name, id: null, position: 0, personality: info.personality, actionTimer: null };
    clients.push(guestClient);

    socket.on('connect', () => {
        console.log(`[${info.name}] Connected! Joining room ${roomCode}...`);
        socket.emit('join-room', { roomCode, playerName: info.name, avatar: info.avatar, profile: info.personality });
    });

    socket.on('room-joined', ({ roomState }) => {
        const playerSelf = roomState.players.find(p => p.name === info.name);
        guestClient.id = playerSelf.id;
        console.log(`[${info.name}] Joined room successfully. My Player ID: ${playerSelf.id}. Readying up...`);
        socket.emit('player-ready', { ready: true });
    });

    socket.on('game-state-sync', ({ gameState: sync }) => {
        gameState = sync;
        handleGameStateSync(guestClient, sync);
    });

    socket.on('game-started', ({ gameState: sync }) => {
        gameState = sync;
        handleGameStateSync(guestClient, sync);
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

function handleGameStateSync(botClient, syncState) {
    gameState = syncState;

    // Clear any pending action timer
    if (botClient.actionTimer) {
        clearTimeout(botClient.actionTimer);
        botClient.actionTimer = null;
    }

    const action = getNextAction(botClient);
    if (action) {
        botClient.actionTimer = setTimeout(() => {
            executeAction(botClient, action);
        }, 1000);
    }
}

function getUpgradeAction(botClient, currentPlayer) {
    const COLOR_GROUPS = {
        brown:     [1, 3],
        lightblue: [6, 8, 9],
        pink:      [11, 13, 14],
        orange:    [16, 18, 19],
        red:       [21, 23, 24],
        yellow:    [26, 27, 29],
        green:     [31, 32, 34],
        darkblue:  [37, 39]
    };

    const reserveThreshold = botClient.personality === 'conservative' ? 5000 : 0;

    for (const [color, positions] of Object.entries(COLOR_GROUPS)) {
        const ownsAll = positions.every(pos => gameState.propertyOwners[pos] === botClient.id);
        if (ownsAll) {
            for (const pos of positions) {
                const square = gameState.board[pos];
                const houses = square.houses || 0;
                const hotel = square.hotel;
                const isMortgaged = square.isMortgaged;
                const buildCost = square.buildCost;

                if (!isMortgaged && !hotel) {
                    if (houses < 4) {
                        if (currentPlayer.money - buildCost >= reserveThreshold) {
                            return { type: 'build-house', position: pos };
                        }
                    } else if (houses === 4) {
                        if (currentPlayer.money - buildCost >= reserveThreshold) {
                            return { type: 'build-hotel', position: pos };
                        }
                    }
                }
            }
        }
    }
    return null;
}

function getNextAction(botClient) {
    if (!gameState) return null;

    const currentPlayer = gameState.players.find(p => p.id === botClient.id);
    if (!currentPlayer || currentPlayer.isBankrupt) return null;



    // The remaining actions are only for the active player's turn
    const activePlayerId = gameState.players[gameState.currentPlayerIndex]?.id;
    if (activePlayerId !== botClient.id) {
        return null;
    }

    // 1. Jail Decision Check
    if (currentPlayer.inJail && gameState.turnPhase === 'roll') {
        if (currentPlayer.getOutOfJailCards > 0) {
            return { type: 'jail-action', action: 'card' };
        } else {
            const canPay = currentPlayer.money >= 500;
            const reserveThreshold = botClient.personality === 'conservative' ? 5000 : 0;
            if (canPay && (currentPlayer.money - 500 >= reserveThreshold)) {
                return { type: 'jail-action', action: 'pay' };
            } else {
                return { type: 'jail-action', action: 'roll' };
            }
        }
    }

    // 2. Dice rolling phase
    if (gameState.turnPhase === 'roll') {
        return { type: 'roll' };
    }

    // 3. Purchase landing check
    if (gameState.turnPhase === 'action') {
        const currentPosition = currentPlayer.position;
        const square = gameState.board[currentPosition];
        if (square && (square.type === 'property' || square.type === 'railroad' || square.type === 'utility')) {
            const ownerId = gameState.propertyOwners[currentPosition];
            if (!ownerId) {
                const cost = square.price;
                const reserveThreshold = botClient.personality === 'conservative' ? 5000 : 0;
                if (currentPlayer.money >= cost && (currentPlayer.money - cost >= reserveThreshold)) {
                    return { type: 'buy-property', position: currentPosition };
                } else {
                    return { type: 'decline-property' };
                }
            }
        }
    }

    // 4. Takeover decision
    if (gameState.turnPhase === 'takeover') {
        const cost = gameState.currentTakeoverCost;
        const reserveThreshold = botClient.personality === 'conservative' ? 5000 : 0;
        if (cost && currentPlayer.money >= cost && (currentPlayer.money - cost >= reserveThreshold)) {
            return { type: 'takeover-property' };
        } else {
            return { type: 'decline-takeover' };
        }
    }

    // 5. Upgrade & End turn
    if (gameState.turnPhase === 'end') {
        const upgrade = getUpgradeAction(botClient, currentPlayer);
        if (upgrade) {
            return upgrade;
        }
        return { type: 'end-turn' };
    }

    return null;
}

function executeAction(botClient, action) {
    const socket = botClient.socket;
    console.log(`🤖 [${botClient.name} (${botClient.personality})] Executing: ${JSON.stringify(action)}`);

    switch (action.type) {

        case 'jail-action':
            socket.emit('jail-action', { action: action.action });
            break;
        case 'roll':
            socket.emit('roll-dice');
            break;
        case 'buy-property':
            socket.emit('buy-property', { position: action.position });
            break;
        case 'decline-property':
            socket.emit('decline-property');
            break;
        case 'takeover-property':
            socket.emit('takeover-property');
            break;
        case 'decline-takeover':
            socket.emit('decline-takeover');
            break;
        case 'build-house':
            socket.emit('build-house', { position: action.position });
            break;
        case 'build-hotel':
            socket.emit('build-hotel', { position: action.position });
            break;
        case 'end-turn':
            socket.emit('end-turn');
            break;
    }
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
