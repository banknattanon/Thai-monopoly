const { io } = require('socket.io-client');

// Live Server URL
const SERVER_URL = process.argv[3] || 'https://thai-monopoly.onrender.com';
const ROOM_CODE = process.argv[2] || 'UED94U';

const BOT_TEMPLATES = [
    { name: 'บอทหมาน้อย 🐶', avatar: '🐶', playerId: 'p_b3hrqu9c8', personality: 'aggressive' },
    { name: 'บอทกระต่าย 🐰', avatar: '🐰', playerId: 'p_jbjy4ylw9', personality: 'conservative' },
    { name: 'บอทไดโนน้อย 🦖', avatar: '🦖', playerId: 'p_7phfsmqpr', personality: 'aggressive' },
    { name: 'บอทชาไข่มุก 🧋', avatar: '🧋', playerId: 'p_boba8t3k1', personality: 'conservative' },
    { name: 'บอทลูกเจี๊ยบ 🐥', avatar: '🐥', playerId: 'p_chick9x2z', personality: 'aggressive' }
];

const BOT_COUNT = parseInt(process.argv[4]) || BOT_TEMPLATES.length;

const clients = [];
let gameState = null;

console.log('==================================================');
console.log('🤖 Thai Monopoly LIVE Bot Spawner 🤖');
console.log(`Connecting bots to ${SERVER_URL} for room ${ROOM_CODE}...`);
console.log('==================================================\n');

function connectBot(index) {
    const info = BOT_TEMPLATES[index];
    const socket = io(SERVER_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5
    });
    
    const botClient = { socket, name: info.name, id: info.playerId, position: 0, index, personality: info.personality, actionTimer: null };
    clients.push(botClient);

    socket.on('connect', () => {
        console.log(`[${info.name}] Connected to server! Socket ID: ${socket.id}`);
        console.log(`[${info.name}] Reconnecting/Joining room ${ROOM_CODE}...`);
        socket.emit('join-room', { roomCode: ROOM_CODE, playerName: info.name, avatar: info.avatar, playerId: info.playerId, profile: info.personality });
    });

    socket.on('room-joined', ({ roomState, playerId }) => {
        botClient.id = playerId;
        console.log(`[${info.name}] Joined room successfully! ID: ${playerId}. Readying up...`);
        socket.emit('player-ready', { ready: true });
    });

    socket.on('error-msg', ({ message }) => {
        console.error(`❌ [${info.name}] Server Error: ${message}`);
    });

    socket.on('game-started', ({ gameState: sync }) => {
        console.log(`🎉 [${info.name}] Game Started!`);
        handleGameStateSync(botClient, sync);
    });

    socket.on('game-state-sync', ({ gameState: sync }) => {
        handleGameStateSync(botClient, sync);
    });

    socket.on('disconnect', (reason) => {
        console.log(`⚠️ [${info.name}] Disconnected: ${reason}`);
    });
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

// Start bots
const count = Math.min(BOT_COUNT, BOT_TEMPLATES.length);
for (let i = 0; i < count; i++) {
    connectBot(i);
}

// Keep script alive
process.on('SIGINT', () => {
    console.log('Disconnecting all bots...');
    clients.forEach(c => c.socket.disconnect());
    process.exit(0);
});
