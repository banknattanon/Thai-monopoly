// Client-side Helper Functions

import { BOARD_LAYOUT } from './constants.js';

/**
 * Formats a number as Thai Baht currency, e.g. ฿15,000
 * @param {number} amount
 * @returns {string}
 */
export function formatMoney(amount) {
    if (amount === undefined || amount === null) return '฿0';
    return `฿${Number(amount).toLocaleString('th-TH')}`;
}

/**
 * Formats money change with + or - sign, e.g. +฿2,000 or -฿500
 * @param {number} amount
 * @returns {string}
 */
export function formatMoneyChange(amount) {
    if (amount > 0) {
        return `+฿${amount.toLocaleString('th-TH')}`;
    } else if (amount < 0) {
        return `-฿${Math.abs(amount).toLocaleString('th-TH')}`;
    }
    return '฿0';
}

/**
 * Calculates the center pixel coordinate and rotation of a board square.
 * Coordinates are relative to the board's top-left corner (0,0) with size 800x800.
 * @param {number} position - Square position (0 - 39)
 * @returns {{x: number, y: number, rotation: number, width: number, height: number}}
 */
export function getSquareCoords(position) {
    const size = BOARD_LAYOUT.BOARD_SIZE;
    const corner = BOARD_LAYOUT.CORNER_SIZE;
    const sideCount = BOARD_LAYOUT.SQUARES_PER_SIDE;
    const sideSpan = size - 2 * corner;
    const step = sideSpan / sideCount;

    // Default return
    let x = 0;
    let y = 0;
    let rotation = 0;
    let width = 0;
    let height = 0;

    if (position === 0) {
        // GO (Bottom-right)
        x = size - corner / 2;
        y = size - corner / 2;
        rotation = 0;
        width = corner;
        height = corner;
    } else if (position === 10) {
        // Jail (Bottom-left)
        x = corner / 2;
        y = size - corner / 2;
        rotation = 0;
        width = corner;
        height = corner;
    } else if (position === 20) {
        // Free Parking (Top-left)
        x = corner / 2;
        y = corner / 2;
        rotation = 0;
        width = corner;
        height = corner;
    } else if (position === 30) {
        // Go to Jail (Top-right)
        x = size - corner / 2;
        y = corner / 2;
        rotation = 0;
        width = corner;
        height = corner;
    } else if (position > 0 && position < 10) {
        // Bottom side (Right to Left)
        const index = position;
        x = size - corner - (index - 0.5) * step;
        y = size - corner / 2;
        rotation = 0;
        width = step;
        height = corner;
    } else if (position > 10 && position < 20) {
        // Left side (Bottom to Top)
        const index = position - 10;
        x = corner / 2;
        y = size - corner - (index - 0.5) * step;
        rotation = 90;
        width = step;
        height = corner;
    } else if (position > 20 && position < 30) {
        // Top side (Left to Right)
        const index = position - 20;
        x = corner + (index - 0.5) * step;
        y = corner / 2;
        rotation = 180;
        width = step;
        height = corner;
    } else if (position > 30 && position < 40) {
        // Right side (Top to Bottom)
        const index = position - 30;
        x = size - corner / 2;
        y = corner + (index - 0.5) * step;
        rotation = 270;
        width = step;
        height = corner;
    }

    return { x, y, rotation, width, height };
}

/**
 * Shuffles a copy of an array using Fisher-Yates algorithm
 * @param {Array} arr
 * @returns {Array}
 */
export function shuffleArray(arr) {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

/**
 * Generates a random short ID
 * @returns {string}
 */
export function generateId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}
