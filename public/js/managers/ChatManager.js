// ChatManager - Manages Lobby and Game Chat, Game Logs, and Reactions

import socketManager from './SocketManager.js';

class ChatManager {
    constructor() {
        this.chatMessagesEl = null;
        this.logMessagesEl = null;
        this.chatInputEl = null;
        this.sendBtnEl = null;
        this.tabBtns = [];
        this.tabContents = [];
        this.reactionBtns = [];
        this.isInitialized = false;
    }

    /**
     * Initializes DOM element links and event handlers.
     */
    init() {
        if (this.isInitialized) return;

        this.chatMessagesEl = document.getElementById('chat-messages');
        this.logMessagesEl = document.getElementById('game-log-messages');
        this.chatInputEl = document.getElementById('chat-input');
        this.sendBtnEl = document.getElementById('btn-send-chat');

        // Tab buttons
        const chatTabBtn = document.getElementById('chat-tab-btn');
        const logTabBtn = document.getElementById('log-tab-btn');
        if (chatTabBtn && logTabBtn) {
            this.tabBtns = [chatTabBtn, logTabBtn];
            this.tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const tabName = btn.getAttribute('data-tab');
                    this.switchTab(tabName);
                });
            });
        }

        // Tab contents
        if (this.chatMessagesEl && this.logMessagesEl) {
            this.tabContents = [this.chatMessagesEl, this.logMessagesEl];
        }

        // Send chat event
        if (this.sendBtnEl) {
            this.sendBtnEl.addEventListener('click', () => this.handleSendChat());
        }
        if (this.chatInputEl) {
            this.chatInputEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSendChat();
                }
            });
        }

        // Reactions
        const reactBtns = document.querySelectorAll('.reaction-btn');
        if (reactBtns.length > 0) {
            this.reactionBtns = Array.from(reactBtns);
            this.reactionBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const emoji = btn.getAttribute('data-emoji');
                    if (emoji) {
                        socketManager.sendReaction(emoji);
                    }
                });
            });
        }

        // Mobile chat toggle
        const chatToggleBtn = document.getElementById('chat-toggle-btn');
        const chatPanel = document.getElementById('chat-panel');
        if (chatToggleBtn && chatPanel) {
            if (window.innerWidth <= 768) {
                chatPanel.classList.add('chat-hidden');
            }
            chatToggleBtn.addEventListener('click', () => {
                chatPanel.classList.toggle('chat-hidden');
            });
        }

        this.isInitialized = true;
    }

    /**
     * Sends the chat message typed in the input field.
     */
    handleSendChat() {
        if (!this.chatInputEl) return;
        const msg = this.chatInputEl.value.trim();
        if (msg) {
            socketManager.sendChat(msg);
            this.chatInputEl.value = '';
        }
    }

    /**
     * Switches active tab in the chat panel
     * @param {'chat' | 'log'} tabName
     */
    switchTab(tabName) {
        if (!this.tabBtns.length) return;

        this.tabBtns.forEach(btn => {
            if (btn.getAttribute('data-tab') === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        if (this.chatMessagesEl && this.logMessagesEl) {
            if (tabName === 'chat') {
                this.chatMessagesEl.classList.add('active');
                this.logMessagesEl.classList.remove('active');
            } else {
                this.chatMessagesEl.classList.remove('active');
                this.logMessagesEl.classList.add('active');
            }
        }

        this.scrollToBottom();
    }

    /**
     * Adds a user message to the chat container
     * @param {string} playerName
     * @param {string} message
     * @param {string} colorHex
     */
    addMessage(playerName, message, colorHex = '#FFFFFF') {
        if (!this.chatMessagesEl) this.init();
        if (!this.chatMessagesEl) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'msg-sender';
        nameSpan.style.color = colorHex;
        nameSpan.textContent = `${playerName}: `;

        const textSpan = document.createElement('span');
        textSpan.className = 'msg-text';
        textSpan.textContent = message;

        msgDiv.appendChild(nameSpan);
        msgDiv.appendChild(textSpan);

        this.chatMessagesEl.appendChild(msgDiv);
        this.scrollToBottom();
    }

    /**
     * Adds a system notification to the game log container
     * @param {string} text - Message content (can be HTML or text)
     */
    addSystemMessage(text) {
        if (!this.logMessagesEl) this.init();
        if (!this.logMessagesEl) return;

        const logDiv = document.createElement('div');
        logDiv.className = 'log-msg';
        logDiv.innerHTML = text; // allow formatted text

        this.logMessagesEl.appendChild(logDiv);

        // Also add system alerts briefly into general chat so players don't miss them
        if (this.chatMessagesEl) {
            const systemChatDiv = document.createElement('div');
            systemChatDiv.className = 'chat-msg system-msg';
            systemChatDiv.innerHTML = `<span style="color: #EAB308;">📢 [ระบบ]</span> ${text}`;
            this.chatMessagesEl.appendChild(systemChatDiv);
        }

        this.scrollToBottom();
    }

    /**
     * Handles displaying emoji reaction temporarily on HUD
     * @param {string} playerName
     * @param {string} emoji
     */
    addReaction(playerName, emoji) {
        // Log reaction in chat
        this.addMessage(playerName, `ส่งความรู้สึก: ${emoji}`, '#EAB308');

        // Trigger floating screen emoji if GameScene/UIScene is active
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.left = `${Math.random() * 50 + 20}%`;
        overlay.style.top = '70%';
        overlay.style.fontSize = '3rem';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '9999';
        overlay.style.animation = 'floatUpReaction 2s ease-out forwards';
        overlay.innerText = emoji;

        // Simple floating animation styling dynamically injected
        if (!document.getElementById('reaction-keyframe-style')) {
            const style = document.createElement('style');
            style.id = 'reaction-keyframe-style';
            style.innerHTML = `
                @keyframes floatUpReaction {
                    0% { transform: translateY(0) scale(0.5); opacity: 0; }
                    15% { transform: translateY(-50px) scale(1.2); opacity: 1; }
                    80% { opacity: 1; }
                    100% { transform: translateY(-300px) scale(1); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 2000);
    }

    /**
     * Scrolls the active message pane to the bottom.
     */
    scrollToBottom() {
        if (this.chatMessagesEl && this.chatMessagesEl.classList.contains('active')) {
            this.chatMessagesEl.scrollTop = this.chatMessagesEl.scrollHeight;
        } else if (this.logMessagesEl && this.logMessagesEl.classList.contains('active')) {
            this.logMessagesEl.scrollTop = this.logMessagesEl.scrollHeight;
        }
    }
}

const chatManager = new ChatManager();
export default chatManager;
export { chatManager };
