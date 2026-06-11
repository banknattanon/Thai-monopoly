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

export default game;
