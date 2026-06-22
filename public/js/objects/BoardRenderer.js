// BoardRenderer - Renders the Monopoly board graphics and tiles in Phaser

import { BOARD_SQUARES, COLOR_GROUPS, BOARD_LAYOUT } from '../utils/constants.js';
import { getSquareCoords } from '../utils/helpers.js';

export default class BoardRenderer {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x - X offset for board top-left
     * @param {number} y - Y offset for board top-left
     * @param {PropertyCard} propertyCard - Reference to PropertyCard hover object
     */
    constructor(scene, x, y, propertyCard) {
        this.scene = scene;
        this.offsetX = x;
        this.offsetY = y;
        this.propertyCard = propertyCard;

        this.boardSize = BOARD_LAYOUT.BOARD_SIZE;
        this.squareContainers = []; // index -> Phaser.GameObjects.Container

        this.createBoard();
    }

    /**
     * Constructs the board tiles and links interaction zones.
     */
    createBoard() {
        // Draw main board background first
        const boardBg = this.scene.add.graphics();
        boardBg.fillStyle(0x0b0f19, 1); // Dark theme #0b0f19
        boardBg.lineStyle(4, 0xd4af37, 1); // Gold outer boundary
        boardBg.fillRoundedRect(this.offsetX, this.offsetY, this.boardSize, this.boardSize, 16);
        boardBg.strokeRoundedRect(this.offsetX, this.offsetY, this.boardSize, this.boardSize, 16);

        // Draw inner board background (center area)
        const innerSize = this.boardSize - 2 * BOARD_LAYOUT.CORNER_SIZE;
        
        const centerImage = this.scene.add.image(
            this.offsetX + this.boardSize / 2,
            this.offsetY + this.boardSize / 2,
            'board_bg'
        );
        centerImage.setDisplaySize(innerSize, innerSize);
        // Add neon glow to the center image
        centerImage.setTint(0xffffff);
        
        // Add an outline for crisp edges
        const innerBg = this.scene.add.graphics();
        innerBg.lineStyle(3, 0xd4af37, 1); // Solid gold border
        innerBg.strokeRect(
            this.offsetX + BOARD_LAYOUT.CORNER_SIZE,
            this.offsetY + BOARD_LAYOUT.CORNER_SIZE,
            innerSize,
            innerSize
        );

        // Center titles
        const centerTh = this.scene.add.text(
            this.offsetX + this.boardSize / 2,
            this.offsetY + this.boardSize / 2 - 45,
            'เกมเศรษฐี',
            {
                fontFamily: 'Noto Sans Thai, sans-serif',
                fontSize: '48px',
                fontWeight: '900',
                color: '#d4af37',
                stroke: '#000000',
                strokeThickness: 6
            }
        ).setOrigin(0.5);
        centerTh.setShadow(0, 0, '#d4af37', 20, false, true);

        const centerEn = this.scene.add.text(
            this.offsetX + this.boardSize / 2,
            this.offsetY + this.boardSize / 2 + 45,
            'S E T T H I   O N L I N E',
            {
                fontFamily: 'Outfit, Inter, sans-serif',
                fontSize: '24px',
                fontWeight: '800',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
        centerEn.setShadow(0, 0, '#00f2fe', 15, false, true);

        // Render each of the 40 squares
        BOARD_SQUARES.forEach(sq => {
            const index = sq.position;
            const coords = getSquareCoords(index);

            // Container placed at calculated center of square
            const container = this.scene.add.container(
                coords.x + this.offsetX,
                coords.y + this.offsetY
            );
            container.setDepth(10);
            
            // Side squares are rotated automatically, corner squares stay upright
            const isCorner = [0, 10, 20, 30].includes(index);
            if (!isCorner) {
                container.setAngle(coords.rotation);
            }

            // Draw tile background shape
            const bg = this.scene.add.graphics();
            bg.fillStyle(0x0b0f19, 1); // Dark background
            bg.lineStyle(1.5, 0xd4af37, 0.8); // Gold outline
            bg.fillRect(-coords.width / 2, -coords.height / 2, coords.width, coords.height);
            bg.strokeRect(-coords.width / 2, -coords.height / 2, coords.width, coords.height);
            container.add(bg);
            container.bgGraphics = bg; // cache reference for highlights

            // If property, draw color bar at the top edge of the tile
            if (sq.type === 'property' && sq.color) {
                const colorBar = this.scene.add.graphics();
                const barHeight = 16;
                colorBar.fillStyle(Phaser.Display.Color.HexStringToColor(sq.color).color, 1);
                colorBar.fillRect(-coords.width / 2 + 1, -coords.height / 2 + 1, coords.width - 2, barHeight);
                container.add(colorBar);
            }

            // Create container for houses/hotels (drawn dynamically on updates)
            const buildingGraphics = this.scene.add.graphics();
            container.add(buildingGraphics);
            container.buildingGraphics = buildingGraphics;

            // Create container for owner indicators (drawn dynamically on updates)
            const ownerGraphics = this.scene.add.graphics();
            container.add(ownerGraphics);
            container.ownerGraphics = ownerGraphics;
            
            const textContainer = this.scene.add.container(0, 0);
            if (!isCorner) {
                textContainer.setAngle(-coords.rotation);
            }
            container.add(textContainer);

            let titleX = 0;
            let titleY = 0;
            let priceX = 0;
            let priceY = 0;
            let iconX = 0;
            let iconY = 0;
            
            let fontSize = isCorner ? '16px' : '15px';
            let wordWrapWidth = coords.width - 4;

            if (!isCorner) {
                if (coords.rotation === 0) { // Bottom
                    titleY = -coords.height / 2 + (sq.type === 'property' ? 28 : 15);
                    priceY = coords.height / 2 - 15;
                    iconY = -5;
                } else if (coords.rotation === 180) { // Top
                    titleY = -coords.height / 2 + 15;
                    priceY = coords.height / 2 - (sq.type === 'property' ? 25 : 15);
                    iconY = 0;
                } else if (coords.rotation === 90) { // Left
                    titleX = (sq.type === 'property' ? -10 : 0);
                    titleY = -12;
                    priceX = titleX;
                    priceY = 15;
                    iconX = titleX;
                    iconY = 0;
                    fontSize = '12px';
                    wordWrapWidth = 90;
                } else if (coords.rotation === 270) { // Right
                    titleX = (sq.type === 'property' ? 10 : 0);
                    titleY = -12;
                    priceX = titleX;
                    priceY = 15;
                    iconX = titleX;
                    iconY = 0;
                    fontSize = '12px';
                    wordWrapWidth = 90;
                }
            } else {
                titleY = -coords.height / 2 + 15;
            }

            let nameText = sq.name;
            if (!isCorner && (coords.rotation === 90 || coords.rotation === 270)) {
                nameText = sq.name.replace('\n', ' '); // Use horizontal space instead of line breaks
            }

            // Title
            const title = this.scene.add.text(titleX, titleY, nameText, {
                fontFamily: 'Noto Sans Thai, sans-serif',
                fontSize: fontSize,
                fontWeight: '700',
                color: '#FFFFFF',
                align: 'center',
                stroke: '#000000',
                strokeThickness: 3,
                wordWrap: { width: wordWrapWidth, useAdvancedWrap: true }
            }).setOrigin(0.5, 0.5);

            textContainer.add(title);

            // Price label
            if (sq.price || sq.cost) {
                const priceVal = sq.price || sq.cost;
                const priceText = this.scene.add.text(priceX, priceY, `฿${priceVal}`, {
                    fontFamily: 'Outfit, Inter, sans-serif',
                    fontSize: '13px',
                    fontWeight: '900',
                    color: '#FDE047',
                    stroke: '#000000',
                    strokeThickness: 3
                }).setOrigin(0.5, 0.5);

                textContainer.add(priceText);
            }

            if (sq.type === 'utility' && sq.icon) {
                const icon = this.scene.add.text(iconX, iconY, sq.icon, { fontSize: '24px' }).setOrigin(0.5);
                textContainer.add(icon);
            } else if (sq.type === 'railroad') {
                const icon = this.scene.add.text(iconX, iconY, '🚂', { fontSize: '22px' }).setOrigin(0.5);
                textContainer.add(icon);
            } else if (sq.type === 'chance') {
                const icon = this.scene.add.text(iconX, iconY, '❓', { fontSize: '28px', color: '#EF4444' }).setOrigin(0.5);
                textContainer.add(icon);
            } else if (sq.type === 'community') {
                const icon = this.scene.add.text(iconX, iconY, '📦', { fontSize: '26px', color: '#3B82F6' }).setOrigin(0.5);
                textContainer.add(icon);
            }

            // Specific layouts for corners
            if (index === 0) { // GO
                title.setText('จุดเริ่มต้น\nGO').setPosition(0, -18);
                const arrow = this.scene.add.text(0, 15, '⬅️', { fontSize: '22px' }).setOrigin(0.5);
                container.add(arrow);
            } else if (index === 10) { // JAIL
                title.setText('คุก / JAIL').setPosition(0, -20);
                const icon = this.scene.add.text(0, 10, '🔒', { fontSize: '24px' }).setOrigin(0.5);
                container.add(icon);
            } else if (index === 20) { // FREE PARKING
                title.setText('จอดรถฟรี\nPARKING').setPosition(0, -20);
                const icon = this.scene.add.text(0, 15, '🚗', { fontSize: '24px' }).setOrigin(0.5);
                container.add(icon);
            } else if (index === 30) { // GO TO JAIL
                title.setText('ไปคุก!\nGO TO JAIL').setPosition(0, -20);
                const icon = this.scene.add.text(0, 15, '👮', { fontSize: '24px' }).setOrigin(0.5);
                container.add(icon);
            }

            // Set up interactivity
            container.setInteractive(
                new Phaser.Geom.Rectangle(-coords.width / 2, -coords.height / 2, coords.width, coords.height),
                Phaser.Geom.Rectangle.Contains
            );

            // Listeners
            const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

            container.on('pointerover', (pointer) => {
                if (isTouchDevice) return;
                this.highlightSquare(index, 0xd4af37); // Gold hover outline
                this.scene.events.emit('tile-hover', { square: sq, pointer: pointer });
            });

            container.on('pointermove', (pointer) => {
                if (isTouchDevice) return;
                this.scene.events.emit('tile-hover-move', { pointer: pointer });
            });

            container.on('pointerout', () => {
                if (isTouchDevice) return;
                this.clearHighlight(index);
                this.scene.events.emit('tile-out');
            });

            container.on('pointerup', () => {
                this.scene.events.emit('tile-click', { square: sq });
            });

            this.squareContainers[index] = container;
        });
    }

    /**
     * Draws owner dot indicator in the player's color index.
     * @param {number} position
     * @param {string} playerColorHex
     * @param {boolean} isMortgaged
     */
    updateOwner(position, playerColorHex, isMortgaged = false) {
        const container = this.squareContainers[position];
        if (!container) return;

        const g = container.ownerGraphics;
        g.clear();

        const coords = getSquareCoords(position);

        if (playerColorHex) {
            const color = Phaser.Display.Color.HexStringToColor(playerColorHex).color;
            
            // Draw a thick colored inner border for the property to show ownership clearly
            g.lineStyle(5, color, 1);
            g.strokeRect(-coords.width / 2 + 2.5, -coords.height / 2 + 2.5, coords.width - 5, coords.height - 5);
            
            // Optionally add a slight transparent fill
            g.fillStyle(color, 0.15);
            g.fillRect(-coords.width / 2, -coords.height / 2, coords.width, coords.height);
        }

        if (isMortgaged) {
            // Draw a dark semi-transparent overlay
            g.fillStyle(0x000000, 0.6);
            g.fillRect(-coords.width / 2, -coords.height / 2, coords.width, coords.height);
            
            // Draw an X or a red line to indicate mortgage
            g.lineStyle(4, 0xff0000, 0.8);
            g.beginPath();
            g.moveTo(-coords.width / 2 + 10, -coords.height / 2 + 10);
            g.lineTo(coords.width / 2 - 10, coords.height / 2 - 10);
            g.strokePath();
            g.beginPath();
            g.moveTo(coords.width / 2 - 10, -coords.height / 2 + 10);
            g.lineTo(-coords.width / 2 + 10, coords.height / 2 - 10);
            g.strokePath();
        }
    }

    /**
     * Renders houses or hotel blocks onto the tile's building layer.
     * @param {number} position
     * @param {number} houses
     * @param {boolean} hasHotel
     */
    updateBuildings(position, houses, hasHotel) {
        const container = this.squareContainers[position];
        if (!container) return;

        const coords = getSquareCoords(position);
        const g = container.buildingGraphics;
        g.clear();

        const barHeight = 16;
        const topY = -coords.height / 2 + 1; // local Y of color bar top edge

        if (hasHotel) {
            // Draw hotel: Red block in the middle of color bar
            g.fillStyle(0xef4444, 1);
            g.lineStyle(1, 0xffffff, 0.8);
            g.fillRect(-10, topY + 2, 20, barHeight - 4);
            g.strokeRect(-10, topY + 2, 20, barHeight - 4);
        } else if (houses > 0) {
            // Draw houses: Green blocks
            g.fillStyle(0x22c55e, 1);
            g.lineStyle(1, 0xffffff, 0.7);

            const houseWidth = 8;
            const houseHeight = 8;
            const yPos = topY + (barHeight - houseHeight) / 2;

            // Space houses out evenly on color bar width
            const totalWidth = houses * houseWidth + (houses - 1) * 3;
            const startX = -totalWidth / 2;

            for (let i = 0; i < houses; i++) {
                const xPos = startX + i * (houseWidth + 3);
                g.fillRect(xPos, yPos, houseWidth, houseHeight);
                g.strokeRect(xPos, yPos, houseWidth, houseHeight);
            }
        }
    }

    /**
     * Draws dynamic glow highlight on a square.
     * @param {number} position
     * @param {number} colorHexNumeric - numeric color value, e.g. 0xd4af37
     */
    highlightSquare(position, colorHexNumeric = 0xd4af37) {
        const container = this.squareContainers[position];
        if (!container) return;

        const coords = getSquareCoords(position);
        const bg = container.bgGraphics;

        bg.clear();
        // fill background slightly gold tinted
        bg.fillStyle(0x1a2235, 1);
        bg.lineStyle(3, colorHexNumeric, 1); // thicker highlight border
        bg.fillRect(-coords.width / 2, -coords.height / 2, coords.width, coords.height);
        bg.strokeRect(-coords.width / 2, -coords.height / 2, coords.width, coords.height);
    }

    /**
     * Clears highlights, resetting tile border to standard dark layout.
     * @param {number} position
     */
    clearHighlight(position) {
        const container = this.squareContainers[position];
        if (!container) return;

        const coords = getSquareCoords(position);
        const bg = container.bgGraphics;

        bg.clear();
        bg.fillStyle(0x0f172a, 1);
        bg.lineStyle(1.5, 0x334155, 0.8);
        bg.fillRect(-coords.width / 2, -coords.height / 2, coords.width, coords.height);
        bg.strokeRect(-coords.width / 2, -coords.height / 2, coords.width, coords.height);
    }
}
