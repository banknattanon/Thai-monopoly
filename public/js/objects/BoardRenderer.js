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
        boardBg.fillStyle(0x1e293b, 1); // Dark slate
        boardBg.lineStyle(4, 0xd4af37, 1); // Gold outer boundary
        boardBg.fillRoundedRect(this.offsetX, this.offsetY, this.boardSize, this.boardSize, 16);
        boardBg.strokeRoundedRect(this.offsetX, this.offsetY, this.boardSize, this.boardSize, 16);

        // Draw inner board background (center area)
        const innerSize = this.boardSize - 2 * BOARD_LAYOUT.CORNER_SIZE;
        const innerBg = this.scene.add.graphics();
        innerBg.fillStyle(0x0f172a, 1); // Deep slate
        innerBg.lineStyle(2, 0x334155, 0.7); // Subtle border
        innerBg.fillRoundedRect(
            this.offsetX + BOARD_LAYOUT.CORNER_SIZE,
            this.offsetY + BOARD_LAYOUT.CORNER_SIZE,
            innerSize,
            innerSize,
            8
        );
        innerBg.strokeRoundedRect(
            this.offsetX + BOARD_LAYOUT.CORNER_SIZE,
            this.offsetY + BOARD_LAYOUT.CORNER_SIZE,
            innerSize,
            innerSize,
            8
        );

        // Add bilingual game name in center
        this.scene.add.text(
            this.offsetX + this.boardSize / 2,
            this.offsetY + this.boardSize / 2 - 30,
            'เกมเศรษฐี',
            {
                fontFamily: 'Noto Sans Thai, sans-serif',
                fontSize: '44px',
                fontWeight: 'bold',
                color: '#EAB308'
            }
        ).setOrigin(0.5).setAlpha(0.65);

        this.scene.add.text(
            this.offsetX + this.boardSize / 2,
            this.offsetY + this.boardSize / 2 + 15,
            'SETTHI ONLINE',
            {
                fontFamily: 'Inter, sans-serif',
                fontSize: '20px',
                fontWeight: '800',
                color: '#FFFFFF',
                letterSpacing: 2
            }
        ).setOrigin(0.5).setAlpha(0.4);

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
            bg.fillStyle(0x0f172a, 1); // Dark background
            bg.lineStyle(1.5, 0x334155, 0.8); // outline
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

            // Title label
            let titleY = -coords.height / 2 + (sq.type === 'property' ? 24 : 10);
            let fontSize = isCorner ? '14px' : '13px';
            let nameText = sq.name;

            // Shorten longer words for side bars if necessary
            if (!isCorner && nameText.length > 8) {
                nameText = nameText.substring(0, 7) + '..';
            }

            const title = this.scene.add.text(0, titleY, nameText, {
                fontFamily: 'Noto Sans Thai, sans-serif',
                fontSize: fontSize,
                fontWeight: '600',
                color: '#E2E8F0',
                align: 'center'
            }).setOrigin(0.5, 0);
            
            // Counter-rotate text so it is always perfectly upright
            if (!isCorner) {
                title.setAngle(-coords.rotation);
            }
            container.add(title);

            // Price label
            if (sq.price || sq.cost) {
                const priceVal = sq.price || sq.cost;
                const priceText = this.scene.add.text(0, coords.height / 2 - 14, `฿${priceVal}`, {
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#EAB308'
                }).setOrigin(0.5, 0);
                
                if (!isCorner) {
                    priceText.setAngle(-coords.rotation);
                }
                container.add(priceText);
            }

            if (sq.type === 'utility' && sq.icon) {
                const icon = this.scene.add.text(0, -5, sq.icon, { fontSize: '24px' }).setOrigin(0.5);
                if (!isCorner) icon.setAngle(-coords.rotation);
                container.add(icon);
            } else if (sq.type === 'railroad') {
                const icon = this.scene.add.text(0, -5, '🚂', { fontSize: '22px' }).setOrigin(0.5);
                if (!isCorner) icon.setAngle(-coords.rotation);
                container.add(icon);
            } else if (sq.type === 'chance') {
                const icon = this.scene.add.text(0, 0, '❓', { fontSize: '28px', color: '#EF4444' }).setOrigin(0.5);
                if (!isCorner) icon.setAngle(-coords.rotation);
                container.add(icon);
            } else if (sq.type === 'community') {
                const icon = this.scene.add.text(0, 0, '📦', { fontSize: '26px', color: '#3B82F6' }).setOrigin(0.5);
                if (!isCorner) icon.setAngle(-coords.rotation);
                container.add(icon);
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
            container.on('pointerover', () => {
                this.highlightSquare(index, 0xd4af37); // Gold hover outline
                this.scene.events.emit('tile-hover', { square: sq, x: container.x, y: container.y });
            });

            container.on('pointerout', () => {
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
     */
    updateOwner(position, playerColorHex) {
        const container = this.squareContainers[position];
        if (!container) return;

        const g = container.ownerGraphics;
        g.clear();

        if (playerColorHex) {
            const coords = getSquareCoords(position);
            const color = Phaser.Display.Color.HexStringToColor(playerColorHex).color;
            
            // Draw a thick colored inner border for the property to show ownership clearly
            g.lineStyle(5, color, 1);
            g.strokeRect(-coords.width / 2 + 2.5, -coords.height / 2 + 2.5, coords.width - 5, coords.height - 5);
            
            // Optionally add a slight transparent fill
            g.fillStyle(color, 0.15);
            g.fillRect(-coords.width / 2, -coords.height / 2, coords.width, coords.height);
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
