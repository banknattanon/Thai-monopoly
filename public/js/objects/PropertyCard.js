// PropertyCard - Client-side driver mapping Phaser board tile interactions to the HTML/DOM hover card popup

import { formatMoney } from '../utils/helpers.js';

export default class PropertyCard {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     */
    constructor(scene, x, y) {
        this.scene = scene;
        this.element = document.getElementById('hover-property-card');
        if (!this.element) {
            console.warn('PropertyCard: #hover-property-card element not found in DOM.');
        }
        
        // Mobile UI enhancements
        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        this.isCardVisible = false;
        this.currentCardPosition = null;
        this.backdropElement = null;

        // On touch devices, close card if tapping outside both the card and the Phaser board
        if (this.isTouchDevice) {
            document.addEventListener('touchstart', (e) => {
                const phaserContainer = document.getElementById('phaser-container');
                if (this.isCardVisible && this.element && 
                    !this.element.contains(e.target) && 
                    (!phaserContainer || !phaserContainer.contains(e.target))) {
                    this.hide();
                }
            }, { passive: true });
        }
    }

    /**
     * Updates card styling and data in the DOM container.
     * @param {Object} square
     * @param {string} [ownerName]
     * @param {string} [ownerColor]
     * @param {number} [houses]
     * @param {boolean} [hasHotel]
     * @param {boolean} [isMortgaged]
     */
    updateData(square, ownerName = null, ownerColor = null, houses = 0, hasHotel = false, isMortgaged = false) {
        if (!this.element || !square) return;

        // Populate titles
        const titleTh = document.getElementById('hover-card-title-th');
        const titleEn = document.getElementById('hover-card-title-en');
        if (titleTh) titleTh.textContent = square.name || '';
        if (titleEn) titleEn.textContent = square.nameEn || '';

        // Header stripe color based on property type / color group
        const header = document.getElementById('hover-card-header');
        if (header) {
            if (square.type === 'property' && square.color) {
                header.style.backgroundColor = square.color;
                header.style.color = '#FFFFFF';
                if (titleTh) titleTh.style.color = '#FFFFFF';
                if (titleEn) titleEn.style.color = '#EEEEEE';
            } else {
                // Dark gray stripe for non-colored properties
                header.style.backgroundColor = '#1a2333';
                header.style.color = 'var(--color-gold)';
                if (titleTh) titleTh.style.color = 'var(--color-gold)';
                if (titleEn) titleEn.style.color = '#BBBBBB';
            }
        }

        // Render rows dynamically
        const rentRows = [];
        const formatVal = (val) => typeof val === 'number' ? `฿${val.toLocaleString('th-TH')}` : '';

        // Helper to reset rent rows to default labels
        const resetRentRowLabels = () => {
            const defaultLabels = [
                'ค่าเช่าเริ่มต้น / Rent',
                '🏠 1 บ้าน / 1 House',
                '🏠🏠 2 บ้าน / 2 Houses',
                '🏠🏠🏠 3 บ้าน / 3 Houses',
                '🏠🏠🏠🏠 4 บ้าน / 4 Houses',
                '🏨 โรงแรม / Hotel'
            ];
            for (let i = 0; i < 6; i++) {
                const row = document.getElementById(`hover-card-rent-${i}`);
                if (row) {
                    const labelSpan = row.parentElement.querySelector('span:first-child');
                    if (labelSpan) labelSpan.textContent = defaultLabels[i];
                    row.textContent = '-';
                }
            }
        };

        resetRentRowLabels();

        if (square.type === 'property') {
            const rent = square.rent || [0, 0, 0, 0, 0, 0];
            for (let i = 0; i < 6; i++) {
                const el = document.getElementById(`hover-card-rent-${i}`);
                if (el) el.textContent = formatVal(rent[i]);
            }

            const buildCostRow = document.getElementById('hover-card-build-cost-row');
            const buildCost = document.getElementById('hover-card-build-cost');
            if (buildCostRow && buildCost) {
                buildCostRow.style.display = 'flex';
                buildCost.textContent = `${formatVal(square.buildCost)} / หลัง`;
            }
        } else if (square.type === 'railroad') {
            const rrRent = square.rent || [250, 500, 1000, 2000];
            
            // Adjust labels for railroads
            const rrLabels = [
                'ครองสถานี 1 แห่ง / 1 Station',
                'ครองสถานี 2 แห่ง / 2 Stations',
                'ครองสถานี 3 แห่ง / 3 Stations',
                'ครองสถานี 4 แห่ง / 4 Stations',
                '',
                ''
            ];

            for (let i = 0; i < 6; i++) {
                const el = document.getElementById(`hover-card-rent-${i}`);
                if (el) {
                    const labelSpan = el.parentElement.querySelector('span:first-child');
                    if (labelSpan) labelSpan.textContent = rrLabels[i] || '';
                    el.textContent = rrLabels[i] ? formatVal(rrRent[i]) : '';
                }
            }

            const buildCostRow = document.getElementById('hover-card-build-cost-row');
            if (buildCostRow) buildCostRow.style.display = 'none';
        } else if (square.type === 'utility') {
            const utilLabels = [
                'ครอง 1 แห่ง / 1 Utility',
                'แต้มเต๋า x 40 เท่า / 40x Dice',
                'ครอง 2 แห่ง / 2 Utilities',
                'แต้มเต๋า x 100 เท่า / 100x Dice',
                '',
                ''
            ];

            for (let i = 0; i < 6; i++) {
                const el = document.getElementById(`hover-card-rent-${i}`);
                if (el) {
                    const labelSpan = el.parentElement.querySelector('span:first-child');
                    if (labelSpan) labelSpan.textContent = utilLabels[i] || '';
                    el.textContent = ''; // utilities rent is based on dice multiplier text
                }
            }

            const buildCostRow = document.getElementById('hover-card-build-cost-row');
            if (buildCostRow) buildCostRow.style.display = 'none';
        } else {
            // Not a property type that should display a card
            return false;
        }

        // Mortgage value
        const mortgageRow = document.getElementById('hover-card-mortgage-row');
        const mortgage = document.getElementById('hover-card-mortgage');
        if (mortgageRow && mortgage) {
            if (square.mortgageValue) {
                mortgageRow.style.display = 'flex';
                mortgage.textContent = formatVal(square.mortgageValue);
            } else {
                mortgageRow.style.display = 'none';
            }
        }

        // Owner Info
        const ownerRow = document.getElementById('hover-card-owner-row');
        const ownerVal = document.getElementById('hover-card-owner');
        if (ownerRow && ownerVal) {
            if (ownerName) {
                ownerRow.style.display = 'flex';
                ownerVal.textContent = ownerName;
                ownerVal.style.color = ownerColor || 'var(--color-gold)';
            } else {
                ownerRow.style.display = 'none';
            }
        }

        // Mortgage Status
        const mortgageStatus = document.getElementById('hover-card-mortgage-status');
        if (mortgageStatus) {
            mortgageStatus.style.display = isMortgaged ? 'block' : 'none';
        }
        
        return true;
    }

