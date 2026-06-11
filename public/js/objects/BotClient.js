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
                playerId: this.playerId
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
            this.checkHouseBuilding();
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

        this.socket.on('auction-start', (data) => {
            this.handleAuction(data);
        });

        this.socket.on('bid-placed', (data) => {
            if (this.gameState && this.gameState.auctionState) {
                this.gameState.auctionState.highestBid = data.amount;
                this.gameState.auctionState.highestBidderId = data.playerId;
            }
            this.handleAuction(data);
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
                        this.socket.emit('roll-dice');
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
            this.socket.emit('roll-dice');
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
                    // Before ending turn, check if we can build houses
                    this.checkHouseBuilding();
                    setTimeout(() => {
                        this.socket.emit('end-turn');
                    }, 1000);
                }
            }
        }, 1500);
    }

    handleAuction(data) {
        if (!this.gameState) return;
        const me = this.getMe();
        if (!me) return;

        // If I am the highest bidder, do nothing
        if (this.gameState.auctionState && this.gameState.auctionState.highestBidderId === this.playerId) return;

        // Evaluate max bid
        const position = data.position || (this.gameState.auctionState ? this.gameState.auctionState.position : null);
        if (!position) return;
        
        const square = this.gameState.board[position];
        const basePrice = square.price;
        const currentBid = data.amount || 0;
        
        // Smart bid: up to 1.2x base price if we have lots of money, else 0.8x
        const maxBid = me.money > 2000 ? basePrice * 1.2 : basePrice * 0.8;
        
        if (currentBid < maxBid && me.money >= currentBid + 10) {
            const nextBid = currentBid === 0 ? Math.floor(basePrice * 0.5) : currentBid + 10;
            // Delay bid to look human
            setTimeout(() => {
                // Check if auction is still active
                if (this.gameState && this.gameState.auctionState && this.gameState.auctionState.highestBidderId !== this.playerId) {
                    this.socket.emit('place-bid', { amount: nextBid });
                }
            }, 1000 + Math.random() * 1500);
        }
    }

    checkHouseBuilding() {
        if (!this.gameState) return;
        const me = this.getMe();
        if (!me) return;

        // Don't build if we don't have much money
        if (me.money < 1000) return;

        // Find complete color groups
        const colorGroups = {
            'brown': [1, 3],
            'light-blue': [6, 8, 9],
            'pink': [11, 13, 14],
            'orange': [16, 18, 19],
            'red': [21, 23, 24],
            'yellow': [26, 27, 29],
            'green': [31, 32, 34],
            'dark-blue': [37, 39]
        };

        for (const [color, positions] of Object.entries(colorGroups)) {
            for (const pos of positions) {
                if (this.gameState.propertyOwners[pos] === this.playerId) {
                    const h = this.gameState.board[pos].houses || 0;
                    const isHotel = this.gameState.board[pos].hotel || false;
                    const totalH = isHotel ? 5 : h;
                    const buildCost = this.gameState.board[pos].buildCost;

                    // If we can afford to build and we haven't maxed out hotels
                    if (totalH < 5 && me.money - buildCost > 500) {
                        // Try to build
                        if (totalH === 4) {
                            this.socket.emit('build-hotel', { position: pos });
                        } else {
                            this.socket.emit('build-house', { position: pos });
                        }
                        // Only build one per check to avoid spamming
                        return;
                    }
                }
            }
        }
    }
}
