// DiceManager - Manages client-side dice rolling animation and visual representation

export default class DiceManager {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} boardCenterX - X center position of the board
     * @param {number} boardCenterY - Y center position of the board
     */
    constructor(scene, boardCenterX, boardCenterY) {
        this.scene = scene;
        this.centerX = boardCenterX;
        this.centerY = boardCenterY;

        this.dieSize = 54;
        this.dotRadius = 4.5;

        // Container to hold both dice
        this.container = scene.add.container(this.centerX, this.centerY);
        this.container.setDepth(150);
        this.container.setVisible(false);

        // Dice 1
        this.die1Container = scene.add.container(-40, 0);
        this.die1Bg = scene.add.graphics();
        this.die1Dots = scene.add.graphics();
        this.die1Container.add(this.die1Bg);
        this.die1Container.add(this.die1Dots);
        this.container.add(this.die1Container);

        // Dice 2
        this.die2Container = scene.add.container(40, 0);
        this.die2Bg = scene.add.graphics();
        this.die2Dots = scene.add.graphics();
        this.die2Container.add(this.die2Bg);
        this.die2Container.add(this.die2Dots);
        this.container.add(this.die2Container);

        // Glow indicator for doubles
        this.glow = scene.add.graphics();
        this.glow.setDepth(-1); // behind dice
        this.container.add(this.glow);
    }

    /**
     * Resets and hides the dice container.
     */
    reset() {
        this.container.setVisible(false);
        this.glow.clear();
        this.die1Container.setScale(1).setAngle(0);
        this.die2Container.setScale(1).setAngle(0);
    }

    /**
     * Renders a die face onto graphics.
     * @param {Phaser.GameObjects.Graphics} bgGraphics
     * @param {Phaser.GameObjects.Graphics} dotGraphics
     * @param {number} value (1-6)
     */
    drawDie(bgGraphics, dotGraphics, value) {
        bgGraphics.clear();
        dotGraphics.clear();

        const half = this.dieSize / 2;

        // Draw shadow
        bgGraphics.fillStyle(0x000000, 0.4);
        bgGraphics.fillRoundedRect(-half + 4, -half + 4, this.dieSize, this.dieSize, 8);

        // Draw white base face
        bgGraphics.fillStyle(0xffffff, 1);
        bgGraphics.lineStyle(2, 0xd4af37, 1); // gold border
        bgGraphics.fillRoundedRect(-half, -half, this.dieSize, this.dieSize, 8);
        bgGraphics.strokeRoundedRect(-half, -half, this.dieSize, this.dieSize, 8);

        // Draw dots (dark charcoal)
        dotGraphics.fillStyle(0x1e293b, 1);

        const third = this.dieSize / 3;
        const q = third / 1.15; // spacing factor

        // Coordinate offsets
        const center = { x: 0, y: 0 };
        const tl = { x: -q, y: -q };
        const tr = { x: q, y: -q };
        const ml = { x: -q, y: 0 };
        const mr = { x: q, y: 0 };
        const bl = { x: -q, y: q };
        const br = { x: q, y: q };

        const drawDot = (pos) => {
            dotGraphics.fillCircle(pos.x, pos.y, this.dotRadius);
        };

        // Standard dot layout
        switch (value) {
            case 1:
                // Single red center dot for 1 (traditional Asian design style)
                dotGraphics.fillStyle(0xef4444, 1);
                drawDot(center);
                break;
            case 2:
                drawDot(tl);
                drawDot(br);
                break;
            case 3:
                drawDot(tl);
                drawDot(center);
                drawDot(br);
                break;
            case 4:
                drawDot(tl);
                drawDot(tr);
                drawDot(bl);
                drawDot(br);
                break;
            case 5:
                drawDot(tl);
                drawDot(tr);
                drawDot(center);
                drawDot(bl);
                drawDot(br);
                break;
            case 6:
                drawDot(tl);
                drawDot(tr);
                drawDot(ml);
                drawDot(mr);
                drawDot(bl);
                drawDot(br);
                break;
        }
    }

    /**
     * Executes the dice rolling animation.
     * @param {number} val1
     * @param {number} val2
     * @param {boolean} isDouble
     * @returns {Promise<void>}
     */
    roll(val1, val2, isDouble) {
        return new Promise((resolve) => {
            this.reset();
            this.container.setVisible(true);

            let duration = 900;
            let intervalTime = 60;
            let elapsed = 0;

            // Timer to cycle random values for rolling effect
            const rollTimer = this.scene.time.addEvent({
                delay: intervalTime,
                loop: true,
                callback: () => {
                    elapsed += intervalTime;
                    const r1 = Phaser.Math.Between(1, 6);
                    const r2 = Phaser.Math.Between(1, 6);
                    this.drawDie(this.die1Bg, this.die1Dots, r1);
                    this.drawDie(this.die2Bg, this.die2Dots, r2);

                    // Random slight offsets to simulate shaking
                    this.die1Container.setPosition(-40 + Phaser.Math.Between(-6, 6), Phaser.Math.Between(-6, 6));
                    this.die2Container.setPosition(40 + Phaser.Math.Between(-6, 6), Phaser.Math.Between(-6, 6));
                }
            });

            // Spin/Shake animations using Tweens
            this.scene.tweens.add({
                targets: [this.die1Container, this.die2Container],
                angle: { from: -180, to: 360 },
                scale: { from: 0.5, to: 1.2 },
                duration: duration - 100,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    rollTimer.destroy();

                    // Lock to final results
                    this.die1Container.setPosition(-40, 0).setScale(1).setAngle(0);
                    this.die2Container.setPosition(40, 0).setScale(1).setAngle(0);

                    this.drawDie(this.die1Bg, this.die1Dots, val1);
                    this.drawDie(this.die2Bg, this.die2Dots, val2);

                    // Double Highlight
                    if (isDouble) {
                        this.drawDoubleGlow();
                        // Flash/shake effect
                        this.scene.tweens.add({
                            targets: this.container,
                            scale: 1.15,
                            duration: 150,
                            yoyo: true,
                            repeat: 1,
                            ease: 'Quad.easeInOut'
                        });
                    }

                    // Leave visible for a moment then resolve
                    this.scene.time.delayedCall(1200, () => {
                        resolve();
                    });
                }
            });
        });
    }

    /**
     * Draws a pulsing gold halo behind the dice for doubles.
     */
    drawDoubleGlow() {
        this.glow.clear();
        this.glow.fillStyle(0xeab308, 0.25);
        this.glow.fillCircle(0, 0, 95);
        this.glow.lineStyle(3, 0xeab308, 0.75);
        this.glow.strokeCircle(0, 0, 95);

        // Pulsing tween
        this.scene.tweens.add({
            targets: this.glow,
            alpha: { from: 1, to: 0.35 },
            scale: { from: 1, to: 1.1 },
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }
}
