// TradeManager - Manages client trade proposals and dialog modals

import socketManager from './SocketManager.js';
import { BOARD_SQUARES } from '../utils/constants.js';

class TradeManager {
    constructor() {
        this.tradeDialog = null;
        this.incomingTradeDialog = null;
        this.localPlayerId = null;
        this.playersList = [];
        this.currentIncomingTrade = null;
        this.isInitialized = false;
    }

    /**
     * Set up dialog bindings and submit handlers.
     */
    init(localPlayerId) {
        this.localPlayerId = localPlayerId;
        this.tradeDialog = document.getElementById('trade-dialog');
        this.incomingTradeDialog = document.getElementById('incoming-trade-dialog');

        if (this.isInitialized) return;

        // Propose trade submission
        const submitBtn = document.getElementById('btn-submit-trade');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.handleProposeTrade());
        }

        // Propose trade select recipient change
        const selectPlayer = document.getElementById('trade-select-player');
        if (selectPlayer) {
            selectPlayer.addEventListener('change', () => this.onRecipientChanged());
        }

        // Incoming response bindings
        const acceptBtn = document.getElementById('btn-accept-trade');
        const declineBtn = document.getElementById('btn-decline-trade');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                if (this.currentIncomingTrade) {
                    socketManager.respondTrade(this.currentIncomingTrade.tradeId, true);
                    this.incomingTradeDialog.close();
                    this.currentIncomingTrade = null;
                }
            });
        }
        if (declineBtn) {
            declineBtn.addEventListener('click', () => {
                if (this.currentIncomingTrade) {
                    socketManager.respondTrade(this.currentIncomingTrade.tradeId, false);
                    this.incomingTradeDialog.close();
                    this.currentIncomingTrade = null;
                }
            });
        }

        this.isInitialized = true;
    }

    /**
     * Updates player lists and dialog models.
     * @param {Array} players - Array of players in the game state
     */
    updatePlayers(players) {
        this.playersList = players;

        // Populate the trade select dropdown with other players
        const selectPlayer = document.getElementById('trade-select-player');
        if (selectPlayer) {
            const previousVal = selectPlayer.value;
            selectPlayer.innerHTML = '';
            
            const others = this.playersList.filter(p => p.id !== this.localPlayerId && !p.isBankrupt);
            others.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `${p.avatar} ${p.name}`;
                selectPlayer.appendChild(opt);
            });

            if (previousVal && others.some(o => o.id === previousVal)) {
                selectPlayer.value = previousVal;
            }

            this.onRecipientChanged();
        }
    }

    /**
     * Opens the Propose Trade dialog.
     */
    openTradeDialog() {
        if (!this.tradeDialog) return;

        // Populate local player's property list
        const myPropsList = document.getElementById('trade-offer-properties-list');
        const me = this.playersList.find(p => p.id === this.localPlayerId);

        if (myPropsList && me) {
            myPropsList.innerHTML = '';
            if (me.properties.length === 0) {
                myPropsList.innerHTML = '<div class="no-properties">ไม่มีที่ดินที่คุณเป็นเจ้าของ</div>';
            } else {
                me.properties.forEach(pos => {
                    const sq = BOARD_SQUARES[pos];
                    if (!sq) return;
                    
                    const label = document.createElement('label');
                    label.className = 'trade-prop-checkbox';
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = pos;
                    checkbox.className = 'offer-prop-chk';
                    
                    const text = document.createTextNode(` [${sq.colorGroup || 'สเปเชียล'}] ${sq.name}`);
                    label.appendChild(checkbox);
                    label.appendChild(text);
                    myPropsList.appendChild(label);
                });
            }
        }

        // Reset money inputs
        const offerMoneyInput = document.getElementById('trade-offer-money');
        const requestMoneyInput = document.getElementById('trade-request-money');
        if (offerMoneyInput) offerMoneyInput.value = 0;
        if (requestMoneyInput) requestMoneyInput.value = 0;

        this.onRecipientChanged();
        this.tradeDialog.showModal();
    }

    /**
     * Refreshes the right column (Request side) when chosen recipient is updated.
     */
    onRecipientChanged() {
        const selectPlayer = document.getElementById('trade-select-player');
        const reqPropsList = document.getElementById('trade-request-properties-list');
        if (!selectPlayer || !reqPropsList) return;

        const targetId = selectPlayer.value;
        reqPropsList.innerHTML = '';

        if (!targetId) {
            reqPropsList.innerHTML = '<div class="no-properties">กรุณาเลือกผู้เล่นแลกเปลี่ยน</div>';
            return;
        }

        const targetPlayer = this.playersList.find(p => p.id === targetId);
        if (targetPlayer) {
            if (targetPlayer.properties.length === 0) {
                reqPropsList.innerHTML = '<div class="no-properties">ผู้เล่นนี้ไม่มีที่ดินครอบครอง</div>';
            } else {
                targetPlayer.properties.forEach(pos => {
                    const sq = BOARD_SQUARES[pos];
                    if (!sq) return;

                    const label = document.createElement('label');
                    label.className = 'trade-prop-checkbox';

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = pos;
                    checkbox.className = 'request-prop-chk';

                    const text = document.createTextNode(` [${sq.colorGroup || 'สเปเชียล'}] ${sq.name}`);
                    label.appendChild(checkbox);
                    label.appendChild(text);
                    reqPropsList.appendChild(label);
                });
            }
        }
    }

    /**
     * Gathers trade configuration inputs and emits a trade proposal.
     */
    handleProposeTrade() {
        const selectPlayer = document.getElementById('trade-select-player');
        if (!selectPlayer) return;

        const targetId = selectPlayer.value;
        if (!targetId) {
            alert('กรุณาเลือกผู้เล่นที่ต้องการแลกเปลี่ยน / Please select a player.');
            return;
        }

        const offerMoney = Number(document.getElementById('trade-offer-money').value) || 0;
        const requestMoney = Number(document.getElementById('trade-request-money').value) || 0;

        // Collect checked properties
        const offerProps = [];
        document.querySelectorAll('.offer-prop-chk:checked').forEach(el => {
            offerProps.push(Number(el.value));
        });

        const requestProps = [];
        document.querySelectorAll('.request-prop-chk:checked').forEach(el => {
            requestProps.push(Number(el.value));
        });

        if (offerMoney === 0 && requestMoney === 0 && offerProps.length === 0 && requestProps.length === 0) {
            alert('กรุณาเสนอสิ่งของอย่างน้อยหนึ่งอย่าง / Please offer or request something.');
            return;
        }

        // Validate local player has enough money
        const me = this.playersList.find(p => p.id === this.localPlayerId);
        if (me && me.money < offerMoney) {
            alert('คุณมีเงินไม่เพียงพอกับที่เสนอไว้ / Insufficient funds for this offer.');
            return;
        }

        // Propose trade
        socketManager.proposeTrade(targetId, {
            money: offerMoney,
            properties: offerProps
        }, {
            money: requestMoney,
            properties: requestProps
        });

        // Close trade modal
        if (this.tradeDialog) {
            this.tradeDialog.close();
        }
    }

    /**
     * Displays a trade proposal received from another player.
     * @param {Object} details
     * @param {string} details.tradeId
     * @param {string} details.proponentId
     * @param {Object} details.offer - What the proponent is offering (money, properties)
     * @param {Object} details.request - What the proponent is asking for (money, properties)
     */
    showIncomingTrade(details) {
        if (!this.incomingTradeDialog) return;

        this.currentIncomingTrade = details;

        const proponent = this.playersList.find(p => p.id === details.proponentId);
        const proposerNameEl = document.getElementById('incoming-trade-proposer-name');
        if (proposerNameEl && proponent) {
            proposerNameEl.textContent = `${proponent.avatar} ${proponent.name}`;
        }

        // Update Offer (Receive side)
        const offerMoneyEl = document.getElementById('incoming-trade-offer-money');
        if (offerMoneyEl) {
            offerMoneyEl.textContent = details.offer.money.toLocaleString('th-TH');
        }

        const offerPropsEl = document.getElementById('incoming-trade-offer-properties');
        if (offerPropsEl) {
            offerPropsEl.innerHTML = '';
            if (details.offer.properties.length === 0) {
                offerPropsEl.innerHTML = '<div class="summary-prop-item text-muted">ไม่มีที่ดินเสนอให้</div>';
            } else {
                details.offer.properties.forEach(pos => {
                    const sq = BOARD_SQUARES[pos];
                    if (sq) {
                        const item = document.createElement('div');
                        item.className = 'summary-prop-item';
                        item.style.borderLeft = `4px solid ${sq.color || '#FFF'}`;
                        item.textContent = sq.name;
                        offerPropsEl.appendChild(item);
                    }
                });
            }
        }

        // Update Request (Give side)
        const requestMoneyEl = document.getElementById('incoming-trade-request-money');
        if (requestMoneyEl) {
            requestMoneyEl.textContent = details.request.money.toLocaleString('th-TH');
        }

        const requestPropsEl = document.getElementById('incoming-trade-request-properties');
        if (requestPropsEl) {
            requestPropsEl.innerHTML = '';
            if (details.request.properties.length === 0) {
                requestPropsEl.innerHTML = '<div class="summary-prop-item text-muted">ไม่มีที่ดินที่ร้องขอ</div>';
            } else {
                details.request.properties.forEach(pos => {
                    const sq = BOARD_SQUARES[pos];
                    if (sq) {
                        const item = document.createElement('div');
                        item.className = 'summary-prop-item';
                        item.style.borderLeft = `4px solid ${sq.color || '#FFF'}`;
                        item.textContent = sq.name;
                        requestPropsEl.appendChild(item);
                    }
                });
            }
        }

        this.incomingTradeDialog.showModal();
    }
}

const tradeManager = new TradeManager();
export default tradeManager;
export { tradeManager };