    /**
     * Show card at x,y coordinate ensuring it doesn't clip boundaries.
     * @param {number} x - Client X coordinate
     * @param {number} y - Client Y coordinate
     */
    show(x, y) {
        if (!this.element) return;

        if (this.isTouchDevice) {
            this.element.classList.add('mobile-card');
            
            // Create a transparent gray backdrop if not already present
            if (!this.backdropElement) {
                this.backdropElement = document.createElement('div');
                this.backdropElement.className = 'property-card-backdrop';
                document.body.appendChild(this.backdropElement);
                this.backdropElement.addEventListener('touchstart', (e) => {
                    this.hide();
                }, { passive: true });
            }
            
            this.element.style.display = 'block';
            this.isCardVisible = true;
            return;
        }

        // Position and offset from cursor
        const offset = 15;
        let left = x + offset;
        let top = y + offset;

        // Bounds check (prevent clipping viewport)
        const cardWidth = this.element.offsetWidth || 250;
        const cardHeight = this.element.offsetHeight || 300;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (left + cardWidth > viewportWidth) {
            left = x - cardWidth - offset;
        }
        if (top + cardHeight > viewportHeight) {
            top = viewportHeight - cardHeight - offset;
        }
        if (left < 0) left = offset;
        if (top < 0) top = offset;

        this.element.style.left = `${left}px`;
        this.element.style.top = `${top}px`;
        this.element.style.display = 'block';
    }

    /**
     * Hide the card container.
     */
    hide() {
        if (this.element) {
            this.element.style.display = 'none';
            this.element.classList.remove('mobile-card');
        }
        if (this.backdropElement) {
            this.backdropElement.remove();
            this.backdropElement = null;
        }
        this.isCardVisible = false;
        this.currentCardPosition = null;
    }

    /**
     * Toggles visibility of the card for a specific position (used for touch devices).
     * @param {number} position
     */
    toggleCard(position) {
        if (this.isCardVisible && this.currentCardPosition === position) {
            this.hide();
        } else {
            this.currentCardPosition = position;
            this.show(0, 0);
        }
    }
}
