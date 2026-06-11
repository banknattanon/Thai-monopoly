// UIScene - Manages the HTML HUD overlays, player cards, turn phase action buttons, and modal dialogs

import socketManager from '../managers/SocketManager.js';
import chatManager from '../managers/ChatManager.js';
import tradeManager from '../managers/TradeManager.js';
import { BOARD_SQUARES } from '../utils/constants.js';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
        this.gameState = null;
        this.localPlayerId = null;
        this.buildMode = null; // 'house' | 'hotel' | 'mortgage' | null

        this.countdownInterval = null;
        this.secondsRemaining = 0;
    }

    init(data) {
        this.gameState = data.gameState;
        this.localPlayerId = data.localPlayerId;
    }

    create() {
        console.log('UIScene: Initializing HUD layouts...');

        // Query DOM button references
        this.btnRoll = document.getElementById('btn-roll-dice');
        this.btnBuy = document.getElementById('btn-buy');
        this.btnDecline = document.getElementById('btn-decline');
        this.btnBuildHouse = document.getElementById('btn-build-house');
        this.btnBuildHotel = document.getElementById('btn-build-hotel');
        this.btnMortgage = document.getElementById('btn-mortgage');
        this.btnTrade = document.getElementById('btn-trade');
        this.btnJailPay = document.getElementById('btn-jail-pay');
        this.btnJailCard = document.getElementById('btn-jail-card');
        this.btnJailRoll = document.getElementById('btn-jail-roll');
        this.btnEndTurn = document.getElementById('btn-end-turn');

        this.setupButtonListeners();

        // Listen for tile selection action from GameScene
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
            gameScene.events.on('tile-selected-action', (square) => this.handleTileSelected(square));
        }

        // Draw initial HUD stats
        this.updateState(this.gameState);

        // Bind auction events directly from socket
        this.setupAuctionSocketListeners();
    }

    /**
     * Bind click triggers to socket emit actions.
     */
    setupButtonListeners() {
        if (this.btnRoll) this.btnRoll.onclick = () => socketManager.rollDice();
        if (this.btnBuy) this.btnBuy.onclick = () => {
            const me = this.gameState.players.find(p => p.id === this.localPlayerId);
            if (me) socketManager.buyProperty(me.position);
        };
        if (this.btnDecline) this.btnDecline.onclick = () => socketManager.declineProperty();
        if (this.btnEndTurn) this.btnEndTurn.onclick = () => socketManager.endTurn();

        // Jail actions
        if (this.btnJailPay) this.btnJailPay.onclick = () => socketManager.jailAction('pay');
        if (this.btnJailCard) this.btnJailCard.onclick = () => socketManager.jailAction('card');
        if (this.btnJailRoll) this.btnJailRoll.onclick = () => socketManager.jailAction('roll');

        // Trade button opens modal
        if (this.btnTrade) {
            this.btnTrade.onclick = () => {
                tradeManager.openTradeDialog();
            };
        }

        // Build / Mortgage toggles
        if (this.btnBuildHouse) {
            this.btnBuildHouse.onclick = () => {
                this.toggleBuildMode('house', '🏠 โหมดสร้างบ้าน: คลิกเลือกที่ดินกลุ่มสีที่ตนเป็นเจ้าของครบเพื่อสร้างบ้าน / Build Mode: Click tile to build house');
            };
        }
        if (this.btnBuildHotel) {
            this.btnBuildHotel.onclick = () => {
                this.toggleBuildMode('hotel', '🏨 โหมดสร้างโรงแรม: คลิกเลือกที่ดินที่มีบ้านครบ 4 หลังเพื่ออัปเกรด / Hotel Mode: Click tile with 4 houses to upgrade');
            };
        }
        if (this.btnMortgage) {
            this.btnMortgage.onclick = () => {
                this.toggleBuildMode('mortgage', '📋 โหมดจำนอง/ไถ่ถอน: คลิกเลือกที่ดินเพื่อจำนองหรือชำระเงินไถ่ถอน / Mortgage Mode: Click tile to mortgage or unmortgage');
            };
        }
    }

    /**
     * Toggles overlay highlight guides for building houses/hotels.
     * @param {'house'|'hotel'|'mortgage'} mode
     * @param {string} logHelpText
     */
    toggleBuildMode(mode, logHelpText) {
        if (this.buildMode === mode) {
            this.buildMode = null;
            chatManager.addSystemMessage('❌ ยกเลิกโหมดสิ่งปลูกสร้าง / Cancelled build mode');
        } else {
            this.buildMode = mode;
            chatManager.addSystemMessage(`💡 ${logHelpText}`);
        }
    }

    /**
     * Fired when a board tile is clicked. Handles building or mortgage requests.
     * @param {Object} square
     */
    handleTileSelected(square) {
        if (!this.buildMode || !this.gameState) return;

        // Verify if it is local player's turn
        if (this.gameState.currentPlayerId !== this.localPlayerId) {
            alert('คุณสามารถจัดการสิ่งปลูกสร้างในเทิร์นของคุณเท่านั้น / Only on your turn!');
            this.buildMode = null;
            return;
        }

        const ownerId = this.gameState.propertyOwners[square.position];
        if (ownerId !== this.localPlayerId) {
            alert('คุณต้องเป็นเจ้าของที่ดินแปลงนี้เพื่อปรับเปลี่ยน / You do not own this property.');
            this.buildMode = null;
            return;
        }

        const position = square.position;

        if (this.buildMode === 'house') {
            socketManager.buildHouse(position);
        } else if (this.buildMode === 'hotel') {
            socketManager.buildHotel(position);
        } else if (this.buildMode === 'mortgage') {
            const propState = this.gameState.properties[position];
            const isMortgaged = propState ? propState.isMortgaged : false;
            
            if (isMortgaged) {
                socketManager.unmortgageProperty(position);
            } else {
                socketManager.mortgageProperty(position);
            }
        }

        this.buildMode = null; // Reset
    }

    /**
     * Disable all action inputs during rolling or moving.
     */
    disableAllActions() {
        const btns = [
            this.btnRoll, this.btnBuy, this.btnDecline,
            this.btnBuildHouse, this.btnBuildHotel, this.btnMortgage,
            this.btnJailPay, this.btnJailCard, this.btnJailRoll,
            this.btnEndTurn
        ];
        btns.forEach(btn => {
            if (btn) btn.style.display = 'none';
        });
    }

    /**
     * Refreshes HUD panels, money, and button visibilities.
     * @param {Object} state
     */
    updateState(state) {
        if (!state) return;
        this.gameState = state;

        const activePlayer = this.gameState.players.find(p => p.id === this.gameState.currentPlayerId);
        const me = this.gameState.players.find(p => p.id === this.localPlayerId);

        // Update Turn info HUD
        const avatarEl = document.getElementById('current-player-avatar');
        const nameEl = document.getElementById('current-player-name');
        
        if (activePlayer) {
            if (avatarEl) avatarEl.textContent = activePlayer.avatar;
            if (nameEl) {
                const isMe = activePlayer.id === this.localPlayerId;
                nameEl.textContent = activePlayer.name + (isMe ? ' (คุณ!)' : '');
                nameEl.style.color = activePlayer.color.hex;
            }
        }

        // Render side player lists
        this.renderPlayersHUDList();

        // Control Button Visibility
        this.disableAllActions();

        if (me && !me.isBankrupt) {
            // Always show trade button
            if (this.btnTrade) this.btnTrade.style.display = 'block';

            // Show turn controls if it is my turn
            if (this.gameState.currentPlayerId === this.localPlayerId) {
                const phase = this.gameState.turnPhase;

                // Build/Mortgage features are accessible during setup roll or end turn
                if (phase === 'roll' || phase === 'post_roll' || phase === 'jail_decision') {
                    // Check if player owns properties to mortgage or build
                    const myProps = this.gameState.players.find(p => p.id === this.localPlayerId).properties;
                    if (myProps.length > 0) {
                        if (this.btnBuildHouse) this.btnBuildHouse.style.display = 'block';
                        if (this.btnBuildHotel) this.btnBuildHotel.style.display = 'block';
                        if (this.btnMortgage) this.btnMortgage.style.display = 'block';
                    }
                }

                if (phase === 'roll') {
                    if (me.inJail) {
                        if (this.btnJailRoll) this.btnJailRoll.style.display = 'block';
                        if (this.btnJailPay && me.money >= 500) this.btnJailPay.style.display = 'block';
                        
                        // Check if player has get out of jail card
                        const hasJailCard = me.cards && me.cards.some(c => c.type === 'get_out_of_jail' || c.type === 'jail_free');
                        if (this.btnJailCard && hasJailCard) this.btnJailCard.style.display = 'block';
                    } else {
                        if (this.btnRoll) this.btnRoll.style.display = 'block';
                    }
                } else if (phase === 'buy_decision') {
                    if (this.btnBuy) this.btnBuy.style.display = 'block';
                    if (this.btnDecline) this.btnDecline.style.display = 'block';
                } else if (phase === 'post_roll' || phase === 'jail_decision') {
                    if (this.btnEndTurn) this.btnEndTurn.style.display = 'block';
                }
            }
        }

        // Initialize/Sync turn timer countdown
        this.syncTurnTimer(this.gameState.settings.turnTimer);
    }

    /**
     * Refreshes the players scoreboard HUD list with money, connections, jailed state, and properties.
     */
    renderPlayersHUDList() {
        const hudList = document.getElementById('hud-players-list');
        if (!hudList) return;

        hudList.innerHTML = '';

        this.gameState.players.forEach(p => {
            const isCurrent = p.id === this.gameState.currentPlayerId;
            const isMe = p.id === this.localPlayerId;

            const row = document.createElement('div');
            row.className = `hud-player-row ${isCurrent ? 'active' : ''} ${p.isBankrupt ? 'bankrupt' : ''}`;
            row.style.borderLeft = `5px solid ${p.color.hex}`;

            // Left: details
            const details = document.createElement('div');
            details.className = 'hud-player-details';

            const nameHeader = document.createElement('div');
            nameHeader.className = 'hud-player-name';
            nameHeader.innerHTML = `${p.avatar} ${p.name} ${isMe ? '<span>(คุณ)</span>' : ''}`;
            if (!p.isConnected) {
                nameHeader.innerHTML += ' <span class="disconnected-badge">Desync</span>';
            }
            details.appendChild(nameHeader);

            const moneySub = document.createElement('div');
            moneySub.className = 'hud-player-money';
            if (p.isBankrupt) {
                moneySub.innerHTML = '💀 <span style="color: #ef4444; font-weight: bold;">ล้มละลาย / Bankrupt</span>';
            } else {
                moneySub.innerHTML = `฿${p.money.toLocaleString('th-TH')}`;
                if (p.inJail) {
                    moneySub.innerHTML += ' <span class="jailed-badge">👮 คุก</span>';
                }
            }
            details.appendChild(moneySub);

            // Small row of color badges for owned properties
            const propsRow = document.createElement('div');
            propsRow.className = 'hud-player-properties-row';
            p.properties.forEach(pos => {
                const sq = BOARD_SQUARES[pos];
                if (sq && sq.color) {
                    const badge = document.createElement('span');
                    badge.className = 'hud-prop-color-dot';
                    badge.style.backgroundColor = sq.color;
                    badge.title = sq.name;
                    propsRow.appendChild(badge);
                }
            });
            details.appendChild(propsRow);
            row.appendChild(details);

            hudList.appendChild(row);
        });
    }

    /**
     * Start/Synchronize local turn timer countdown logic.
     * @param {number} timerSetting
     */
    syncTurnTimer(timerSetting) {
        clearInterval(this.countdownInterval);

        const timerDisplay = document.getElementById('hud-turn-timer');
        if (!timerDisplay) return;

        if (!timerSetting || timerSetting <= 0) {
            timerDisplay.textContent = '∞';
            return;
        }

        // Local countdown (estimates server timer)
        this.secondsRemaining = timerSetting;
        timerDisplay.textContent = `00:${this.secondsRemaining.toString().padStart(2, '0')}`;

        this.countdownInterval = setInterval(() => {
            this.secondsRemaining--;
            if (this.secondsRemaining <= 0) {
                clearInterval(this.countdownInterval);
                timerDisplay.textContent = '00:00';
                // Automatically force actions if it is my turn
                if (this.gameState.currentPlayerId === this.localPlayerId) {
                    console.log('UIScene: Turn timer expired. Ending turn automatically.');
                    if (this.gameState.turnPhase === 'roll') {
                        if (this.gameState.players.find(p => p.id === this.localPlayerId).inJail) {
                            socketManager.jailAction('roll');
                        } else {
                            socketManager.rollDice();
                        }
                    } else if (this.gameState.turnPhase === 'buy_decision') {
                        socketManager.declineProperty();
                    } else if (this.gameState.turnPhase === 'post_roll') {
                        socketManager.endTurn();
                    }
                }
            } else {
                timerDisplay.textContent = `00:${this.secondsRemaining.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    /**
     * Handles injecting dynamic elements for real-time auction bidding.
     */
    setupAuctionSocketListeners() {
        socketManager.on('auction-start', (data) => {
            const sq = BOARD_SQUARES[data.position];
            const sqName = sq ? sq.name : 'ที่ดิน';
            chatManager.addSystemMessage(`🔨 เริ่มประมูลที่ดิน: ${sqName} (ราคาตั้งต้น ฿0)`);

            this.createAuctionOverlay(data.position);
        });

        socketManager.on('bid-placed', (data) => {
            const bidder = this.gameState.players.find(p => p.id === data.playerId);
            const bidderName = bidder ? bidder.name : 'ผู้เล่น';
            
            // Update bid label inside overlay
            const bidValEl = document.getElementById('auction-highest-bid-val');
            const bidderNameEl = document.getElementById('auction-highest-bidder');
            
            if (bidValEl) bidValEl.textContent = data.amount.toLocaleString('th-TH');
            if (bidderNameEl && bidder) {
                bidderNameEl.textContent = `${bidder.avatar} ${bidderName}`;
                bidderNameEl.style.color = bidder.color.hex;
            }

            chatManager.addSystemMessage(`🔨 [ประมูล] ${bidderName} เสนอราคาที่ ฿${data.amount.toLocaleString('th-TH')}`);
        });

        socketManager.on('auction-end', (data) => {
            // Remove overlay
            const overlay = document.getElementById('auction-overlay');
            if (overlay) overlay.remove();

            if (data.winnerId) {
                const winner = this.gameState.players.find(p => p.id === data.winnerId);
                const winnerName = winner ? winner.name : 'ผู้เล่น';
                const sqName = BOARD_SQUARES[data.position].name;
                chatManager.addSystemMessage(`🏆 [ประมูล] ${winnerName} ชนะการประมูลที่ดิน ${sqName} ในราคา ฿${data.finalPrice.toLocaleString('th-TH')}`);
            } else {
                chatManager.addSystemMessage(`❌ ไม่มีผู้เข้าร่วมเสนอราคาประมูล การประมูลถูกยกเลิก`);
            }
        });
    }

    /**
     * Appends glass panel auction container in DOM center.
     * @param {number} position
     */
    createAuctionOverlay(position) {
        // Clear old overlay if exists
        const old = document.getElementById('auction-overlay');
        if (old) old.remove();

        const sq = BOARD_SQUARES[position];
        const sqName = sq ? sq.name : 'ที่ดิน';
        const color = sq ? sq.color : '#FFF';

        const overlay = document.createElement('div');
        overlay.id = 'auction-overlay';
        overlay.className = 'glass-panel auction-overlay-panel animate-fade-in';

        // Add dynamically injected styling if not already added
        if (!document.getElementById('auction-overlay-style')) {
            const style = document.createElement('style');
            style.id = 'auction-overlay-style';
            style.innerHTML = `
                .auction-overlay-panel {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 380px;
                    padding: 24px;
                    background: rgba(15, 23, 42, 0.95);
                    border: 2px solid #EAB308;
                    box-shadow: 0 0 20px rgba(234, 179, 8, 0.3);
                    z-index: 10000;
                    text-align: center;
                    border-radius: 12px;
                }
                .auction-header {
                    font-size: 1.25rem;
                    font-weight: bold;
                    margin-bottom: 15px;
                    color: #FFFFFF;
                }
                .auction-prop-badge {
                    display: inline-block;
                    padding: 6px 12px;
                    border-radius: 4px;
                    color: #FFFFFF;
                    font-weight: bold;
                    font-size: 0.9rem;
                    margin-bottom: 20px;
                }
                .auction-highest-bid-box {
                    background: rgba(30, 41, 59, 0.6);
                    border: 1px solid #334155;
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 20px;
                }
                .bid-amount-title {
                    font-size: 0.8rem;
                    color: #94A3B8;
                }
                .bid-amount-val {
                    font-size: 1.8rem;
                    font-weight: 800;
                    color: #EAB308;
                }
                .bidder-name {
                    font-size: 0.85rem;
                    font-weight: bold;
                    margin-top: 5px;
                }
                .auction-bid-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .custom-bid-input-row {
                    display: flex;
                    gap: 8px;
                }
                .custom-bid-input-row input {
                    flex: 1;
                    padding: 8px 12px;
                    background: rgba(30, 41, 59, 0.8);
                    border: 1px solid #EAB308;
                    border-radius: 4px;
                    color: #FFFFFF;
                    font-weight: bold;
                    text-align: center;
                }
            `;
            document.head.appendChild(style);
        }

        // HTML setup
        overlay.innerHTML = `
            <div class="auction-header">🔨 กำลังเปิดประมูลที่ดิน / Auction</div>
            <div class="auction-prop-badge" style="background-color: ${color}">${sqName}</div>
            <div class="auction-highest-bid-box">
                <div class="bid-amount-title">ราคาประมูลสูงสุด / Highest Bid:</div>
                <div class="bid-amount-val">฿<span id="auction-highest-bid-val">0</span></div>
                <div class="bidder-name" id="auction-highest-bidder">ไม่มีผู้ประมูล</div>
            </div>
            <div class="auction-bid-actions">
                <div class="custom-bid-input-row">
                    <input type="number" id="auction-bid-input" placeholder="ใส่ราคาประมูล..." min="100" step="100">
                    <button id="btn-place-bid" class="btn btn-primary">เสนอราคา / Bid</button>
                </div>
                <div class="text-muted" style="font-size: 10px; margin-top: 5px;">เวลาเสนอราคาประมูล 10 วินาทีนับจากราคาล่าสุด / 10s Timer</div>
            </div>
        `;

        // Append to screen container
        const targetContainer = document.getElementById('game-screen');
        if (targetContainer) targetContainer.appendChild(overlay);

        // Bind Bid button action
        const bidBtn = document.getElementById('btn-place-bid');
        const bidInput = document.getElementById('auction-bid-input');
        if (bidBtn && bidInput) {
            bidBtn.onclick = () => {
                const amount = Number(bidInput.value) || 0;
                if (amount <= 0) {
                    alert('กรุณาใส่ราคาประมูลให้ถูกต้อง / Please enter valid bid amount');
                    return;
                }
                // Check local player has enough funds
                const me = this.gameState.players.find(p => p.id === this.localPlayerId);
                if (me && me.money < amount) {
                    alert('คุณมีเงินสดไม่เพียงพอเสนอราคา / Insufficient money');
                    return;
                }

                socketManager.placeBid(amount);
                bidInput.value = '';
            };
        }
    }

    /**
     * Clear intervals when exiting scene.
     */
    shutdown() {
        clearInterval(this.countdownInterval);
    }
}
