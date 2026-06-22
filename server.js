const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const RoomManager = require('./game/RoomManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    pingTimeout: 30000,
    pingInterval: 15000,
    perMessageDeflate: true
});

const roomManager = new RoomManager(io);

// Serve static files from public directory
app.use(express.static('public'));

// Socket.IO connection handling
io.on('connection', (socket) => {
    roomManager.handleSocket(socket);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
