const { io } = require('socket.io-client');

const SERVER_URL = process.argv[2] || 'https://thai-monopoly.onrender.com';
const BOT_COUNT = parseInt(process.argv[3]) || 4;

console.log(`\n🏠 Creating room on ${SERVER_URL} with ${BOT_COUNT} bots...\n`);

const hostSocket = io(SERVER_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5
});

let roomCode = null;
let hostPlayerId = null;

hostSocket.on('connect', () => {
    console.log(`✅ Connected! Socket: ${hostSocket.id}`);
    hostSocket.emit('create-room', { playerName: 'BotHost 🤖', avatar: '🐱' });
});

hostSocket.on('room-joined', ({ roomState, playerId }) => {
    roomCode = roomState.code;
    hostPlayerId = playerId;
    console.log(`\n🎯 ห้องสร้างเสร็จแล้ว! รหัสห้อง: ${roomCode}`);
    console.log(`🔗 เข้าเล่นได้ที่: ${SERVER_URL}?room=${roomCode}\n`);

    // Host readies up
    hostSocket.emit('player-ready', { ready: true });

    // Spawn bots
    const { spawn } = require('child_process');
    const botProcess = spawn('node', ['run-live-bots.js', roomCode, SERVER_URL, String(BOT_COUNT)], {
        stdio: 'inherit',
        cwd: __dirname
    });

    process.on('SIGINT', () => {
        console.log('\nShutting down...');
        botProcess.kill();
        hostSocket.disconnect();
        process.exit(0);
    });
});

// Auto-start game when a new player joins and all are ready
hostSocket.on('room-update', ({ players }) => {
    if (!roomCode) return;
    const totalPlayers = players.length;
    const allReady = players.every(p => p.ready || p.id === hostPlayerId);
    
    console.log(`📋 Room update: ${totalPlayers} players, all ready: ${allReady}`);
    
    // Start when we have host + bots + at least 1 human (BOT_COUNT + 2 total)
    // meaning someone new joined after the bots
    if (totalPlayers >= BOT_COUNT + 2 && allReady) {
        console.log(`\n🚀 All ${totalPlayers} players ready! Starting game in 3 seconds...`);
        setTimeout(() => {
            hostSocket.emit('start-game');
            console.log('🎮 Start game command sent!');
        }, 3000);
    }
});

hostSocket.on('game-started', () => {
    console.log('🎉 GAME STARTED!');
});

hostSocket.on('error-msg', ({ message }) => {
    console.error(`❌ Error: ${message}`);
});

hostSocket.on('disconnect', (reason) => {
    console.log(`⚠️ Host disconnected: ${reason}`);
});

// Listen for stdin commands
process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
    const cmd = data.trim().toLowerCase();
    if (cmd === 'start') {
        console.log('🚀 Manual start command received!');
        hostSocket.emit('start-game');
    }
});
