// SocketManager - Client-side Socket.IO Singleton Wrapper

class SocketManager {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
    }

    /**
     * Connects to the Socket.IO server.
     * Uses current origin automatically.
     */
    connect() {
        if (this.socket) return this.socket;

        // io is loaded globally from the script tag in index.html
        if (typeof io === 'undefined') {
            console.error('Socket.IO client library not loaded!');
            return null;
        }

        this.socket = io({
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            transports: ['websocket']
        });

        // Setup generic connect logs
        this.socket.on('connect', () => {
            console.log('Connected to server, socket ID:', this.socket.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.warn('Disconnected from server:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
        });

        // Re-attach all existing listeners if reconnected
        for (const [event, callbacks] of this.listeners.entries()) {
            this.socket.removeAllListeners(event);
            callbacks.forEach(cb => {
                this.socket.on(event, cb);
            });
        }

        return this.socket;
    }

    /**
     * Listen to a server event.
     * @param {string} event
     * @param {Function} callback
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);

        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    /**
     * Stop listening to a server event.
     * @param {string} event
     * @param {Function} callback
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }

        if (this.socket) {
            this.socket.off(event, callback);
        }
    }

    /**
     * Send event to the server.
     * @param {string} event
     * @param {Object} [payload]
     */
    emit(event, payload = {}) {
        if (!this.socket) {
            this.connect();
        }
        if (this.socket) {
            this.socket.emit(event, payload);
        } else {
            console.error(`Cannot emit ${event}, socket not initialized.`);
        }
    }

    // === Room Events ===
    createRoom(playerName, avatar) {
        this.emit('create-room', { playerName, avatar });
    }

    joinRoom(roomCode, playerName, avatar, playerId = null) {
        this.emit('join-room', { roomCode, playerName, avatar, playerId });
    }

    setReady(ready) {
        this.emit('player-ready', { ready });
    }

    updateSettings(settings) {
        this.emit('update-settings', settings);
    }

    startGame() {
        this.emit('start-game');
    }

    // === Game Play Events ===
    rollDice(selection = 'normal', dice1 = null, dice2 = null) {
        const payload = { selection };
        if (dice1 !== null) payload.dice1 = dice1;
        if (dice2 !== null) payload.dice2 = dice2;
        this.emit('roll-dice', payload);
    }

    buyProperty(position) {
        this.emit('buy-property', { position });
    }

    takeoverProperty() {
        this.emit('takeover-property');
    }

    declineTakeover() {
        this.emit('decline-takeover');
    }

    declineProperty() {
        this.emit('decline-property');
    }



    buildHouse(position) {
        this.emit('build-house', { position });
    }

    buildHotel(position) {
        this.emit('build-hotel', { position });
    }

    mortgageProperty(position) {
        this.emit('mortgage-property', { position });
    }

    unmortgageProperty(position) {
        this.emit('unmortgage-property', { position });
    }

    endTurn() {
        this.emit('end-turn');
    }

    declareBankruptcy(targetId) {
        this.emit('declare-bankruptcy', { targetId });
    }

    // === Trade Events ===
    proposeTrade(targetId, offer, request) {
        this.emit('trade-propose', { targetId, offer, request });
    }

    respondTrade(tradeId, accepted) {
        this.emit('trade-respond', { tradeId, accepted });
    }

    // === Chat & Reaction Events ===
    sendChat(message) {
        this.emit('send-chat', { message });
    }

    sendReaction(emoji) {
        this.emit('send-reaction', { emoji });
    }

    // === Jail Events ===
    jailAction(action) {
        this.emit('jail-action', { action }); // 'pay' | 'card' | 'roll'
    }
}

const socketManager = new SocketManager();
export default socketManager;
export { socketManager };
