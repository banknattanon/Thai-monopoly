// LobbyScene - Manages DOM-based Landing Screen and Game Room Lobby Setup

import socketManager from '../managers/SocketManager.js';
import { AVATARS } from '../utils/constants.js';

export default class LobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LobbyScene' });
        this.selectedAvatar = 'elephant'; // Default avatar id
        this.localPlayerId = null;
        this.isHost = false;
        this.isReady = false;
    }

    create() {
        console.log('LobbyScene: Initializing DOM listeners...');

        // Connect socket manager
        socketManager.connect();

        // Screen selectors
        this.landingScreen = document.getElementById('landing-screen');
        this.lobbyScreen = document.getElementById('lobby-screen');
        this.gameScreen = document.getElementById('game-screen');

        // Setup DOM interfaces
        this.setupLandingUI();
        this.setupLobbyUI();
        this.setupSocketListeners();
    }

    /**
     * Bind listeners for Username & Avatar Selection on Landing Page.
     */
    setupLandingUI() {
        if (!this.landingScreen) return;

        const nameInput = document.getElementById('input-player-name');
        const createRoomBtn = document.getElementById('btn-create-room');
        const joinRoomBtn = document.getElementById('btn-join-room');
        const roomCodeInput = document.getElementById('input-room-code');
        const avatarOptions = document.querySelectorAll('.avatar-option');

        // Restore name from localStorage if available
        if (nameInput) {
            const savedName = localStorage.getItem('thai_monopoly_username');
            if (savedName) nameInput.value = savedName;
        }

        // Avatar selector click handler
        avatarOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                avatarOptions.forEach(x => x.classList.remove('selected'));
                opt.classList.add('selected');
                this.selectedAvatar = opt.getAttribute('data-avatar') || 'elephant';
            });
        });

        const getPlayerDetails = () => {
            const name = nameInput ? nameInput.value.trim() : '';
            if (!name) {
                alert('กรุณาใส่ชื่อผู้เล่น / Please enter player name');
                return null;
            }
            // Save username
            localStorage.setItem('thai_monopoly_username', name);

            // Find matching avatar emoji
            const avatarObj = AVATARS.find(a => a.id === this.selectedAvatar) || AVATARS[0];
            return { name, emoji: avatarObj.emoji };
        };

        // Create Room
        if (createRoomBtn) {
            createRoomBtn.onclick = () => {
                const details = getPlayerDetails();
                if (details) {
                    socketManager.createRoom(details.name, details.emoji);
                }
            };
        }

        // Join Room
        if (joinRoomBtn) {
            joinRoomBtn.onclick = () => {
                const details = getPlayerDetails();
                const code = roomCodeInput ? roomCodeInput.value.trim().toUpperCase() : '';
                if (!code || code.length !== 6) {
                    alert('กรุณาใส่รหัสห้อง 6 หลัก / Please enter 6-digit room code');
                    return;
                }
                if (details) {
                    socketManager.joinRoom(code, details.name, details.emoji);
                }
            };
        }
    }

    /**
     * Bind Ready status, Room settings, and copy link behaviors in Lobby.
     */
    setupLobbyUI() {
        const readyBtn = document.getElementById('btn-ready');
        const startGameBtn = document.getElementById('btn-start-game');
        const copyCodeBtn = document.getElementById('btn-copy-code');
        const codeDisplay = document.getElementById('room-code-display');

        // Ready button
        if (readyBtn) {
            readyBtn.onclick = () => {
                this.isReady = !this.isReady;
                socketManager.setReady(this.isReady);
                readyBtn.textContent = this.isReady ? 'ยกเลิกพร้อม / Unready' : 'เตรียมพร้อม / Ready';
                readyBtn.className = this.isReady ? 'btn btn-primary' : 'btn btn-secondary';
            };
        }

        // Start Game button
        if (startGameBtn) {
            startGameBtn.onclick = () => {
                socketManager.startGame();
            };
        }

        // Copy Room Code button
        if (copyCodeBtn && codeDisplay) {
            copyCodeBtn.onclick = () => {
                const text = codeDisplay.textContent;
                if (text && text !== 'XXXXXX') {
                    navigator.clipboard.writeText(text)
                        .then(() => {
                            copyCodeBtn.textContent = 'คัดลอกแล้ว! / Copied!';
                            setTimeout(() => {
                                copyCodeBtn.textContent = '📋 Copy';
                            }, 2000);
                        })
                        .catch(err => {
                            console.error('Could not copy room code', err);
                        });
                }
            };
        }

        // Bind Host settings inputs
        const settingsIds = ['setting-start-money', 'setting-go-bonus', 'setting-turn-timer', 'setting-free-parking'];
        settingsIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => {
                    if (this.isHost) {
                        this.emitUpdatedSettings();
                    }
                });
            }
        });
    }

    /**
     * Reads all lobby input values and emits an update-settings request.
     */
    emitUpdatedSettings() {
        const startMoney = Number(document.getElementById('setting-start-money').value);
        const goBonus = Number(document.getElementById('setting-go-bonus').value);
        const turnTimer = Number(document.getElementById('setting-turn-timer').value);
        const freeParkingRule = document.getElementById('setting-free-parking').checked;

        socketManager.updateSettings({
            startMoney,
            goBonus,
            turnTimer,
            freeParkingRule
        });
    }

    /**
     * Connects event handlers to the SocketManager.
     */
    setupSocketListeners() {
        // Clear old listeners before binding to prevent duplicate triggers
        socketManager.listeners.clear();

        // Error message handler
        socketManager.on('error-msg', (data) => {
            alert(data.message);
        });

        // Joined room
        socketManager.on('room-joined', (data) => {
            this.localPlayerId = data.playerId;
            this.handleRoomJoined(data.roomState);
        });

        // Room players update
        socketManager.on('room-update', (data) => {
            this.renderPlayersList(data.players);
        });

        // Realtime settings synchronization
        socketManager.on('room-settings-updated', (data) => {
            this.syncSettingsUI(data.settings);
        });

        // Start Game
        socketManager.on('game-started', (data) => {
            this.handleGameStarted(data.gameState);
        });
    }

    /**
     * Swaps screens from Landing to Lobby and configures permissions.
     * @param {Object} roomState
     */
    handleRoomJoined(roomState) {
        // Switch screens
        if (this.landingScreen) this.landingScreen.classList.remove('active');
        if (this.lobbyScreen) this.lobbyScreen.classList.add('active');

        // Show room code
        const codeDisplay = document.getElementById('room-code-display');
        if (codeDisplay) codeDisplay.textContent = roomState.code;

        // Check host state
        this.isHost = (roomState.host === this.localPlayerId);
        
        // Host gets start button, normal players get ready button
        const startBtn = document.getElementById('btn-start-game');
        const readyBtn = document.getElementById('btn-ready');
        
        if (this.isHost) {
            if (startBtn) startBtn.style.display = 'block';
            if (readyBtn) readyBtn.style.display = 'none';
        } else {
            if (startBtn) startBtn.style.display = 'none';
            if (readyBtn) readyBtn.style.display = 'block';
        }

        // Toggle host setting permissions
        const settingsIds = ['setting-start-money', 'setting-go-bonus', 'setting-turn-timer', 'setting-free-parking'];
        settingsIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (this.isHost) {
                    el.removeAttribute('disabled');
                } else {
                    el.setAttribute('disabled', 'true');
                }
            }
        });

        // Populate initial settings
        this.syncSettingsUI(roomState.settings);

        // Populate players
        this.renderPlayersList(roomState.players);
    }

    /**
     * Refreshes players card list inside lobby wrapper.
     * @param {Array} players
     */
    renderPlayersList(players) {
        const listContainer = document.getElementById('lobby-players-list');
        const countText = document.getElementById('lobby-player-count');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        if (countText) countText.textContent = players.length;

        players.forEach(p => {
            const isMe = p.id === this.localPlayerId;
            const isPlayerHost = p.id === p.hostId || (p.isHost); // check host flag or hostId comparison

            const card = document.createElement('div');
            card.className = `lobby-player-card ${isPlayerHost ? 'item-host' : ''}`;

            const avatarEl = document.createElement('div');
            avatarEl.className = 'player-avatar';
            avatarEl.textContent = p.avatar;
            card.appendChild(avatarEl);

            const infoEl = document.createElement('div');
            infoEl.className = 'player-info';
            
            const nameEl = document.createElement('div');
            nameEl.className = 'player-name';
            nameEl.textContent = p.name + (isMe ? ' (คุณ)' : '');
            infoEl.appendChild(nameEl);

            const tagEl = document.createElement('div');
            tagEl.className = 'player-tag';
            tagEl.textContent = isPlayerHost ? 'เจ้าของห้อง / Room Owner' : 'ผู้ร่วมเล่น / Player';
            infoEl.appendChild(tagEl);
            card.appendChild(infoEl);

            // Display ready tags
            const badge = document.createElement('div');
            if (isPlayerHost) {
                badge.className = 'player-status-badge status-ready';
                badge.textContent = 'ผู้สร้าง / Host';
            } else {
                badge.className = p.ready ? 'player-status-badge status-ready' : 'player-status-badge status-waiting';
                badge.textContent = p.ready ? 'พร้อมแล้ว / Ready' : 'กำลังรอ / Waiting';
            }
            card.appendChild(badge);

            listContainer.appendChild(card);
        });

        // Enable start game button for host if we have at least 2 players and everyone is ready
        if (this.isHost) {
            const otherPlayers = players.filter(p => p.id !== this.localPlayerId);
            const allReady = otherPlayers.length > 0 && otherPlayers.every(p => p.ready);
            
            const startBtn = document.getElementById('btn-start-game');
            if (startBtn) {
                if (allReady) {
                    startBtn.removeAttribute('disabled');
                    startBtn.classList.add('btn-glow-gold');
                } else {
                    startBtn.setAttribute('disabled', 'true');
                    startBtn.classList.remove('btn-glow-gold');
                }
            }
        }
    }

    /**
     * Updates lobby setting form values.
     * @param {Object} settings
     */
    syncSettingsUI(settings) {
        if (!settings) return;

        const startMoneySelect = document.getElementById('setting-start-money');
        const goBonusSelect = document.getElementById('setting-go-bonus');
        const turnTimerSelect = document.getElementById('setting-turn-timer');
        const freeParkingChk = document.getElementById('setting-free-parking');

        if (startMoneySelect) startMoneySelect.value = settings.startMoney;
        if (goBonusSelect) goBonusSelect.value = settings.goBonus;
        if (turnTimerSelect) turnTimerSelect.value = settings.turnTimer;
        if (freeParkingChk) freeParkingChk.checked = settings.freeParkingRule;
    }

    /**
     * Transfers scene stack to GameScene when start trigger is received.
     * @param {Object} initialGameState
     */
    handleGameStarted(initialGameState) {
        // Transition screens
        if (this.lobbyScreen) this.lobbyScreen.classList.remove('active');
        if (this.gameScreen) this.gameScreen.classList.add('active');

        // Launch GameScene and pass active identifiers
        this.scene.start('GameScene', {
            gameState: initialGameState,
            localPlayerId: this.localPlayerId
        });
    }
}
