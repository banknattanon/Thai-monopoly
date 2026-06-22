// GameScene - Main Phaser Game Scene managing the board, dice, and tokens

import socketManager from '../managers/SocketManager.js';
import chatManager from '../managers/ChatManager.js';

import BoardRenderer from '../objects/BoardRenderer.js';
import TokenManager from '../objects/TokenManager.js';
import DiceManager from '../objects/DiceManager.js';
import PropertyCard from '../objects/PropertyCard.js';
import audioManager from '../utils/audio.js';
import { BOARD_SQUARES } from '../utils/constants.js';
import { getSquareCoords } from '../utils/helpers.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.gameState = null;
        this.localPlayerId = null;

        this.boardOffsetX = 80;
        this.boardOffsetY = 80;
    }

    init(data) {
        this.gameState = data.gameState;
        this.localPlayerId = data.localPlayerId;
    }

    create() {
        console.log('GameScene: Creating Monopoly Board elements...');

        // Mount the UI Scene overlaying the game
        this.scene.launch('UIScene', {
            gameState: this.gameState,
            localPlayerId: this.localPlayerId
        });

        // Initialize Property Card hover popup
        this.propertyCard = new PropertyCard(this, 0, 0);

        // Initialize Board Renderer
        this.boardRenderer = new BoardRenderer(this, this.boardOffsetX, this.boardOffsetY, this.propertyCard);

        // Initialize Token Manager
        this.tokenManager = new TokenManager(this, this.boardOffsetX, this.boardOffsetY);

        // Initialize Dice Manager (Centered on board)
        const boardCenter = 800 / 2;
        this.diceManager = new DiceManager(this, this.boardOffsetX + boardCenter, this.boardOffsetY + boardCenter);

        // Initialize Managers with Local Player Context
        chatManager.init(this.localPlayerId);

        // Spawn initial tokens for all active players
        this.gameState.players.forEach(p => {
            if (!p.isBankrupt) {
                this.tokenManager.createToken(p.id, p.color.hex, p.avatar, p.position);
            }
        });

        // Sync initial owner / building state
        this.syncPropertiesUI();

        // Listen for tile hover / click events
        this.setupBoardInteractionListeners();

        // Bind incoming Socket IO Events
        this.setupSocketEvents();
    }

    /**
     * Binds hover popup and click actions on the BoardRenderer.
     */
    setupBoardInteractionListeners() {
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        this.events.on('tile-hover', ({ square, pointer }) => {
            if (isTouchDevice) return; // Touch devices use click/tap instead of hover
            if (!pointer) return;
            // Find current owner data if any
            const ownerId = this.gameState.propertyOwners[square.position];
            const owner = ownerId ? this.gameState.players.find(p => p.id === ownerId) : null;

            // Property state
            const propState = this.gameState.board[square.position];
            const houses = propState ? propState.houses : 0;
            const hasHotel = propState ? propState.hotel : false;
            const isMortgaged = propState ? propState.isMortgaged : false;

            const isValid = this.propertyCard.updateData(
                square,
                owner ? owner.name : null,
                owner ? owner.color.hex : null,
                houses,
                hasHotel,
                isMortgaged
            );
            
            this.currentSquareIsValid = isValid;

            if (isValid) {
                // Map coordinates dynamically with offset/bounds protection
                const canvas = this.sys.game.canvas;
                const rect = canvas.getBoundingClientRect();
                const clientX = pointer.event ? pointer.event.clientX : (rect.left + pointer.x);
                const clientY = pointer.event ? pointer.event.clientY : (rect.top + pointer.y);
                this.propertyCard.show(clientX, clientY);
            } else {
                this.propertyCard.hide();
            }
        });

        this.events.on('tile-hover-move', ({ pointer }) => {
            if (isTouchDevice) return; // Touch devices use click/tap instead of hover
            if (!pointer || !this.currentSquareIsValid) return;
            const canvas = this.sys.game.canvas;
            const rect = canvas.getBoundingClientRect();
            const clientX = pointer.event ? pointer.event.clientX : (rect.left + pointer.x);
            const clientY = pointer.event ? pointer.event.clientY : (rect.top + pointer.y);
            this.propertyCard.show(clientX, clientY);
        });

        this.events.on('tile-out', () => {
            if (isTouchDevice) return; // Touch devices use click/tap instead of hover
            this.propertyCard.hide();
        });

        this.events.on('tile-click', ({ square }) => {
            if (isTouchDevice) {
                // Toggle PropertyCard centered modal on mobile tap
                const ownerId = this.gameState.propertyOwners[square.position];
                const owner = ownerId ? this.gameState.players.find(p => p.id === ownerId) : null;
                const propState = this.gameState.board[square.position];
                const houses = propState ? propState.houses : 0;
                const hasHotel = propState ? propState.hotel : false;
                const isMortgaged = propState ? propState.isMortgaged : false;

                const isValid = this.propertyCard.updateData(
                    square,
                    owner ? owner.name : null,
                    owner ? owner.color.hex : null,
                    houses,
                    hasHotel,
                    isMortgaged
                );
                
                if (isValid) {
                    this.propertyCard.toggleCard(square.position);
                } else {
                    this.propertyCard.hide();
                }
            }

            // Hook up build / mortgage / trade selections if appropriate
            this.events.emit('tile-selected-action', square);
        });

        // Hide card if clicking anywhere else (e.g., background)
        this.input.on('pointerdown', (pointer, currentlyOver) => {
            if (currentlyOver.length === 0) {
                this.propertyCard.hide();
            }
        });
    }

    /**
     * Programmatically emit sparkle particles on a tile when upgraded.
     */
    emitUpgradeSparkles(x, y, color = 0x10b981) {
        // Create basic white star/sparkle texture programmatically if not exists
        if (!this.textures.exists('sparkle')) {
            const canvas = this.textures.createCanvas('sparkle', 16, 16);
            const ctx = canvas.context;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.quadraticCurveTo(8, 8, 16, 8);
            ctx.quadraticCurveTo(8, 8, 8, 16);
            ctx.quadraticCurveTo(8, 8, 0, 8);
            ctx.quadraticCurveTo(8, 8, 8, 0);
            ctx.closePath();
            ctx.fill();
            canvas.refresh();
        }

        const emitter = this.add.particles(x, y, 'sparkle', {
            speed: { min: 20, max: 120 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.0, end: 0 },
            alpha: { start: 1.0, end: 0 },
            lifespan: 800,
            quantity: 25,
            tint: color,
            blendMode: 'ADD',
            emitting: false
        });

        emitter.explode(25);
        
        // Auto-cleanup emitter
        this.time.delayedCall(1000, () => {
            emitter.destroy();
        });
    }

    /**
     * Programmatically emit multi-colored confetti sparkles when crossing GO.
     */
    emitGoConfetti(x, y) {
        if (!this.textures.exists('sparkle')) {
            const canvas = this.textures.createCanvas('sparkle', 16, 16);
            const ctx = canvas.context;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.quadraticCurveTo(8, 8, 16, 8);
            ctx.quadraticCurveTo(8, 8, 8, 16);
            ctx.quadraticCurveTo(8, 8, 0, 8);
            ctx.quadraticCurveTo(8, 8, 8, 0);
            ctx.closePath();
            ctx.fill();
            canvas.refresh();
        }

        const colors = [0xd4af37, 0x3b82f6, 0x10b981, 0xef4444, 0xec4899];
        colors.forEach(color => {
            const emitter = this.add.particles(x, y, 'sparkle', {
                speed: { min: 40, max: 180 },
                angle: { min: 0, max: 360 },
                scale: { start: 1.2, end: 0 },
                alpha: { start: 1.0, end: 0 },
                lifespan: 1200,
                quantity: 12,
                tint: color,
                blendMode: 'ADD',
                emitting: false
            });
            emitter.explode(12);
            this.time.delayedCall(1500, () => {
                emitter.destroy();
            });
        });
    }

    /**
     * Set up realtime socket.io triggers.
     */
    setupSocketEvents() {
        // Sync full Game state
        socketManager.on('game-state-sync', (data) => {
            console.log('GameScene: Received State Sync');
            this.gameState = data.gameState;
            
            // Sync player assets & properties
            this.syncPropertiesUI();
            
            // Sync tokens (handles re-spawning or clearing bankrupt players)
            this.gameState.players.forEach(p => {
                const existingToken = this.tokenManager.tokens.get(p.id);
                if (p.isBankrupt) {
                    if (existingToken) this.tokenManager.removeToken(p.id);
                } else {
                    if (!existingToken) {
                        this.tokenManager.createToken(p.id, p.color.hex, p.avatar, p.position);
                    } else if (this.tokenManager.positions.get(p.id) !== p.position && this.tokenManager.positions.get(p.id) !== -1) {
                        // Warp/Move if desynced (fallback)
                        this.tokenManager.moveToken(p.id, this.tokenManager.positions.get(p.id), p.position, false);
                    }
                }
            });

            // Update UI overlay HUD
            const uiScene = this.scene.get('UIScene');
            if (uiScene && uiScene.scene.isActive()) {
                uiScene.updateState(this.gameState);
            }
        });

        // Dice rolled
        socketManager.on('dice-rolled', async (data) => {
            audioManager.playDiceRoll();

            const roller = this.gameState.players.find(p => p.id === data.playerId);
            const rollerName = roller ? `${roller.avatar} ${roller.name}` : 'ผู้เล่น';
            chatManager.addSystemMessage(`🎲 ${rollerName} ทอยเต๋าได้ ${data.dice1} + ${data.dice2} = ${data.dice1 + data.dice2}` + (data.isDouble ? ' (ดับเบิ้ล!)' : ''));

            // Block overlays while dice rolls
            const uiScene = this.scene.get('UIScene');
            if (uiScene) uiScene.disableAllActions();

            await this.diceManager.roll(data.dice1, data.dice2, data.isDouble);

            if (uiScene) uiScene.updateState(this.gameState);
        });

        // Player moved
        socketManager.on('player-moved', async (data) => {
            const mover = this.gameState.players.find(p => p.id === data.playerId);
            const moverName = mover ? `${mover.avatar} ${mover.name}` : 'ผู้เล่น';
            const sqName = BOARD_SQUARES[data.to].name;
            chatManager.addSystemMessage(`🏃 ${moverName} เดินไปยังช่อง ${sqName}`);

            const uiScene = this.scene.get('UIScene');
            if (uiScene) uiScene.disableAllActions();

            await this.tokenManager.moveToken(data.playerId, data.from, data.to, data.passedGo);

            if (uiScene) uiScene.updateState(this.gameState);
        });

        // Player jailed
        socketManager.on('player-jailed', async (data) => {
            const jailed = this.gameState.players.find(p => p.id === data.playerId);
            const jailedName = jailed ? `${jailed.avatar} ${jailed.name}` : 'ผู้เล่น';
            chatManager.addSystemMessage(`🚨 ${jailedName} ถูกส่งตัวเข้าคุก!`);

            const uiScene = this.scene.get('UIScene');
            if (uiScene) uiScene.disableAllActions();

            await this.tokenManager.moveToJail(data.playerId);

            if (uiScene) uiScene.updateState(this.gameState);
        });

        // Player freed from jail
        socketManager.on('player-freed', (data) => {
            const freed = this.gameState.players.find(p => p.id === data.playerId);
            const freedName = freed ? `${freed.avatar} ${freed.name}` : 'ผู้เล่น';
            let methodText = 'จ่ายค่าปรับ';
            if (data.method === 'card') methodText = 'ใช้การ์ดออกคุก';
            if (data.method === 'roll') methodText = 'ทอยลูกเต๋าดับเบิ้ล';
            
            chatManager.addSystemMessage(`🔓 ${freedName} ออกจากคุกด้วยวิธี: ${methodText}`);
        });

        // Property purchased
        socketManager.on('property-bought', (data) => {
            audioManager.playBuyProperty();

            const buyer = this.gameState.players.find(p => p.id === data.playerId);
            const buyerName = buyer ? `${buyer.avatar} ${buyer.name}` : 'ผู้เล่น';
            const sqName = BOARD_SQUARES[data.position].name;
            chatManager.addSystemMessage(`🏠 ${buyerName} ซื้อที่ดิน ${sqName} ในราคา ฿${data.cost.toLocaleString('th-TH')}`);
        });

        // House built
        socketManager.on('house-built', (data) => {
            audioManager.playBuyProperty();

            const sqName = BOARD_SQUARES[data.position].name;
            chatManager.addSystemMessage(`🏠 สร้างบ้านสำเร็จที่ ${sqName} (มีบ้านทั้งหมด ${data.houses} หลัง)`);

            // Emit sparkle upgrades (green sparkles)
            const coords = getSquareCoords(data.position);
            const x = coords.x + this.boardOffsetX;
            const y = coords.y + this.boardOffsetY;
            this.emitUpgradeSparkles(x, y, 0x10b981);
        });

        // Hotel built
        socketManager.on('hotel-built', (data) => {
            audioManager.playBuyProperty();

            const sqName = BOARD_SQUARES[data.position].name;
            chatManager.addSystemMessage(`🏨 สร้างโรงแรมสำเร็จที่ ${sqName}!`);

            // Emit hotel upgrade sparkle (red sparkles)
            const coords = getSquareCoords(data.position);
            const x = coords.x + this.boardOffsetX;
            const y = coords.y + this.boardOffsetY;
            this.emitUpgradeSparkles(x, y, 0xef4444);
        });

        // Property mortgaged
        socketManager.on('property-mortgaged', (data) => {
            const sqName = BOARD_SQUARES[data.position].name;
            chatManager.addSystemMessage(`⚠️ ที่ดิน ${sqName} ถูกจำนองแล้ว`);
        });

        // Property unmortgaged
        socketManager.on('property-unmortgaged', (data) => {
            const sqName = BOARD_SQUARES[data.position].name;
            chatManager.addSystemMessage(`✅ ที่ดิน ${sqName} ไถ่ถอนจำนองสำเร็จ`);
        });

        // Money changes
        socketManager.on('money-changed', (data) => {
            const target = this.gameState.players.find(p => p.id === data.playerId);
            const targetName = target ? `${target.avatar} ${target.name}` : 'ผู้เล่น';
            const sign = data.amount >= 0 ? '+' : '';
            let reasonText = '';

            switch (data.reason) {
                case 'passed_go': reasonText = 'ผ่านจุดเริ่มต้น'; break;
                case 'luxury_tax': reasonText = 'ชำระภาษีฟุ่มเฟือย'; break;
                case 'income_tax': reasonText = 'ชำระภาษีรายได้'; break;
                case 'rent_paid': reasonText = 'จ่ายค่าเช่า'; break;
                case 'rent_received': reasonText = 'ได้รับค่าเช่า'; break;
                case 'jail_fine': reasonText = 'จ่ายค่าปรับออกคุก'; break;
                case 'card_effect': reasonText = 'ผลของการ์ดพิเศษ'; break;
                case 'free_parking': reasonText = 'รับแจ็คพอตที่จอดรถฟรี'; break;
                case 'buy_property': reasonText = 'ซื้อที่ดิน'; break;
                case 'build_house': reasonText = 'สร้างบ้าน'; break;
                case 'build_hotel': reasonText = 'สร้างโรงแรม'; break;
                case 'mortgage': reasonText = 'ได้รับเงินจำนอง'; break;
                case 'unmortgage': reasonText = 'ชำระค่าไถ่ถอนจำนอง'; break;
                case 'trade': reasonText = 'สัญญาแลกเปลี่ยน'; break;
                case 'auction_win': reasonText = 'ชนะประมูล'; break;
                default: reasonText = 'ธุรกรรมทางการเงิน';
            }

            chatManager.addSystemMessage(`💰 ${targetName}: ${sign}฿${data.amount.toLocaleString('th-TH')} (${reasonText})`);

            // Play rent/tax sound for local player negative cash flow
            if (data.playerId === this.localPlayerId && data.amount < 0) {
                const excludedReasons = ['buy_property', 'build_house', 'build_hotel', 'unmortgage'];
                if (!excludedReasons.includes(data.reason)) {
                    audioManager.playPayRent();
                }
            }
        });

        // Card Drawn
        socketManager.on('card-drawn', (data) => {
            audioManager.playDrawCard();

            const drawer = this.gameState.players.find(p => p.id === data.playerId);
            const drawerName = drawer ? `${drawer.avatar} ${drawer.name}` : 'ผู้เล่น';
            const cardNameTh = data.card.textTh || data.card.text;
            const cardNameEn = data.card.textEn || data.card.text;
            
            chatManager.addSystemMessage(`🃏 ${drawerName} จั่วได้การ์ด: "${cardNameTh}"`);

            // Reveal modal card popup
            const cardDialog = document.getElementById('card-dialog');
            const cardElement = document.getElementById('card-element');
            const categoryTitle = document.getElementById('card-category-title');
            const iconDisplay = document.getElementById('card-icon-display');
            const cardTh = document.getElementById('card-text-th');
            const cardEn = document.getElementById('card-text-en');

            if (cardDialog && cardElement) {
                if (data.cardType === 'chance') {
                    cardElement.className = 'monopoly-card chance-card';
                    if (categoryTitle) categoryTitle.textContent = 'โชคชะตา / Chance';
                    if (iconDisplay) iconDisplay.textContent = '❓';
                } else {
                    cardElement.className = 'monopoly-card community-card';
                    if (categoryTitle) categoryTitle.textContent = 'หีบสมบัติ / Community Chest';
                    if (iconDisplay) iconDisplay.textContent = '📦';
                }

                if (cardTh) cardTh.textContent = cardNameTh;
                if (cardEn) cardEn.textContent = cardNameEn;

                cardDialog.showModal();
            }
        });

        // Chat message
        socketManager.on('chat-message', (data) => {
            chatManager.addMessage(data.playerName, data.message, data.color);
        });

        // Emoji Reaction
        socketManager.on('reaction', (data) => {
            const rxPlayer = this.gameState.players.find(p => p.id === data.playerId);
            if (rxPlayer) {
                chatManager.addReaction(`${rxPlayer.avatar} ${rxPlayer.name}`, data.emoji);
            }
        });

        // Player declared bankruptcy
        socketManager.on('player-bankrupt', (data) => {
            audioManager.playBankruptcy();

            const loser = this.gameState.players.find(p => p.id === data.playerId);
            const loserName = loser ? `${loser.avatar} ${loser.name}` : 'ผู้เล่น';
            chatManager.addSystemMessage(`💀 ${loserName} ล้มละลายแล้ว! (Bankruptcy)`);
            this.tokenManager.removeToken(data.playerId);
        });

        // Free parking jackpot updated
        socketManager.on('free-parking-pot-updated', (data) => {
            chatManager.addSystemMessage(`🚗 ยอดสะสมที่จอดรถฟรี: ฿${data.pot.toLocaleString('th-TH')}`);
        });

        // Game Over Trigger
        socketManager.on('game-over', (data) => {
            const winner = this.gameState.players.find(p => p.id === data.winnerId);
            const winnerName = winner ? `${winner.avatar} ${winner.name}` : 'ผู้เล่น';
            
            let reasonText = '';
            if (data.reason === 'tourism_victory') reasonText = ' (ชนะแบบท่องเที่ยว / Tourism Victory)';
            else if (data.reason === 'line_victory') reasonText = ' (ชนะแบบเหมาแถว / Line Victory)';
            else if (data.reason === 'triple_victory') reasonText = ' (ชนะแบบ 3 สี / Triple Victory)';
            else if (data.reason === 'bankrupt') reasonText = ' (ผู้เล่นอื่นล้มละลาย / Last Man Standing)';

            chatManager.addSystemMessage(`🏆 จบเกม! ผู้ชนะคือ ${winnerName}${reasonText} 🏆`);

            // Pop up game over dialog
            const goDialog = document.getElementById('gameover-dialog');
            const winnerDisplay = document.getElementById('winner-name-display');
            const statsList = document.getElementById('gameover-stats-list');

            if (goDialog) {
                if (winnerDisplay) {
                    winnerDisplay.textContent = `${winner ? winner.avatar : '👑'} ${winner ? winner.name : 'Unknown'}`;
                }

                // Render end-game statistics
                if (statsList && data.stats) {
                    statsList.innerHTML = '';
                    
                    data.stats.forEach(st => {
                        const item = document.createElement('div');
                        item.className = 'gameover-stat-row';
                        item.innerHTML = `
                            <div class="stat-player">${st.name}</div>
                            <div class="stat-details">
                                <span>💰 เงินสด: ฿${st.money.toLocaleString('th-TH')}</span>
                                <span>🏢 ที่ดิน: ${st.propertiesCount} แห่ง</span>
                                <span>📊 มูลค่าทรัพย์สินสุทธิ: ฿${st.netWorth.toLocaleString('th-TH')}</span>
                            </div>
                        `;
                        statsList.appendChild(item);
                    });
                }

                goDialog.showModal();
            }
        });
    }

    /**
     * Loops through all tiles to update houses, hotels, and owners.
     */
    syncPropertiesUI() {
        if (!this.gameState) return;

        for (let i = 0; i < 40; i++) {
            const ownerId = this.gameState.propertyOwners[i];
            const owner = ownerId ? this.gameState.players.find(p => p.id === ownerId) : null;

            // Draw owner indicators on board
            const propState = this.gameState.board[i];
            const isMortgaged = propState ? propState.isMortgaged : false;
            
            if (owner) {
                this.boardRenderer.updateOwner(i, owner.color.hex, isMortgaged);
            } else {
                this.boardRenderer.updateOwner(i, null, false);
            }

            // Sync houses/hotels
            const houses = propState ? propState.houses : 0;
            const hasHotel = propState ? propState.hotel : false;
            this.boardRenderer.updateBuildings(i, houses, hasHotel);
        }
    }
}
