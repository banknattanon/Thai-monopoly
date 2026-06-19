const GameEngine = require('./GameEngine');
const { PLAYER_COLORS } = require('./Player');

class RoomManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map(); // roomCode -> roomState
        this.socketToPlayer = new Map(); // socketId -> { roomCode, playerId }
        this.disconnectTimers = new Map(); // playerId -> NodeJS.Timeout
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (this.rooms.has(code)) {
            return this.generateRoomCode();
        }
        return code;
    }

    getRoomPlayersForClient(room) {
        return room.players.map(p => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            color: p.color,
            ready: p.ready,
            isConnected: p.isConnected,
            isHost: p.id === room.host
        }));
    }

    getRoomStateForClient(room) {
        return {
            code: room.code,
            host: room.host,
            players: this.getRoomPlayersForClient(room),
            settings: room.settings,
            status: room.status,
            gameState: room.gameEngine ? room.gameEngine.getPublicState() : null
        };
    }

    createRoom(socket, playerName, avatar) {
        const roomCode = this.generateRoomCode();
        const playerId = 'p_' + Math.random().toString(36).substr(2, 9);
        const playerColor = PLAYER_COLORS[0]; // First player is red (host)

        const newRoom = {
            code: roomCode,
            host: playerId,
            players: [
                {
                    id: playerId,
                    name: playerName,
                    avatar: avatar,
                    color: playerColor,
                    ready: true, // Host is ready by default
                    isConnected: true,
                    socketId: socket.id
                }
            ],
            settings: {
                startMoney: 15000,
                goBonus: 2000,
                turnTimer: 0, // 0 = unlimited
                freeParkingRule: false
            },
            gameEngine: null,
            status: 'waiting',

        };

        this.rooms.set(roomCode, newRoom);
        this.socketToPlayer.set(socket.id, { roomCode, playerId });
        socket.join(roomCode);

        socket.emit('room-created', { roomCode, playerId });
        socket.emit('room-joined', { roomState: this.getRoomStateForClient(newRoom), playerId });
        this.io.to(roomCode).emit('room-update', { players: this.getRoomPlayersForClient(newRoom) });
    }

    joinRoom(socket, roomCode, playerName, avatar, playerId) {
        if (!roomCode) {
            socket.emit('error-msg', { message: 'Room code is required / ต้องระบุรหัสห้อง' });
            return;
        }
        roomCode = roomCode.toUpperCase();
        const room = this.rooms.get(roomCode);
        if (!room) {
            socket.emit('error-msg', { message: 'Room not found / ไม่พบห้องนี้' });
            return;
        }

        // Handle Reconnection
        if (playerId) {
            const existingPlayer = room.players.find(p => p.id === playerId);
            if (existingPlayer) {
                if (this.disconnectTimers.has(playerId)) {
                    clearTimeout(this.disconnectTimers.get(playerId));
                    this.disconnectTimers.delete(playerId);
                }

                // Remove old socket mapping
                this.socketToPlayer.delete(existingPlayer.socketId);

                // Update details
                existingPlayer.isConnected = true;
                existingPlayer.socketId = socket.id;
                this.socketToPlayer.set(socket.id, { roomCode, playerId });
                socket.join(roomCode);

                socket.emit('room-joined', { roomState: this.getRoomStateForClient(room), playerId });
                this.io.to(roomCode).emit('player-reconnected', { playerId });

                if (room.status === 'playing' && room.gameEngine) {
                    socket.emit('game-state-sync', { gameState: room.gameEngine.getFullState() });
                } else {
                    this.io.to(roomCode).emit('room-update', { players: this.getRoomPlayersForClient(room) });
                }
                return;
            }
        }

        // Regular Join Flow
        if (room.status !== 'waiting') {
            socket.emit('error-msg', { message: 'Game has already started / เกมเริ่มเล่นแล้ว' });
            return;
        }

        if (room.players.length >= 6) {
            socket.emit('error-msg', { message: 'Room is full / ห้องเต็มแล้ว' });
            return;
        }

        const newPlayerId = 'p_' + Math.random().toString(36).substr(2, 9);
        const usedColors = room.players.map(p => p.color.hex);
        const playerColor = PLAYER_COLORS.find(c => !usedColors.includes(c.hex)) || PLAYER_COLORS[room.players.length % PLAYER_COLORS.length];

        const newPlayer = {
            id: newPlayerId,
            name: playerName,
            avatar: avatar,
            color: playerColor,
            ready: false,
            isConnected: true,
            socketId: socket.id
        };

        room.players.push(newPlayer);
        this.socketToPlayer.set(socket.id, { roomCode, playerId: newPlayerId });
        socket.join(roomCode);

        socket.emit('room-joined', { roomState: this.getRoomStateForClient(room), playerId: newPlayerId });
        this.io.to(roomCode).emit('room-update', { players: this.getRoomPlayersForClient(room) });
    }

    leaveRoom(socket) {
        const association = this.socketToPlayer.get(socket.id);
        if (!association) return;

        const { roomCode, playerId } = association;
        this.socketToPlayer.delete(socket.id);

        const room = this.rooms.get(roomCode);
        if (!room) return;

        const player = room.players.find(p => p.id === playerId);
        if (!player) return;

        player.isConnected = false;

        if (room.status === 'waiting') {
            room.players = room.players.filter(p => p.id !== playerId);
            if (room.players.length === 0) {
                this.rooms.delete(roomCode);
                return;
            }
            if (room.host === playerId) {
                room.host = room.players[0].id;
                room.players[0].ready = true; // Host must be ready
            }
            this.io.to(roomCode).emit('room-update', { players: this.getRoomPlayersForClient(room) });
        } else {
            this.io.to(roomCode).emit('player-disconnected', { playerId });

            // Start a 5-minute timeout for reconnection
            const timer = setTimeout(() => {
                this.handlePlayerTimeout(roomCode, playerId);
            }, 5 * 60 * 1000);

            this.disconnectTimers.set(playerId, timer);
        }
    }

    handlePlayerTimeout(roomCode, playerId) {
        this.disconnectTimers.delete(playerId);
        const room = this.rooms.get(roomCode);
        if (!room || room.status !== 'playing' || !room.gameEngine) return;

        const player = room.gameEngine.players.find(p => p.id === playerId);
        if (!player || player.isBankrupt) return;

        // Force bankruptcy to the bank due to disconnection timeout
        room.gameEngine.declareBankruptcy(playerId, null);
        this.io.to(roomCode).emit('player-bankrupt', { playerId, reason: 'timeout' });
        this.io.to(roomCode).emit('game-state-sync', { gameState: room.gameEngine.getFullState() });

        const gameOverResult = room.gameEngine.checkGameOver();
        if (gameOverResult.isOver) {
            room.status = 'finished';
            this.io.to(roomCode).emit('game-over', { winnerId: gameOverResult.winnerId, stats: room.gameEngine.getStats() });
        }
    }

    handleReady(socket, ready) {
        const association = this.socketToPlayer.get(socket.id);
        if (!association) return;
        const { roomCode, playerId } = association;

        const room = this.rooms.get(roomCode);
        if (!room || room.status !== 'waiting') return;

        const player = room.players.find(p => p.id === playerId);
        if (player) {
            player.ready = ready;
            this.io.to(roomCode).emit('room-update', { players: this.getRoomPlayersForClient(room) });
        }
    }

    handleUpdateSettings(socket, settings) {
        const association = this.socketToPlayer.get(socket.id);
        if (!association) return;
        const { roomCode, playerId } = association;

        const room = this.rooms.get(roomCode);
        if (!room || room.status !== 'waiting' || room.host !== playerId) return;

        room.settings = {
            startMoney: Number(settings.startMoney) || 15000,
            goBonus: Number(settings.goBonus) || 2000,
            turnTimer: Number(settings.turnTimer) || 0,
            freeParkingRule: !!settings.freeParkingRule
        };

        this.io.to(roomCode).emit('room-settings-updated', { settings: room.settings });
    }

    startGame(socket) {
        const room = this.getRoomForSocket(socket);
        if (!room || room.status !== 'waiting' || room.host !== this.socketToPlayer.get(socket.id).playerId) return;

        // Verify all players are ready
        const allReady = room.players.every(p => p.ready);
        if (!allReady) {
            socket.emit('error-msg', { message: 'Not all players are ready / ผู้เล่นยังเตรียมพร้อมไม่ครบทุกคน' });
            return;
        }

        // Initialize GameEngine
        room.gameEngine = new GameEngine(room.players, room.settings);
        room.status = 'playing';

        this.io.to(room.code).emit('game-started', { gameState: room.gameEngine.getFullState() });
    }

    getRoomForSocket(socket) {
        const association = this.socketToPlayer.get(socket.id);
        if (!association) return null;
        return this.rooms.get(association.roomCode);
    }

    handleRollDice(socket, payload) {
        const room = this.getRoomForSocket(socket);
        if (!room || room.status !== 'playing' || !room.gameEngine) return;
        const association = this.socketToPlayer.get(socket.id);
        const engine = room.gameEngine;
        
        const currentPlayer = engine.getCurrentPlayer();
        if (currentPlayer.id !== association.playerId) {
            socket.emit('error-msg', { message: 'Not your turn / ไม่ใช่เทิร์นของคุณ' });
            return;
        }

        if (engine.turnPhase !== 'roll') {
            socket.emit('error-msg', { message: 'You cannot roll the dice in this phase / คุณยังทอยลูกเต๋าไม่ได้ในเฟสนี้' });
            return;
        }

        const selection = (payload && payload.selection) || 'normal';
        let customDice1 = null;
        let customDice2 = null;
        if (payload && typeof payload.dice1 === 'number' && typeof payload.dice2 === 'number') {
            customDice1 = payload.dice1;
            customDice2 = payload.dice2;
        }
        
        let normalizedSelection = selection;
        if (normalizedSelection !== 'odd' && normalizedSelection !== 'even') {
            normalizedSelection = 'normal';
        }

        if (customDice1 !== null && customDice2 !== null) {
            const sum = customDice1 + customDice2;
            if (normalizedSelection === 'odd' && sum % 2 === 0) {
                socket.emit('error-msg', { message: 'Mismatched dice sum and selection choice / ผลรวมลูกเต๋าไม่ตรงกับประเภทที่เลือก' });
                return;
            }
            if (normalizedSelection === 'even' && sum % 2 !== 0) {
                socket.emit('error-msg', { message: 'Mismatched dice sum and selection choice / ผลรวมลูกเต๋าไม่ตรงกับประเภทที่เลือก' });
                return;
            }
        }

        let result;
        try {
            result = engine.rollDice(normalizedSelection, customDice1, customDice2);
        } catch (err) {
            socket.emit('error-msg', { message: err.message });
            return;
        }

        // Broadcast dice rolled
        this.io.to(room.code).emit('dice-rolled', {
            playerId: currentPlayer.id,
            dice1: result.dice1,
            dice2: result.dice2,
            isDouble: result.isDouble
        });

        if (result.goToJail) {
            this.io.to(room.code).emit('player-jailed', { playerId: currentPlayer.id, reason: 'three_doubles' });
        } else {
            // Broadcast player moved
            this.io.to(room.code).emit('player-moved', {
                playerId: currentPlayer.id,
                from: result.oldPosition,
                to: result.newPosition,
                passedGo: result.passedGo
            });

            if (result.passedGo) {
                this.io.to(room.code).emit('money-changed', {
                    playerId: currentPlayer.id,
                    amount: engine.settings.goBonus,
                    reason: 'passed_go',
                    money: currentPlayer.money
                });
            }

            // Process Landing outcomes
            const landing = result.landingEffect;
            if (landing) {
                if (landing.type === 'tax') {
                    this.io.to(room.code).emit('money-changed', {
                        playerId: currentPlayer.id,
                        amount: -landing.amount,
                        reason: landing.taxName === 'Luxury Tax' ? 'luxury_tax' : 'income_tax',
                        money: currentPlayer.money
                    });
                    if (engine.settings.freeParkingRule) {
                        this.io.to(room.code).emit('free-parking-pot-updated', { pot: engine.freeParkingPot });
                    }
                } else if (landing.type === 'rent' || landing.type === 'rent-and-takeover') {
                    this.io.to(room.code).emit('money-changed', {
                        playerId: currentPlayer.id,
                        amount: -landing.amount,
                        reason: 'rent_paid',
                        money: engine.players.find(p => p.id === currentPlayer.id).money
                    });
                    this.io.to(room.code).emit('money-changed', {
                        playerId: landing.ownerId,
                        amount: landing.amount,
                        reason: 'rent_received',
                        money: engine.players.find(p => p.id === landing.ownerId).money
                    });
                    if (landing.type === 'rent-and-takeover') {
                        engine.turnPhase = 'takeover';
                        // Keep current player's takeover details for UI
                        engine.currentTakeoverCost = landing.takeoverCost;
                    }
                } else if (landing.type === 'buy-option' || landing.type === 'build-option') {
                    this.io.to(socket.id).emit('action-prompt', { type: landing.type, position: currentPlayer.position });
                } else if (landing.type === 'card') {
                    this.io.to(room.code).emit('card-drawn', {
                        playerId: currentPlayer.id,
                        cardType: landing.cardType,
                        card: landing.card
                    });

                    // Broadcast all updates triggered by card effects
                    if (landing.cardResults) {
                        landing.cardResults.forEach(r => {
                            if (r.type === 'money') {
                                this.io.to(room.code).emit('money-changed', {
                                    playerId: r.playerId,
                                    amount: r.amount,
                                    reason: 'card_effect',
                                    money: engine.players.find(p => p.id === r.playerId).money
                                });
                            } else if (r.type === 'move') {
                                this.io.to(room.code).emit('player-moved', {
                                    playerId: r.playerId,
                                    from: r.from,
                                    to: r.to,
                                    passedGo: r.passedGo
                                });
                                if (r.passedGo) {
                                    this.io.to(room.code).emit('money-changed', {
                                        playerId: r.playerId,
                                        amount: engine.settings.goBonus,
                                        reason: 'passed_go',
                                        money: engine.players.find(p => p.id === r.playerId).money
                                    });
                                }
                            } else if (r.type === 'jail') {
                                this.io.to(room.code).emit('player-jailed', { playerId: r.playerId, reason: 'card_effect' });
                            } else if (r.type === 'landing' && r.detail && (r.detail.type === 'buy-option' || r.detail.type === 'build-option')) {
                                this.io.to(socket.id).emit('action-prompt', { type: r.detail.type, position: engine.players.find(p => p.id === r.playerId).position });
                            }
                        });
                    }
                } else if (landing.type === 'go-to-jail') {
                    this.io.to(room.code).emit('player-jailed', { playerId: currentPlayer.id, reason: 'landed_jail_square' });
                } else if (landing.type === 'free-parking') {
                    if (engine.settings.freeParkingRule && landing.collected > 0) {
                        this.io.to(room.code).emit('money-changed', {
                            playerId: currentPlayer.id,
                            amount: landing.collected,
                            reason: 'free_parking',
                            money: currentPlayer.money
                        });
                        this.io.to(room.code).emit('free-parking-pot-updated', { pot: 0 });
                    }
                }
            }
        }

        // Check if current player goes bankrupt due to landed effects (tax/rent/cards)
        this.checkAndResolveBankruptcy(room, currentPlayer.id);

        this.io.to(room.code).emit('game-state-sync', { gameState: engine.getFullState() });
    }

    checkAndResolveBankruptcy(room, playerId) {
        const engine = room.gameEngine;
        const player = engine.players.find(p => p.id === playerId);
        if (player && player.money < 0) {
            // Check if player has anything to sell/mortgage
            const hasAssets = engine.checkBankruptcy(playerId);
            if (!hasAssets) {
                // Instantly declare bankruptcy if no assets can cover the debt
                const creditorId = engine.propertyOwners[player.position] || null;
                engine.declareBankruptcy(playerId, creditorId);
                this.io.to(room.code).emit('player-bankrupt', { playerId, reason: 'debt' });
                
                const gameOverResult = engine.checkGameOver();
                if (gameOverResult.isOver) {
                    room.status = 'finished';
                    this.io.to(room.code).emit('game-over', { winnerId: gameOverResult.winnerId, stats: engine.getStats(), reason: gameOverResult.reason });
                }
            }
        }
    }

    checkVictory(room) {
        const engine = room.gameEngine;
        const gameOverResult = engine.checkGameOver();
        if (gameOverResult.isOver) {
            room.status = 'finished';
            this.io.to(room.code).emit('game-over', { winnerId: gameOverResult.winnerId, stats: engine.getStats(), reason: gameOverResult.reason });
            return true;
        }
        return false;
    }

    handleBuyProperty(socket, position) {
        const room = this.getRoomForSocket(socket);
        if (!room || room.status !== 'playing' || !room.gameEngine) return;
        const association = this.socketToPlayer.get(socket.id);
        const engine = room.gameEngine;

        const currentPlayer = engine.getCurrentPlayer();
        if (currentPlayer.id !== association.playerId) {
            socket.emit('error-msg', { message: 'Not your turn / ไม่ใช่เทิร์นของคุณ' });
            return;
        }

        if (position !== currentPlayer.position) {
            socket.emit('error-msg', { message: 'You are not standing on this property / คุณไม่ได้อยู่บนที่ดินนี้' });
            return;
        }

        const result = engine.buyProperty(currentPlayer.id, position);
        if (result.success) {
            this.io.to(room.code).emit('property-bought', {
                playerId: currentPlayer.id,
                position: position,
                cost: result.cost
            });
            this.io.to(room.code).emit('money-changed', {
                playerId: currentPlayer.id,
                amount: -result.cost,
                reason: 'buy_property',
                money: currentPlayer.money
            });
            this.io.to(room.code).emit('game-state-sync', { gameState: engine.getFullState() });
            
            if (result.promptBuild) {
                const targetSocket = this.io.sockets.sockets.get(socket.id);
                if (targetSocket) {
                    targetSocket.emit('action-prompt', { type: 'build-option', position });
                }
            }

            this.checkVictory(room);
        } else {
            socket.emit('error-msg', { message: 'Cannot buy this property / ไม่สามารถซื้อที่ดินนี้ได้' });
        }
    }

    handleTakeoverProperty(socket) {
        const room = this.getRoomForSocket(socket);
        if (!room || room.status !== 'playing' || !room.gameEngine) return;
        const association = this.socketToPlayer.get(socket.id);
        const engine = room.gameEngine;

        const currentPlayer = engine.getCurrentPlayer();
        if (currentPlayer.id !== association.playerId || engine.turnPhase !== 'takeover') {
            socket.emit('error-msg', { message: 'Not allowed to takeover right now / ไม่สามารถซื้อต่อได้ในขณะนี้' });
            return;
        }

        const position = currentPlayer.position;
        const takeoverCost = engine.currentTakeoverCost;
        const oldOwnerId = engine.propertyOwners[position];
        const oldOwner = engine.players.find(p => p.id === oldOwnerId);

        const result = engine.takeoverProperty(currentPlayer.id, position, takeoverCost);
        if (result.success) {
            this.io.to(room.code).emit('property-bought', {
                playerId: currentPlayer.id,
                position: position,
                cost: takeoverCost,
                isTakeover: true
            });
            
            this.io.to(room.code).emit('money-changed', {
                playerId: currentPlayer.id,
                amount: -takeoverCost,
                reason: 'takeover_paid',
                money: currentPlayer.money
            });
            this.io.to(room.code).emit('money-changed', {
                playerId: oldOwnerId,
                amount: takeoverCost,
                reason: 'takeover_received',
                money: oldOwner.money
            });

            this.io.to(room.code).emit('game-state-sync', { gameState: engine.getFullState() });
            
            if (result.promptBuild) {
                const targetSocket = this.io.sockets.sockets.get(socket.id);
                if (targetSocket) {
                    targetSocket.emit('action-prompt', { type: 'build-option', position });
                }
            }

            this.checkVictory(room);
        } else {
            socket.emit('error-msg', { message: 'Cannot takeover this property / ไม่สามารถซื้อต่อที่ดินนี้ได้' });
        }
    }

    handleDeclineTakeover(socket) {
        const room = this.getRoomForSocket(socket);
        if (!room || room.status !== 'playing' || !room.gameEngine) return;
        const association = this.socketToPlayer.get(socket.id);
        const engine = room.gameEngine;

        const currentPlayer = engine.getCurrentPlayer();
        if (currentPlayer.id !== association.playerId || engine.turnPhase !== 'takeover') {
            return;
        }

        engine.declineTakeover(currentPlayer.id);
        this.io.to(room.code).emit('game-state-sync', { gameState: engine.getFullState() });
    }

    handleDeclineProperty(socket) {
        const room = this.getRoomForSocket(socket);
        if (!room || room.status !== 'playing' || !room.gameEngine) return;
        const association = this.socketToPlayer.get(socket.id);
        const engine = room.gameEngine;

        const currentPlayer = engine.getCurrentPlayer();
        if (currentPlayer.id !== association.playerId) {
            socket.emit('error-msg', { message: 'Not your turn / ไม่ใช่เทิร์นของคุณ' });
            return;
        }

        engine.endTurnPhase();
        this.io.to(room.code).emit('game-state-sync', { gameState: engine.getFullState() });
    }

    handleBuildHouse(socket, position) {
        const room = this.getRoomForSocket(socket);
        if (!room || room.status !== 'playing' || !room.gameEngine) return;
        const association = this.socketToPlayer.get(socket.id);
        const engine = room.gameEngine;

        const currentPlayer = engine.getCurrentPlayer();
        if (currentPlayer.id !== association.playerId) {
            socket.emit('error-msg', { message: 'Not your turn / ไม่ใช่เทิร์นของคุณ' });
            return;
        }

        const result = engine.buildHouse(association.playerId, position);
        if (result.success) {
            this.io.to(room.code).emit('house-built', {
                position: position,
                houses: result.totalHouses
            });
            this.io.to(room.code).emit('money-changed', {
                playerId: association.playerId,
                amount: -result.cost,
                reason: 'build_house',
                money: engine.players.find(p => p.id === association.playerId).money
            });
            this.io.to(room.code).emit('game-state-sync', { gameState: engine.getFullState() });
        } else {
            socket.emit('error-msg', { message: result.message || 'Cannot build house / ไม่สามารถสร้างบ้านได้' });
        }
    }

    handleBuildHotel(socket, position) {
        const room = this.getRoomForSocket(socket);
        if (!room || room.status !== 'playing' || !room.gameEngine) return;
        const association = this.socketToPlayer.get(socket.id);
        const engine = room.gameEngine;

        const currentPlayer = engine.getCurrentPlayer();
        if (currentPlayer.id !== association.playerId) {
            socket.emit('error-msg', { message: 'Not your turn / ไม่ใช่เทิร์นของคุณ' });
            return;
        }

        const result = engine.buildHotel(association.playerId, position);
        if (result.success) {
            this.io.to(room.code).emit('hotel-built', {
                position: position
            });
            this.io.to(room.code).emit('money-changed', {
                playerId: association.playerId,
                amount: -result.cost,
                reason: 'build_hotel',
                money: engine.players.find(p => p.id === association.playerId).money
            });
            this.io.to(room.code).emit('game-state-sync', { gameState: engine.getFullState() });
        } else {
            socket.emit('error-msg', { message: result.message || 'Cannot build hotel / ไม่สามารถสร้างโรงแรมได้' });
        }
    }

    handleMortgageProperty(socket, position) {
        const room = this.getRoomForSocket(socket);
        if (!room || room.status !== 'playing' || !room.gameEngine) return;
        const association = this.socketToPlayer.get(socket.id);
        const engine = room.gameEngine;

        const result = engine.mortgageProperty(association.playerId, position);
        if (result.success) {
            this.io.to(room.code).emit('property-mortgaged', {
                position: position
            });
            this.io.to(room.code).emit('money-changed', {
                playerId: association.playerId,
                amount: result.income,
                reason: 'mortgage',
                money: engine.players.find(p => p.id === association.playerId).money
            });
            this.io.to(room.code).emit('game-state-sync', { gameState: engine.getFullState() });
        } else {
            socket.emit('error-msg', { message: result.message || 'Cannot mortgage / ไม่สามารถจำนองได้' });
        }
    }

    handleUnmortgageProperty(socket, position) {
        const room = this.getRoomForSocket(socket);
        if (!room || room.status !== 'playing' || !room.gameEngine) return;
        const association = this.socketToPlayer.get(socket.id);
        const engine = room.gameEngine;

        const result = engine.unmortgageProperty(association.playerId, position);
        if (result.success) {
            this.io.to(room.code).emit('property-unmortgaged', {
                position: position
            });
            this.io.to(room.code).emit('money-changed', {
                playerId: association.playerId,
                amount: -result.cost,
                reason: 'unmortgage',
                money: engine.players.find(p => p.id === association.playerId).money
            });
            this.io.to(room.code).emit('game-state-sync', { gameState: engine.getFullState() });
        } else {
            socket.emit('error-msg', { message: result.message || 'Cannot unmortgage / ไม่สามารถถอนจำนองได้' });
        }
    }

    handleEndTurn(socket) {
        const room = this.getRoomForSocket(socket);
        if (!room || room.status !== 'playing' || !room.gameEngine) return;
        const association = this.socketToPlayer.get(socket.id);
        const engine = room.gameEngine;

        const currentPlayer = engine.getCurrentPlayer();
        if (currentPlayer.id !== association.playerId) {
            socket.emit('error-msg', { message: 'Not your turn / ไม่ใช่เทิร์นของคุณ' });
            return;
        }
        if (engine.turnPhase !== 'end') {
            socket.emit('error-msg', { message: 'Cannot end turn now / ยังไม่สามารถจบเทิร์นได้' });
            return;
        }

        if (currentPlayer.money < 0 && !currentPlayer.isBankrupt) {
            socket.emit('error-msg', { message: 'ไม่สามารถจบเทิร์นได้ เงินของคุณติดลบ กรุณาจำนองที่ดินหรือประกาศล้มละลาย / Cannot end turn with negative money' });
            return;
        }

        const prevPlayerId = currentPlayer.id;
        const nextPlayerId = engine.endTurn();

        this.io.to(room.code).emit('turn-changed', { currentPlayerId: nextPlayerId });
        this.io.to(room.code).emit('game-state-sync', { gameState: engine.getFullState() });
    }



    handleSendChat(socket, message) {
        const room = this.getRoomForSocket(socket);
        if (!room) return;
        const association = this.socketToPlayer.get(socket.id);
        const player = room.players.find(p => p.id === association.playerId);
        if (!player) return;

        this.io.to(room.code).emit('chat-message', {
            playerId: player.id,
            playerName: player.name,
            color: player.color.hex,
            message: message,
            timestamp: Date.now()
        });
    }

    handleSendReaction(socket, emoji) {
        const room = this.getRoomForSocket(socket);
        if (!room) return;
        const association = this.socketToPlayer.get(socket.id);

        this.io.to(room.code).emit('reaction', {
            playerId: association.playerId,
            emoji: emoji
        });
    }

    handleJailAction(socket, action) {
        const room = this.getRoomForSocket(socket);
        if (!room || room.status !== 'playing' || !room.gameEngine) return;
        const association = this.socketToPlayer.get(socket.id);
        const engine = room.gameEngine;

        const currentPlayer = engine.getCurrentPlayer();
        if (currentPlayer.id !== association.playerId) {
            socket.emit('error-msg', { message: 'Not your turn / ไม่ใช่เทิร์นของคุณ' });
            return;
        }

        if (action === 'pay') {
            const result = engine.payJailFine(currentPlayer.id);
            if (result.success) {
                this.io.to(room.code).emit('player-freed', { playerId: currentPlayer.id, method: 'pay' });
                this.io.to(room.code).emit('money-changed', {
                    playerId: currentPlayer.id,
                    amount: -500,
                    reason: 'jail_fine',
                    money: currentPlayer.money
                });
                this.io.to(room.code).emit('game-state-sync', { gameState: engine.getFullState() });
            } else {
                socket.emit('error-msg', { message: 'Cannot afford fine / เงินไม่พอจ่ายค่าปรับ' });
            }
        } else if (action === 'card') {
            const result = engine.useGetOutOfJailCard(currentPlayer.id);
            if (result.success) {
                this.io.to(room.code).emit('player-freed', { playerId: currentPlayer.id, method: 'card' });
                this.io.to(room.code).emit('game-state-sync', { gameState: engine.getFullState() });
            } else {
                socket.emit('error-msg', { message: 'No card available / ไม่มีบัตรออกจากคุก' });
            }
        } else if (action === 'roll') {
            const result = engine.attemptJailRoll(currentPlayer.id);
            this.io.to(room.code).emit('dice-rolled', {
                playerId: currentPlayer.id,
                dice1: result.dice1,
                dice2: result.dice2,
                isDouble: result.isDouble
            });

            if (result.success) {
                this.io.to(room.code).emit('player-freed', { playerId: currentPlayer.id, method: 'roll' });
                this.io.to(room.code).emit('player-moved', {
                    playerId: currentPlayer.id,
                    from: result.oldPosition,
                    to: result.newPosition,
                    passedGo: result.passedGo
                });

                if (result.passedGo) {
                    this.io.to(room.code).emit('money-changed', {
                        playerId: currentPlayer.id,
                        amount: engine.settings.goBonus,
                        reason: 'passed_go',
                        money: currentPlayer.money
                    });
                }

                // Landing processing for jail roll release
                const landing = result.landingEffect;
                if (landing) {
                    if (landing.type === 'tax') {
                        this.io.to(room.code).emit('money-changed', {
                            playerId: currentPlayer.id,
                            amount: -landing.amount,
                            reason: landing.taxName === 'Luxury Tax' ? 'luxury_tax' : 'income_tax',
                            money: currentPlayer.money
                        });
                        if (engine.settings.freeParkingRule) {
                            this.io.to(room.code).emit('free-parking-pot-updated', { pot: engine.freeParkingPot });
                        }
                    } else if (landing.type === 'rent' || landing.type === 'rent-and-takeover') {
                        this.io.to(room.code).emit('money-changed', {
                            playerId: currentPlayer.id,
                            amount: -landing.amount,
                            reason: 'rent_paid',
                            money: engine.players.find(p => p.id === currentPlayer.id).money
                        });
                        this.io.to(room.code).emit('money-changed', {
                            playerId: landing.ownerId,
                            amount: landing.amount,
                            reason: 'rent_received',
                            money: engine.players.find(p => p.id === landing.ownerId).money
                        });
                        if (landing.type === 'rent-and-takeover') {
                            engine.turnPhase = 'takeover';
                            engine.currentTakeoverCost = landing.takeoverCost;
                        }
                    } else if (landing.type === 'buy-option' || landing.type === 'build-option') {
                        this.io.to(socket.id).emit('action-prompt', { type: landing.type, position: currentPlayer.position });
                    } else if (landing.type === 'card') {
                        this.io.to(room.code).emit('card-drawn', {
                            playerId: currentPlayer.id,
                            cardType: landing.cardType,
                            card: landing.card
                        });

                        if (landing.cardResults) {
                            landing.cardResults.forEach(r => {
                                if (r.type === 'money') {
                                    this.io.to(room.code).emit('money-changed', {
                                        playerId: r.playerId,
                                        amount: r.amount,
                                        reason: 'card_effect',
                                        money: engine.players.find(p => p.id === r.playerId).money
                                    });
                                } else if (r.type === 'move') {
                                    this.io.to(room.code).emit('player-moved', {
                                        playerId: r.playerId,
                                        from: r.from,
                                        to: r.to,
                                        passedGo: r.passedGo
                                    });
                                    if (r.passedGo) {
                                        this.io.to(room.code).emit('money-changed', {
                                            playerId: r.playerId,
                                            amount: engine.settings.goBonus,
                                            reason: 'passed_go',
                                            money: engine.players.find(p => p.id === r.playerId).money
                                        });
                                    }
                                } else if (r.type === 'jail') {
                                    this.io.to(room.code).emit('player-jailed', { playerId: r.playerId, reason: 'card_effect' });
                                } else if (r.type === 'landing' && r.detail && (r.detail.type === 'buy-option' || r.detail.type === 'build-option')) {
                                    this.io.to(socket.id).emit('action-prompt', { type: r.detail.type, position: engine.players.find(p => p.id === r.playerId).position });
                                }
                            });
                        }
                    } else if (landing.type === 'go-to-jail') {
                        this.io.to(room.code).emit('player-jailed', { playerId: currentPlayer.id, reason: 'landed_jail_square' });
                    } else if (landing.type === 'free-parking') {
                        if (engine.settings.freeParkingRule && landing.collected > 0) {
                            this.io.to(room.code).emit('money-changed', {
                                playerId: currentPlayer.id,
                                amount: landing.collected,
                                reason: 'free_parking',
                                money: currentPlayer.money
                            });
                            this.io.to(room.code).emit('free-parking-pot-updated', { pot: 0 });
                        }
                    }
                }
            } else {
                // If it was the 3rd fail, player is forced to pay 500 and moves
                if (result.forcedPay) {
                    this.io.to(room.code).emit('player-freed', { playerId: currentPlayer.id, method: 'forced_pay' });
                    this.io.to(room.code).emit('money-changed', {
                        playerId: currentPlayer.id,
                        amount: -500,
                        reason: 'jail_fine',
                        money: currentPlayer.money
                    });
                    this.io.to(room.code).emit('player-moved', {
                        playerId: currentPlayer.id,
                        from: result.oldPosition,
                        to: result.newPosition,
                        passedGo: result.passedGo
                    });
                }
            }

            this.checkAndResolveBankruptcy(room, currentPlayer.id);
            this.io.to(room.code).emit('game-state-sync', { gameState: engine.getFullState() });
        }
    }

    handleSocket(socket) {
        socket.on('create-room', ({ playerName, avatar }) => {
            this.createRoom(socket, playerName, avatar);
        });
        socket.on('join-room', ({ roomCode, playerName, avatar, playerId }) => {
            this.joinRoom(socket, roomCode, playerName, avatar, playerId);
        });
        socket.on('player-ready', ({ ready }) => {
            this.handleReady(socket, ready);
        });
        socket.on('update-settings', (settings) => {
            this.handleUpdateSettings(socket, settings);
        });
        socket.on('start-game', () => {
            this.startGame(socket);
        });
        socket.on('roll-dice', (payload) => {
            this.handleRollDice(socket, payload);
        });
        socket.on('buy-property', ({ position }) => {
            this.handleBuyProperty(socket, position);
        });
        socket.on('takeover-property', () => {
            this.handleTakeoverProperty(socket);
        });
        socket.on('decline-takeover', () => {
            this.handleDeclineTakeover(socket);
        });
        socket.on('decline-property', () => {
            this.handleDeclineProperty(socket);
        });

        socket.on('build-house', ({ position }) => {
            this.handleBuildHouse(socket, position);
        });
        socket.on('build-hotel', ({ position }) => {
            this.handleBuildHotel(socket, position);
        });
        socket.on('mortgage-property', ({ position }) => {
            this.handleMortgageProperty(socket, position);
        });
        socket.on('unmortgage-property', ({ position }) => {
            this.handleUnmortgageProperty(socket, position);
        });
        socket.on('end-turn', () => {
            this.handleEndTurn(socket);
        });

        socket.on('send-chat', ({ message }) => {
            this.handleSendChat(socket, message);
        });
        socket.on('send-reaction', ({ emoji }) => {
            this.handleSendReaction(socket, emoji);
        });
        socket.on('jail-action', ({ action }) => {
            this.handleJailAction(socket, action);
        });
        socket.on('disconnect', () => {
            this.leaveRoom(socket);
        });
    }
}

module.exports = RoomManager;
