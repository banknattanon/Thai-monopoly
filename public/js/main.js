// Main entry point for the Thai Monopoly multiplayer client game

import BootScene from './scenes/BootScene.js';
import LobbyScene from './scenes/LobbyScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 960,
    parent: 'phaser-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    backgroundColor: '#0f172a', // Match application dark background color
    scene: [
        BootScene,
        LobbyScene,
        GameScene,
        UIScene
    ]
};

// Initialize the game
const game = new Phaser.Game(config);

window.game = game; // Expose for Playwright tests
export default game;

window.triggerConfetti = (count = 50) => {
    count = Math.min(count, 100);
    const container = document.querySelector('.confetti-container');
    if (!container) return;
    
    const colors = ['#fde047', '#38bdf8', '#fb7185', '#34d399', '#a78bfa'];
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.animationDuration = (Math.random() * 2 + 1) + 's';
        particle.style.animationDelay = (Math.random() * 0.5) + 's';
        container.appendChild(particle);
        setTimeout(() => particle.remove(), 3000);
    }
};

window.triggerMoneyFlyUp = (amount, x, y) => {
    const container = document.getElementById('game-screen');
    if (!container) return;
    
    const flyup = document.createElement('div');
    flyup.className = 'money-fly-up ' + (amount >= 0 ? 'money-positive' : 'money-negative');
    flyup.style.left = x + 'px';
    flyup.style.top = y + 'px';
    flyup.textContent = (amount > 0 ? '+' : '') + amount.toLocaleString('en-US');
    container.appendChild(flyup);
    
    setTimeout(() => flyup.remove(), 2000);
};
