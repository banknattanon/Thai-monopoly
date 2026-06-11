// PropertyCard - Phaser object container for showing detailed property details on hover/click

import { formatMoney } from '../utils/helpers.js';

export default class PropertyCard extends Phaser.GameObjects.Container {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     */
    constructor(scene, x, y) {
        super(scene, x, y);

        this.scene = scene;
        this.setVisible(false);
        this.setDepth(2000); // Always on top

        // Dimensions
        this.cardWidth = 260;
        this.cardHeight = 340;

        // Background
        this.bg = scene.add.graphics();
        this.add(this.bg);

        // Header stripe
        this.headerStripe = scene.add.graphics();
        this.add(this.headerStripe);

        // Title text
        this.titleTh = scene.add.text(this.cardWidth / 2, 20, '', {
            fontFamily: 'Noto Sans Thai, sans-serif',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        this.add(this.titleTh);

        this.titleEn = scene.add.text(this.cardWidth / 2, 42, '', {
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            color: '#DDDDDD'
        }).setOrigin(0.5);
        this.add(this.titleEn);

        // Rent text fields array
        this.rentTexts = [];
        const startY = 70;
        const spacing = 20;

        // Populate placeholders for rent rows
        for (let i = 0; i < 6; i++) {
            const labelText = scene.add.text(15, startY + i * spacing, '', {
                fontFamily: 'Noto Sans Thai, sans-serif',
                fontSize: '12px',
                color: '#AAAAAA'
            });
            const valText = scene.add.text(this.cardWidth - 15, startY + i * spacing, '', {
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#EAB308'
            }).setOrigin(1, 0);

            this.add(labelText);
            this.add(valText);
            this.rentTexts.push({ label: labelText, val: valText });
        }

        // Info divider
        this.divider = scene.add.graphics();
        this.add(this.divider);

        // Footer info (Build cost, mortgage, owner)
        this.buildCostText = scene.add.text(15, 205, '', {
            fontFamily: 'Noto Sans Thai, sans-serif',
            fontSize: '11px',
            color: '#999999'
        });
        this.add(this.buildCostText);

        this.mortgageText = scene.add.text(15, 225, '', {
            fontFamily: 'Noto Sans Thai, sans-serif',
            fontSize: '11px',
            color: '#999999'
        });
        this.add(this.mortgageText);

        this.ownerText = scene.add.text(15, 250, '', {
            fontFamily: 'Noto Sans Thai, sans-serif',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#EAB308'
        });
        this.add(this.ownerText);

        this.mortgageStatusText = scene.add.text(15, 275, '', {
            fontFamily: 'Noto Sans Thai, sans-serif',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#EF4444'
        });
        this.add(this.mortgageStatusText);

        scene.add.existing(this);
    }

    /**
     * Updates card styling and data.
     * @param {Object} square
     * @param {string} [ownerName]
     * @param {string} [ownerColor]
     * @param {number} [houses]
     * @param {boolean} [hasHotel]
     * @param {boolean} [isMortgaged]
     */
    updateData(square, ownerName = null, ownerColor = null, houses = 0, hasHotel = false, isMortgaged = false) {
        if (!square) return;

        // Clean graphics
        this.bg.clear();
        this.headerStripe.clear();
        this.divider.clear();

        // Draw shadow and card background
        this.bg.fillStyle(0x0e131f, 0.95);
        this.bg.lineStyle(2, 0xd4af37, 0.8);
        this.bg.fillRoundedRect(0, 0, this.cardWidth, this.cardHeight, 12);
        this.bg.strokeRoundedRect(0, 0, this.cardWidth, this.cardHeight, 12);

        // Populate titles
        this.titleTh.setText(square.name);
        this.titleEn.setText(square.nameEn);

        // Header stripe color
        if (square.type === 'property') {
            const headerColor = Phaser.Display.Color.HexStringToColor(square.color || '#FFFFFF').color;
            this.headerStripe.fillStyle(headerColor, 1);
            this.headerStripe.fillRoundedRect(2, 2, this.cardWidth - 4, 60, { tl: 10, tr: 10, bl: 0, br: 0 });
            this.titleTh.setColor('#FFFFFF');
            this.titleEn.setColor('#EEEEEE');
        } else {
            // Dark gray stripe for railroads, utilities, taxes etc.
            this.headerStripe.fillStyle(0x1a2333, 1);
            this.headerStripe.fillRoundedRect(2, 2, this.cardWidth - 4, 60, { tl: 10, tr: 10, bl: 0, br: 0 });
            this.titleTh.setColor('#EAB308');
            this.titleEn.setColor('#BBBBBB');
        }

        // Draw Divider
        this.divider.lineStyle(1, 0x334155, 0.5);
        this.divider.lineBetween(15, 195, this.cardWidth - 15, 195);

        // Rent rows loading
        const rowLabels = [];
        const rowValues = [];

        if (square.type === 'property') {
            const rent = square.rent || [0, 0, 0, 0, 0, 0];
            rowLabels.push('ค่าเช่าเริ่มต้น / Base Rent', 'บ้าน 1 หลัง / 1 House', 'บ้าน 2 หลัง / 2 Houses', 'บ้าน 3 หลัง / 3 Houses', 'บ้าน 4 หลัง / 4 Houses', 'โรงแรม / Hotel');
            rowValues.push(formatMoney(rent[0]), formatMoney(rent[1]), formatMoney(rent[2]), formatMoney(rent[3]), formatMoney(rent[4]), formatMoney(rent[5]));

            this.buildCostText.setText(`ค่าสร้างสิ่งปลูกสร้าง: ${formatMoney(square.buildCost)} / หลัง`);
            this.mortgageText.setText(`ราคาจำนอง: ${formatMoney(square.mortgageValue)}`);
            this.buildCostText.setVisible(true);
            this.mortgageText.setVisible(true);
        } else if (square.type === 'railroad') {
            const rent = square.rent || [250, 500, 1000, 2000];
            rowLabels.push('ครองสถานี 1 แห่ง', 'ครองสถานี 2 แห่ง', 'ครองสถานี 3 แห่ง', 'ครองสถานี 4 แห่ง', '', '');
            rowValues.push(formatMoney(rent[0]), formatMoney(rent[1]), formatMoney(rent[2]), formatMoney(rent[3]), '', '');

            this.buildCostText.setText('');
            this.mortgageText.setText(`ราคาจำนอง: ${formatMoney(square.mortgageValue)}`);
            this.buildCostText.setVisible(false);
            this.mortgageText.setVisible(true);
        } else if (square.type === 'utility') {
            rowLabels.push('ครองสาธารณูปโภค 1 แห่ง:', 'แต้มเต๋า x 40 เท่า', 'ครองสาธารณูปโภค 2 แห่ง:', 'แต้มเต๋า x 100 เท่า', '', '');
            rowValues.push('', '', '', '', '', '');

            this.buildCostText.setText('');
            this.mortgageText.setText(`ราคาจำนอง: ${formatMoney(square.mortgageValue)}`);
            this.buildCostText.setVisible(false);
            this.mortgageText.setVisible(true);
        } else if (square.type === 'tax') {
            rowLabels.push('ภาษีที่ต้องชำระ:', formatMoney(square.cost), '', '', '', '');
            rowValues.push('', '', '', '', '', '');
            
            this.buildCostText.setVisible(false);
            this.mortgageText.setVisible(false);
        } else {
            // General Board Tiles (GO, Jail, Free Parking, etc.)
            rowLabels.push('ประเภทช่อง:', square.type.toUpperCase(), '', '', '', '');
            rowValues.push('', '', '', '', '', '');
            
            this.buildCostText.setVisible(false);
            this.mortgageText.setVisible(false);
        }

        // Apply rent texts
        for (let i = 0; i < 6; i++) {
            const label = rowLabels[i] || '';
            const val = rowValues[i] || '';
            this.rentTexts[i].label.setText(label);
            this.rentTexts[i].val.setText(val);
        }

        // Owner Info display
        if (ownerName) {
            this.ownerText.setText(`เจ้าของ: ${ownerName}`);
            this.ownerText.setColor(ownerColor || '#EAB308');
            this.ownerText.setVisible(true);
        } else {
            this.ownerText.setVisible(false);
        }

        // Mortgage status display
        if (isMortgaged) {
            this.mortgageStatusText.setText('⚠️ ถูกจำนอง / MORTGAGED');
            this.mortgageStatusText.setVisible(true);
        } else {
            this.mortgageStatusText.setVisible(false);
        }
    }

    /**
     * Show card at x,y coordinate ensuring it doesn't clip boundaries.
     * @param {number} x
     * @param {number} y
     */
    show(x, y) {
        // Bound checks to prevent drawing off-screen
        let newX = x + 15;
        let newY = y - 100;

        if (newX + this.cardWidth > this.scene.sys.game.config.width) {
            newX = x - this.cardWidth - 15;
        }
        if (newY + this.cardHeight > this.scene.sys.game.config.height) {
            newY = this.scene.sys.game.config.height - this.cardHeight - 15;
        }
        if (newY < 0) {
            newY = 15;
        }

        this.setPosition(newX, newY);
        this.setVisible(true);
    }

    /**
     * Hide the card container.
     */
    hide() {
        this.setVisible(false);
    }
}
