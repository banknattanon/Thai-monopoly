// UIScene - Manages the HTML HUD overlays, player cards, turn phase action buttons, and modal dialogs

import socketManager from '../managers/SocketManager.js';
import chatManager from '../managers/ChatManager.js';
import { BOARD_SQUARES } from '../utils/constants.js';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
        this.gameState = null;
        this.localPlayerId = null;
        this.buildMode = null; // 'house' | 'hotel' | 'mortgage' | null

        this.countdownInterval = null;
        this.secondsRemaining = 0;
        this.turnBannerTimeout = null;
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
        this.btnMortgage = document.getElementById('btn-mortgage');
        this.btnJailPay = document.getElementById('btn-jail-pay');
        this.btnJailCard = document.getElementById('btn-jail-card');
        this.btnJailRoll = document.getElementById('btn-jail-roll');

        this.btnEndTurn = document.getElementById('btn-end-turn');
        this.btnBankrupt = document.getElementById('btn-bankrupt');

        // Setup DOM event listeners
        this.setupButtonListeners();

        // Listen for tile selection action from GameScene
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
            gameScene.events.on('tile-selected-action', (square) => this.handleTileSelected(square));
        }

        // Draw initial HUD stats
        this.updateState(this.gameState);



        // Bind turn changed socket event for transition toast
        socketManager.on('turn-changed', ({ currentPlayerId }) => {
            this.handleTurnChanged(currentPlayerId);
            this.currentActionPrompt = null;
        });

        socketManager.on('action-prompt', (data) => {
            this.currentActionPrompt = data;
            this.updateState(this.gameState);
        });
    }

    /**
     * Bind click triggers to socket emit actions.
     */
    setupButtonListeners() {
        if (this.btnRoll) {
            this.btnRoll.onclick = () => {
                const selectedRadio = document.querySelector('input[name="dice-selection"]:checked');
                const selection = selectedRadio ? selectedRadio.value : 'normal';
                socketManager.rollDice(selection);
            };
        }
        if (this.btnBuy) this.btnBuy.onclick = () => {
            const me = this.gameState.players.find(p => p.id === this.localPlayerId);
            if (me) {
                if (this.currentActionPrompt && this.currentActionPrompt.type === 'build-option') {
                    const position = this.currentActionPrompt.position;
                    const sq = this.gameState.board[position];
                    const currentHouses = sq ? sq.houses : 0;
                    if (currentHouses === 3) {
                        socketManager.buildHotel(position);
                    } else {
                        socketManager.buildHouse(position);
                    }
                    this.currentActionPrompt = null;
                } else if (this.gameState.turnPhase === 'takeover') {
                    socketManager.takeoverProperty();
                } else {
                    socketManager.buyProperty(me.position);
                }
            }
        };
        if (this.btnDecline) this.btnDecline.onclick = () => {
            if (this.currentActionPrompt && this.currentActionPrompt.type === 'build-option') {
                socketManager.declineProperty();
                this.currentActionPrompt = null;
            } else if (this.gameState.turnPhase === 'takeover') {
                socketManager.declineTakeover();
            } else {
                socketManager.declineProperty();
            }
        };
        if (this.btnEndTurn) this.btnEndTurn.onclick = () => socketManager.endTurn();
        if (this.btnBankrupt) {
            this.btnBankrupt.onclick = () => {
                if (confirm("คุณแน่ใจหรือไม่ที่จะประกาศล้มละลาย? คุณจะออกจากเกมทันที / Are you sure you want to declare bankruptcy?")) {
                    // For human player, we just let server assign target to current landing or bank
                    socketManager.declareBankruptcy('bank');
                }
            };
        }

        // Jail actions
        if (this.btnJailPay) this.btnJailPay.onclick = () => socketManager.jailAction('pay');
        if (this.btnJailCard) this.btnJailCard.onclick = () => socketManager.jailAction('card');
        if (this.btnJailRoll) this.btnJailRoll.onclick = () => socketManager.jailAction('roll');


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

        if (this.buildMode === 'mortgage') {
            const isMortgaged = this.gameState.board[position]?.isMortgaged;
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
            this.btnMortgage,
            this.btnJailPay, this.btnJailCard, this.btnJailRoll,
            this.btnEndTurn, this.btnBankrupt
        ];
        btns.forEach(btn => {
            if (btn) btn.style.display = 'none';
        });
        const diceSelector = document.getElementById('dice-selector-container');
        if (diceSelector) diceSelector.style.display = 'none';
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
            // Show turn controls if it is my turn
            if (this.gameState.currentPlayerId === this.localPlayerId) {
                const phase = this.gameState.turnPhase;

                // Mortgage feature is accessible during setup roll or end turn
                if (phase === 'roll' || phase === 'end') {
                    // Check if player owns properties to mortgage
                    const myProps = this.gameState.players.find(p => p.id === this.localPlayerId).properties;
                    if (myProps.length > 0) {
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
                        const diceSelector = document.getElementById('dice-selector-container');
                        if (diceSelector) diceSelector.style.display = 'inline-flex';
                    }
                } else if (phase === 'action') {
                    if (this.btnBuy) {
                        this.btnBuy.style.display = 'block';
                        if (this.currentActionPrompt && this.currentActionPrompt.type === 'build-option') {
                            const sq = this.gameState.board[this.currentActionPrompt.position];
                            const currentHouses = sq ? sq.houses : 0;
                            if (currentHouses === 3) {
                                this.btnBuy.textContent = '🏨 สร้างโรงแรม / Build Hotel';
                            } else {
                                this.btnBuy.textContent = '🏠 สร้างบ้าน / Build House';
                            }
                            this.btnBuy.classList.remove('btn-danger');
                            this.btnBuy.classList.add('btn-success');
                        } else {
                            this.btnBuy.textContent = '💰 ซื้อที่ดิน / Buy';
                            this.btnBuy.classList.remove('btn-danger');
                            this.btnBuy.classList.add('btn-success');
                        }
                    }
                    if (this.btnDecline) {
                        this.btnDecline.style.display = 'block';
                        if (this.currentActionPrompt && this.currentActionPrompt.type === 'build-option') {
                            this.btnDecline.textContent = '❌ ข้าม / Skip';
                        } else {
                            this.btnDecline.textContent = '❌ ไม่ซื้อ / Decline';
                        }
                    }
                } else if (phase === 'takeover') {
                    if (this.btnBuy) {
                        this.btnBuy.style.display = 'block';
                        this.btnBuy.textContent = `⚔️ ซื้อต่อ / Takeover (฿${(this.gameState.currentTakeoverCost || 0).toLocaleString()})`;
                        this.btnBuy.classList.remove('btn-success');
                        this.btnBuy.classList.add('btn-danger');
                    }
                    if (this.btnDecline) {
                        this.btnDecline.style.display = 'block';
                        this.btnDecline.textContent = '❌ ข้าม / Skip';
                    }
                } else if (phase === 'end') {
                    if (this.btnEndTurn) this.btnEndTurn.style.display = 'block';
                    if (this.btnBankrupt && me.money < 0) {
                        this.btnBankrupt.style.display = 'block';
                    }
                }
            }
        }

        // Initialize/Sync turn timer countdown
        this.syncTurnTimer(this.gameState.settings.turnTimer);
    }

    /**
     * Animates centered turn switching banner toast.
     */
    handleTurnChanged(currentPlayerId) {
        if (!this.gameState) return;
        
        if (currentPlayerId !== this.localPlayerId) {
            this.disableAllActions();
        }

        const player = this.gameState.players.find(p => p.id === currentPlayerId);
        const name = player ? player.name : 'ผู้เล่น';
        
        const banner = document.getElementById('turn-transition-banner');
        const sub = document.getElementById('turn-banner-sub');
        const main = document.getElementById('turn-banner-main');

        if (!banner || !sub || !main) return;

        if (currentPlayerId === this.localPlayerId) {
            sub.textContent = 'ตาของคุณแล้ว!';
            main.textContent = 'YOUR TURN!';
            banner.querySelector('.turn-banner-content').style.borderColor = 'var(--color-gold)';
            banner.querySelector('.turn-banner-content').style.boxShadow = '0 0 40px rgba(234, 179, 8, 0.4), inset 0 0 20px rgba(234, 179, 8, 0.1)';
        } else {
            sub.textContent = `ตาของ ${name}`;
            main.textContent = `${name.toUpperCase()}'S TURN!`;
            banner.querySelector('.turn-banner-content').style.borderColor = 'rgba(255, 255, 255, 0.15)';
            banner.querySelector('.turn-banner-content').style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
        }

        banner.style.display = 'block';
        // Allow DOM to render block first, then add class for animation trigger
        setTimeout(() => {
            banner.classList.add('active');
        }, 10);

        if (this.turnBannerTimeout) {
            clearTimeout(this.turnBannerTimeout);
        }
        this.turnBannerTimeout = setTimeout(() => {
            banner.classList.remove('active');
            setTimeout(() => {
                banner.style.display = 'none';
            }, 400);
        }, 2200);
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

        const timerDisplay = document.getElementById('turn-timer-count');
        const timerContainer = document.getElementById('turn-timer-display');
        
        if (!timerDisplay) return;

        if (!timerSetting || timerSetting <= 0) {
            timerDisplay.textContent = '∞';
            if (timerContainer) timerContainer.style.display = 'none';
            return;
        }

        if (timerContainer) timerContainer.style.display = 'block';

        this.secondsRemaining = timerSetting;
        timerDisplay.textContent = `${this.secondsRemaining}s`;

        this.countdownInterval = setInterval(() => {
            this.secondsRemaining--;
            if (this.secondsRemaining <= 0) {
                clearInterval(this.countdownInterval);
                timerDisplay.textContent = '0s';
                if (this.gameState.currentPlayerId === this.localPlayerId) {
                    console.log('UIScene: Turn timer expired. Ending turn automatically.');
                    if (this.gameState.turnPhase === 'roll') {
                        if (this.gameState.players.find(p => p.id === this.localPlayerId).inJail) {
                            socketManager.jailAction('roll');
                        } else {
                            socketManager.rollDice();
                        }
                    } else if (this.gameState.turnPhase === 'action') {
                        socketManager.declineProperty();
                    } else if (this.gameState.turnPhase === 'takeover') {
                        socketManager.declineTakeover();
                    } else if (this.gameState.turnPhase === 'end') {
                        socketManager.endTurn();
                    }
                }
            } else {
                timerDisplay.textContent = `${this.secondsRemaining}s`;
            }
        }, 1000);
    }

    // Auction methods removed

    /**
     * Clear intervals when exiting scene.
     */
    shutdown() {
        clearInterval(this.countdownInterval);
        if (this.turnBannerTimeout) {
            clearTimeout(this.turnBannerTimeout);
        }
    }
}
