// BotClient.js
// Runs entirely on the client side to simulate a smart player.

const BOT_TEMPLATES = [
    { name: 'บอทหมาน้อย 🐶', avatar: 'dog', emoji: '🐶' },
    { name: 'บอทกระต่าย 🐰', avatar: 'rabbit', emoji: '🐰' },
    { name: 'บอทไดโนน้อย 🦖', avatar: 'dino', emoji: '🦖' },
    { name: 'บอทชาไข่มุก 🧋', avatar: 'milktea', emoji: '🧋' },
    { name: 'บอทลูกเจี๊ยบ 🐥', avatar: 'duck', emoji: '🐥' }
];

let botCounter = 0;

export default class BotClient {
    constructor(roomCode, serverUrl = window.location.origin) {
        this.roomCode = roomCode;
        this.serverUrl = serverUrl;
        
        // Pick template
        const template = BOT_TEMPLATES[botCounter % BOT_TEMPLATES.length];
        botCounter++;
        
        this.name = template.name;
        this.avatar = template.avatar;
        this.emoji = template.emoji;
        
        this.playerId = 'bot_' + Math.random().toString(36).substring(2, 9);
        this.isBankrupt = false;
        this.actionTimer = null;
        this.personality = 'normal'; // default personality
        this.socket = null;
        this.gameState = null;
    }

    connect() {
        // Use global io object provided by socket.io script in index.html
        this.socket = io(this.serverUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true
        });

        this.socket.on('connect', () => {
            console.log(`[Bot ${this.name}] Connected! Joining room ${this.roomCode}`);
            this.socket.emit('join-room', {
                roomCode: this.roomCode,
                playerName: this.name,
                avatar: this.emoji,
                playerId: this.playerId,
                profile: this.personality
            });
        });

        this.socket.on('room-joined', ({ playerId }) => {
            this.playerId = playerId;
            console.log(`[Bot ${this.name}] Joined room. Emitting ready...`);
            // Wait a moment then ready up
            setTimeout(() => {
                this.socket.emit('player-ready', { ready: true });
            }, 1000);
        });

        this.socket.on('game-state-sync', ({ gameState }) => {
            this.gameState = gameState;
        });

        this.socket.on('action-prompt', (data) => {
            if (data.type === 'build-option') {
                this.handleBuildAction(data.position);
            }
        });

        this.socket.on('game-started', ({ gameState }) => {
            this.gameState = gameState;
        });

        this.socket.on('turn-changed', ({ currentPlayerId }) => {
            if (!this.gameState) return;
            if (currentPlayerId === this.playerId) {
                // It's my turn!
                setTimeout(() => {
                    this.executeTurn();
                }, 1500); // 1.5 second delay for realism
            }
        });


    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    getMe() {
        if (!this.gameState) return null;
        return this.gameState.players.find(p => p.id === this.playerId);
    }

    executeTurn() {
        if (!this.gameState) return;
        const me = this.getMe();
        if (!me) return;

        // 1. Jail Actions
        if (me.inJail && this.gameState.turnPhase === 'roll') {
            if (me.money > 2000) {
                // Pay fine
                this.socket.emit('jail-action', { action: 'pay' });
                setTimeout(() => {
                    if (this.gameState.turnPhase === 'roll') {
                        this.socket.emit('roll-dice', { selection: 'normal' });
                        setTimeout(() => this.processLanding(), 2000);
                    }
                }, 1500);
            } else {
                // Try to roll
                this.socket.emit('jail-action', { action: 'roll' });
                setTimeout(() => this.processLanding(), 2000);
            }
            return;
        }

        // 2. Rolling Phase
        if (this.gameState.turnPhase === 'roll') {
            this.socket.emit('roll-dice', { selection: 'normal' });
            setTimeout(() => this.processLanding(), 2500); // wait for dice animation
        } else if (this.gameState.turnPhase === 'action' || this.gameState.turnPhase === 'takeover') {
            this.processLanding();
        } else if (this.gameState.turnPhase === 'end') {
            this.socket.emit('end-turn');
        }
    }

    processLanding() {
        if (!this.gameState) return;
        const me = this.getMe();
        if (!me) return;

        if (this.gameState.turnPhase === 'action' || this.gameState.turnPhase === 'takeover') {
            const currentPosition = me.position;
            const square = this.gameState.board[currentPosition];
            
            if (this.gameState.turnPhase === 'takeover') {
                const takeoverCost = this.gameState.currentTakeoverCost;
                const willLeaveCash = me.money - takeoverCost;
                
                // Aggressive takeover if leaving decent cash reserve
                if (willLeaveCash > 500) {
                    this.socket.emit('takeover-property');
                } else {
                    this.socket.emit('decline-takeover');
                }
            } else if (square && (square.type === 'property' || square.type === 'railroad' || square.type === 'utility')) {
                const ownerId = this.gameState.propertyOwners[currentPosition];
                if (!ownerId) {
                    const cost = square.price;
                    // Smart Buy Logic
                    let willBuy = false;
                    const willLeaveCash = me.money - cost;
                    
                    if (willLeaveCash > 300) {
                        willBuy = true;
                    } else if (willLeaveCash > 0) {
                        if (square.type === 'railroad') willBuy = true;
                        else willBuy = Math.random() > 0.5;
                    }

                    if (willBuy) {
                        this.socket.emit('buy-property', { position: currentPosition });
                    } else {
                        this.socket.emit('decline-property');
                    }
                }
            }
        }

        // After action is done, check what to do next
        setTimeout(() => {
            if (this.gameState && this.gameState.currentPlayerId === this.playerId) {
                if (this.gameState.turnPhase === 'roll') {
                    // Double rolled! Roll again!
                    this.executeTurn();
                } else if (this.gameState.turnPhase === 'end') {
                    // Before ending turn, check if money is negative and mortgage
                    this.autoMortgage();
                    setTimeout(() => {
                        this.socket.emit('end-turn');
                    }, 1000);
                }
            }
        }, 1500);
    }


    handleBuildAction(position) {
        if (!this.gameState) return;
        const me = this.getMe();
        if (!me) return;

        const sq = this.gameState.board[position];
        const h = sq.houses || 0;
        const isHotel = sq.hotel || false;
        const totalH = isHotel ? 5 : h;
        const buildCost = sq.buildCost;

        if (totalH < 5 && me.money - buildCost > 300) {
            if (totalH === 4) {
                this.socket.emit('build-hotel', { position });
            } else {
                this.socket.emit('build-house', { position });
            }
        }
    }

    autoMortgage() {
        if (!this.gameState) return;
        const me = this.getMe();
        if (!me || me.money >= 0) return;

        // Money is negative, try to mortgage properties
        const myProperties = [];
        for (let i = 0; i < this.gameState.board.length; i++) {
            if (this.gameState.propertyOwners[i] === this.playerId && !this.gameState.board[i].isMortgaged) {
                // Don't mortgage if there are houses on it, selling houses is not fully implemented for bots.
                if (!this.gameState.board[i].houses && !this.gameState.board[i].hotel) {
                    myProperties.push(i);
                }
            }
        }

        // Sort by price ascending to mortgage cheap properties first
        myProperties.sort((a, b) => this.gameState.board[a].price - this.gameState.board[b].price);

        for (let pos of myProperties) {
            if (me.money >= 0) break;
            this.socket.emit('mortgage-property', { position: pos });
            // Simulate adding money instantly so loop knows when to stop
            me.money += Math.floor(this.gameState.board[pos].price / 2);
        }
    }
}
