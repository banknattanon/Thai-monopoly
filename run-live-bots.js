const { io } = require('socket.io-client');

// Live Server URL
const SERVER_URL = 'https://thai-monopoly.onrender.com';
const ROOM_CODE = 'W25ANR';

const BOT_TEMPLATES = [
    { name: 'บอทหมาน้อย 🐶', avatar: '🐶' },
    { name: 'บอทกระต่าย 🐰', avatar: '🐰' },
    { name: 'บอทไดโนน้อย 🦖', avatar: '🦖' }
];

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
    
    const botClient = { socket, name: info.name, id: null, position: 0, index };
    clients.push(botClient);

    socket.on('connect', () => {
        console.log(`[${info.name}] Connected to server! Socket ID: ${socket.id}`);
        console.log(`[${info.name}] Joining room ${ROOM_CODE}...`);
        socket.emit('join-room', { roomCode: ROOM_CODE, playerName: info.name, avatar: info.avatar });
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
        gameState = sync;
    });

    socket.on('game-state-sync', ({ gameState: sync }) => {
        gameState = sync;
    });

    socket.on('turn-changed', ({ currentPlayerId }) => {
        if (!gameState) return;
        
        // Find if this bot is the active player
        if (currentPlayerId === botClient.id) {
            console.log(`\n🤖 [${info.name}] It's my turn!`);
            setTimeout(() => {
                triggerBotAction(botClient);
            }, 2000); // 2 seconds delay for visual pacing in UI
        }
    });

    socket.on('disconnect', (reason) => {
        console.log(`⚠️ [${info.name}] Disconnected: ${reason}`);
    });
}

function triggerBotAction(botClient) {
    if (!gameState) return;

    const currentPlayer = gameState.players.find(p => p.id === botClient.id);
    if (!currentPlayer) return;

    const socket = botClient.socket;
    console.log(`🤖 [${botClient.name}] Turn phase: ${gameState.turnPhase}`);

    // 1. Jail Decision Check
    if (currentPlayer.inJail && gameState.turnPhase === 'roll') {
        console.log(`[Jail Action] ${botClient.name} is in jail.`);
        if (currentPlayer.money > 2000) {
            console.log(`[Jail Action] ${botClient.name} pays fine.`);
            socket.emit('jail-action', { action: 'pay' });
            
            setTimeout(() => {
                socket.emit('roll-dice');
                setTimeout(() => {
                    processLandingDecision(botClient);
                }, 2000);
            }, 2000);
        } else {
            console.log(`[Jail Action] ${botClient.name} attempts roll to escape.`);
            socket.emit('jail-action', { action: 'roll' });
            
            setTimeout(() => {
                processLandingDecision(botClient);
            }, 2000);
        }
        return;
    }

    // 2. Dice rolling phase
    if (gameState.turnPhase === 'roll') {
        console.log(`🤖 [${botClient.name}] Rolling dice...`);
        socket.emit('roll-dice');
        
        setTimeout(() => {
            processLandingDecision(botClient);
        }, 2000);
    }
}

function processLandingDecision(botClient) {
    if (!gameState) return;
    
    const currentPlayer = gameState.players.find(p => p.id === botClient.id);
    if (!currentPlayer) return;
    
    const currentPosition = currentPlayer.position;
    const square = gameState.board[currentPosition];
    const socket = botClient.socket;
    
    if (square && (square.type === 'property' || square.type === 'railroad' || square.type === 'utility')) {
        const ownerId = gameState.propertyOwners[currentPosition];
        
        if (!ownerId) {
            // Unowned! Buy if we have money
            const cost = square.price;
            if (currentPlayer.money >= cost) {
                console.log(`🤖 [${botClient.name}] Buying property ${square.name} for ฿${cost}`);
                socket.emit('buy-property', { position: currentPosition });
            } else {
                console.log(`🤖 [${botClient.name}] Cannot afford ${square.name} (Price: ฿${cost}, Cash: ฿${currentPlayer.money}). Declining...`);
                socket.emit('decline-property');
            }
        }
    }

    // End turn
    setTimeout(() => {
        console.log(`🤖 [${botClient.name}] Ending turn.`);
        socket.emit('end-turn');
    }, 2000);
}

// Start 3 bots
for (let i = 0; i < 3; i++) {
    connectBot(i);
}

// Keep script alive
process.on('SIGINT', () => {
    console.log('Disconnecting all bots...');
    clients.forEach(c => c.socket.disconnect());
    process.exit(0);
});
