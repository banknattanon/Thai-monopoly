// TokenManager - Manages player tokens on the Monopoly board

import { getSquareCoords } from '../utils/helpers.js';

export default class TokenManager {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} boardOffsetX - X offset of the board inside the GameScene
     * @param {number} boardOffsetY - Y offset of the board inside the GameScene
     */
    constructor(scene, boardOffsetX, boardOffsetY) {
        this.scene = scene;
        this.boardOffsetX = boardOffsetX;
        this.boardOffsetY = boardOffsetY;
        this.tokens = new Map(); // playerId -> Phaser.GameObjects.Container
        this.positions = new Map(); // playerId -> number (current square index)
    }

    /**
     * Spawns a token for a player.
     * @param {string} playerId
     * @param {string} colorHex
     * @param {string} emoji
     * @param {number} startPosition
     */
    createToken(playerId, colorHex, emoji, startPosition = 0) {
        // Remove existing token if any
        this.removeToken(playerId);

        // Convert hex color string to numeric
        const color = Phaser.Display.Color.HexStringToColor(colorHex).color;

        // Create token container
        const container = this.scene.add.container(0, 0);
        container.setDepth(100); // Overlay tokens on top of board

        // Base circle (Token ring)
        const base = this.scene.add.graphics();
        base.fillStyle(0xffffff, 0.95);
        base.lineStyle(2, color, 1);
        base.fillCircle(0, 0, 18);
        base.strokeCircle(0, 0, 18);
        container.add(base);

        // Inner solid dot showing player color
        const dot = this.scene.add.graphics();
        dot.fillStyle(color, 0.35);
        dot.fillCircle(0, 0, 14);
        container.add(dot);

        // Emoji display
        const text = this.scene.add.text(0, 0, emoji, {
            fontSize: '18px',
            fontFamily: 'Segoe UI Emoji, Apple Color Emoji, sans-serif'
        }).setOrigin(0.5, 0.5);
        container.add(text);

        // Save reference
        this.tokens.set(playerId, container);
        this.positions.set(playerId, startPosition);

        // Instantly position it on the square (with proper alignment)
        const coords = getSquareCoords(startPosition);
        container.setPosition(coords.x + this.boardOffsetX, coords.y + this.boardOffsetY);

        // Trigger alignment for this square
        this.alignTokensOnSquare(startPosition);

        return container;
    }

    /**
     * Animates token tile-by-tile from position fromPos to toPos.
     * @param {string} playerId
     * @param {number} fromPos
     * @param {number} toPos
     * @param {boolean} passedGo
     * @returns {Promise<void>}
     */
    moveToken(playerId, fromPos, toPos, passedGo) {
        return new Promise((resolve) => {
            const token = this.tokens.get(playerId);
            if (!token) {
                resolve();
                return;
            }

            // If it's a direct teleport (like going to jail)
            const isTeleport = Math.abs(toPos - fromPos) > 12 && !passedGo;
            if (isTeleport) {
                this.positions.set(playerId, toPos);
                const targetCoords = getSquareCoords(toPos);
                
                // Align tokens on old square first
                this.alignTokensOnSquare(fromPos);

                this.scene.tweens.add({
                    targets: token,
                    x: targetCoords.x + this.boardOffsetX,
                    y: targetCoords.y + this.boardOffsetY,
                    scale: { from: 1.5, to: 1 },
                    alpha: { from: 0.2, to: 1 },
                    duration: 800,
                    ease: 'Power2.easeOut',
                    onComplete: () => {
                        this.alignTokensOnSquare(toPos);
                        resolve();
                    }
                });
                return;
            }

            // Normal sequential tile-by-tile movement
            const path = [];
            let curr = fromPos;
            while (curr !== toPos) {
                curr = (curr + 1) % 40;
                path.push(curr);
            }

            // Align old square
            this.positions.set(playerId, -1); // temporarily out of square for layout
            this.alignTokensOnSquare(fromPos);

            let chain = this.scene.tweens.chain({
                tweens: path.map((tileIndex, i) => {
                    const coords = getSquareCoords(tileIndex);
                    return {
                        targets: token,
                        x: coords.x + this.boardOffsetX,
                        y: coords.y + this.boardOffsetY,
                        scale: { from: 1.2, to: 1 },
                        duration: 300,
                        ease: 'Quad.easeInOut',
                        onStart: () => {
                            if (tileIndex === 0 && passedGo) {
                                if (this.scene.emitGoConfetti) {
                                    this.scene.emitGoConfetti(coords.x + this.boardOffsetX, coords.y + this.boardOffsetY);
                                }
                            }
                        }
                    };
                }),
                onComplete: () => {
                    this.positions.set(playerId, toPos);
                    this.alignTokensOnSquare(toPos);
                    resolve();
                }
            });
        });
    }

    /**
     * Warps player to jail with a rapid spin animation.
     * @param {string} playerId
     */
    moveToJail(playerId) {
        return this.moveToken(playerId, this.positions.get(playerId) || 0, 10, false);
    }

    /**
     * Removes player token, e.g. on bankruptcy.
     * @param {string} playerId
     */
    removeToken(playerId) {
        const token = this.tokens.get(playerId);
        if (token) {
            const oldPos = this.positions.get(playerId);
            this.scene.tweens.add({
                targets: token,
                alpha: 0,
                scale: 0.2,
                duration: 500,
                onComplete: () => {
                    token.destroy();
                    this.tokens.delete(playerId);
                    this.positions.delete(playerId);
                    if (oldPos !== undefined && oldPos !== null) {
                        this.alignTokensOnSquare(oldPos);
                    }
                }
            });
        }
    }

    /**
     * Re-calculates token offsets for a square when multiple players stand there.
     * @param {number} squareIndex
     */
    alignTokensOnSquare(squareIndex) {
        // Get all players currently at this square index
        const playersHere = [];
        this.positions.forEach((pos, pId) => {
            if (pos === squareIndex) {
                playersHere.push(pId);
            }
        });

        const count = playersHere.length;
        if (count === 0) return;

        const baseCoords = getSquareCoords(squareIndex);
        const centerX = baseCoords.x + this.boardOffsetX;
        const centerY = baseCoords.y + this.boardOffsetY;

        // Offset layout patterns (up to 6 players)
        const getOffset = (index, total) => {
            if (total === 1) return { x: 0, y: 0 };
            if (total === 2) {
                return index === 0 ? { x: -10, y: 0 } : { x: 10, y: 0 };
            }
            if (total === 3) {
                const angle = (index * 2 * Math.PI) / 3 - Math.PI / 2;
                return { x: Math.cos(angle) * 12, y: Math.sin(angle) * 12 };
            }
            if (total === 4) {
                const offsets = [
                    { x: -10, y: -10 },
                    { x: 10, y: -10 },
                    { x: -10, y: 10 },
                    { x: 10, y: 10 }
                ];
                return offsets[index] || { x: 0, y: 0 };
            }
            // 5 or 6 players
            const angle = (index * 2 * Math.PI) / (total - 1);
            if (index === total - 1) return { x: 0, y: 0 }; // center player
            return { x: Math.cos(angle) * 14, y: Math.sin(angle) * 14 };
        };

        // Apply offsets using simple tween transitions
        playersHere.forEach((pId, idx) => {
            const token = this.tokens.get(pId);
            if (token) {
                const offset = getOffset(idx, count);
                this.scene.tweens.add({
                    targets: token,
                    x: centerX + offset.x,
                    y: centerY + offset.y,
                    duration: 300,
                    ease: 'Back.easeOut'
                });
            }
        });
    }
}
