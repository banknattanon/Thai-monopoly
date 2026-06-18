const Board = require('./Board');
const Cards = require('./Cards');

class GameEngine {
    constructor(players, settings) {
        this.settings = settings;
        this.board = Board.getSquares().map(sq => ({
            ...sq,
            isMortgaged: false
        }));
        this.chanceCards = Cards.createChanceDeck();
        this.communityCards = Cards.createCommunityDeck();

        this.shuffleDeck(this.chanceCards);
        this.shuffleDeck(this.communityCards);

        this.players = players.map(p => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            color: p.color,
            position: 0,
            money: settings.startMoney,
            properties: [],
            houses: {},    // { position: count }
            hotels: {},    // { position: true/false }
            inJail: false,
            jailTurns: 0,
            getOutOfJailCards: 0,
            isBankrupt: false
        }));

        this.currentPlayerIndex = 0;
        this.doublesCount = 0;
        this.settings = settings;
        this.propertyOwners = {};  // { position: playerId }
        this.freeParkingPot = 0;
        this.turnPhase = 'roll';   // 'roll' | 'action' | 'end'
        this.rolledDoublesExtraTurn = false;

        // Initialize structures
        this.houses = {};
        this.hotels = {};
    }

    endTurnPhase() {
        if (this.rolledDoublesExtraTurn) {
            this.turnPhase = 'roll';
            this.rolledDoublesExtraTurn = false;
        } else {
            this.turnPhase = 'end';
        }
    }

    shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    rollDice(selection = 'normal', customDice1 = null, customDice2 = null) {
        if (selection !== 'odd' && selection !== 'even') {
            selection = 'normal';
        }

        let dice1, dice2;
        if (customDice1 !== null && customDice2 !== null) {
            const sum = customDice1 + customDice2;
            if (selection === 'odd' && sum % 2 === 0) {
                throw new Error('Dice sum must be odd when selecting odd / ผลรวมลูกเต๋าต้องเป็นคี่เมื่อเลือกคี่');
            }
            if (selection === 'even' && sum % 2 !== 0) {
                throw new Error('Dice sum must be even when selecting even / ผลรวมลูกเต๋าต้องเป็นคู่เมื่อเลือกคู่');
            }
            dice1 = customDice1;
            dice2 = customDice2;
        } else {
            if (selection === 'odd') {
                do {
                    dice1 = Math.floor(Math.random() * 6) + 1;
                    dice2 = Math.floor(Math.random() * 6) + 1;
                } while ((dice1 + dice2) % 2 === 0);
            } else if (selection === 'even') {
                do {
                    dice1 = Math.floor(Math.random() * 6) + 1;
                    dice2 = Math.floor(Math.random() * 6) + 1;
                } while ((dice1 + dice2) % 2 !== 0);
            } else {
                dice1 = Math.floor(Math.random() * 6) + 1;
                dice2 = Math.floor(Math.random() * 6) + 1;
            }
        }

        const total = dice1 + dice2;
        const isDouble = (dice1 === dice2);

        const player = this.getCurrentPlayer();
        const oldPosition = player.position;

        const result = {
            dice1,
            dice2,
            total,
            isDouble,
            goToJail: false,
            oldPosition,
            newPosition: oldPosition,
            passedGo: false,
            landingEffect: null
        };

        if (isDouble) {
            this.doublesCount++;
            if (this.doublesCount === 3) {
                this.sendToJail(player.id);
                result.goToJail = true;
                result.newPosition = 10;
                this.doublesCount = 0;
                this.rolledDoublesExtraTurn = false;
                this.turnPhase = 'end';
                return result;
            } else {
                this.rolledDoublesExtraTurn = true;
            }
        } else {
            this.doublesCount = 0;
            this.rolledDoublesExtraTurn = false;
        }

        const moveResult = this.movePlayer(player.id, total);
        result.newPosition = moveResult.newPosition;
        result.passedGo = moveResult.passedGo;

        result.landingEffect = this.resolveLanding(player.id, total);

        // Check if landing effect triggers an action phase
        let hasActionOption = false;
        if (result.landingEffect) {
            const type = result.landingEffect.type;
            if (type === 'buy-option' || type === 'rent-and-takeover' || type === 'build-option') {
                hasActionOption = true;
            }
        }
        if (result.landingEffect && result.landingEffect.type === 'card' && result.landingEffect.cardResults) {
            const hasNestedAction = result.landingEffect.cardResults.some(r => r.type === 'landing' && r.detail && ['buy-option', 'rent-and-takeover', 'build-option'].includes(r.detail.type));
            if (hasNestedAction) {
                hasActionOption = true;
            }
        }

        if (hasActionOption) {
            this.turnPhase = 'action';
        } else {
            if (player.inJail) {
                this.turnPhase = 'end';
                this.rolledDoublesExtraTurn = false;
            } else {
                this.endTurnPhase();
            }
        }

        return result;
    }

    movePlayer(playerId, steps) {
        const player = this.players.find(p => p.id === playerId);
        const oldPosition = player.position;
        const newPosition = (oldPosition + steps) % 40;
        let passedGo = false;

        if (steps > 0 && newPosition < oldPosition) {
            passedGo = true;
            player.money += this.settings.goBonus;
        }

        player.position = newPosition;
        return { oldPosition, newPosition, passedGo };
    }

    resolveLanding(playerId, diceTotal) {
        const player = this.players.find(p => p.id === playerId);
        const position = player.position;
        const square = this.board[position];

        if (square.type === 'property' || square.type === 'railroad' || square.type === 'utility') {
            const ownerId = this.propertyOwners[position];
            if (ownerId) {
                if (ownerId !== playerId) {
                    const owner = this.players.find(p => p.id === ownerId);
                    if (!owner.inJail && !square.isMortgaged) {
                        const rent = this.calculateRent(position, diceTotal);
                        this.payRent(playerId, ownerId, rent);
                        
                        // Check for takeover (2x property + building cost)
                        let takeoverValue = square.price;
                        if (square.type === 'property') {
                            const houses = this.houses[position] || 0;
                            const hotels = this.hotels[position] ? 1 : 0;
                            takeoverValue += (houses * square.buildCost) + (hotels * 5 * square.buildCost);
                        }
                        const takeoverCost = takeoverValue * 2; // 2x cost to takeover
                        
                        if (player.money >= takeoverCost) {
                            return { type: 'rent-and-takeover', ownerId, amount: rent, property: square, takeoverCost };
                        }
                        return { type: 'rent', ownerId, amount: rent };
                    }
                } else {
                    if (this.canBuildHouse(playerId, position) || this.canBuildHotel(playerId, position)) {
                        return { type: 'build-option', property: square };
                    }
                    return { type: 'nothing' };
                }
                return { type: 'nothing' };
            } else {
                return { type: 'buy-option', property: square };
            }
        }

        if (square.type === 'tax') {
            const taxAmount = (position === 4) ? 2000 : 1000;
            player.money -= taxAmount;
            if (this.settings.freeParkingRule) {
                this.freeParkingPot += taxAmount;
            }
            return { type: 'tax', amount: taxAmount, taxName: square.nameEn };
        }

        if (square.type === 'go-to-jail') {
            this.sendToJail(playerId);
            return { type: 'go-to-jail' };
        }

        if (square.type === 'free-parking') {
            if (this.settings.freeParkingRule && this.freeParkingPot > 0) {
                const collected = this.freeParkingPot;
                player.money += collected;
                this.freeParkingPot = 0;
                return { type: 'free-parking', collected };
            }
            return { type: 'nothing' };
        }

        if (square.type === 'chance') {
            const card = this.drawChanceCard();
            const cardResults = this.executeCardEffect(playerId, card);
            return { type: 'card', cardType: 'chance', card, cardResults };
        }

        if (square.type === 'community') {
            const card = this.drawCommunityCard();
            const cardResults = this.executeCardEffect(playerId, card);
            return { type: 'card', cardType: 'community', card, cardResults };
        }

        return { type: 'nothing' };
    }

    calculateRent(position, diceTotal) {
        const square = this.board[position];
        const ownerId = this.propertyOwners[position];
        if (!ownerId || square.isMortgaged) return 0;

        if (square.type === 'property') {
            if (this.hotels[position]) {
                return square.rent[5];
            }
            const houseCount = this.houses[position] || 0;
            if (houseCount > 0) {
                return square.rent[houseCount];
            }
            const group = Board.COLOR_GROUPS[square.colorGroup];
            const ownsAll = group.every(pos => this.propertyOwners[pos] === ownerId);
            return ownsAll ? square.rent[0] * 2 : square.rent[0];
        }

        if (square.type === 'railroad') {
            const railroads = [5, 15, 25, 35];
            let count = 0;
            railroads.forEach(pos => {
                if (this.propertyOwners[pos] === ownerId) count++;
            });
            return [250, 500, 1000, 2000][count - 1] || 250;
        }

        if (square.type === 'utility') {
            const utilities = [12, 28];
            let count = 0;
            utilities.forEach(pos => {
                if (this.propertyOwners[pos] === ownerId) count++;
            });
            const multiplier = count === 2 ? 100 : 40;
            return diceTotal * multiplier;
        }

        return 0;
    }

    payRent(payerId, ownerId, amount) {
        const payer = this.players.find(p => p.id === payerId);
        const owner = this.players.find(p => p.id === ownerId);
        payer.money -= amount;
        owner.money += amount;
        return { success: true, payerMoney: payer.money, ownerMoney: owner.money };
    }

    canBuyProperty(playerId, position) {
        const player = this.players.find(p => p.id === playerId);
        const square = this.board[position];
        const isOwned = !!this.propertyOwners[position];
        const isBuyable = (square.type === 'property' || square.type === 'railroad' || square.type === 'utility');
        return !isOwned && isBuyable && player.money >= square.price && !player.isBankrupt;
    }

    buyProperty(playerId, position) {
        const player = this.players.find(p => p.id === playerId);
        const square = this.board[position];
        if (this.canBuyProperty(playerId, position)) {
            player.money -= square.price;
            this.propertyOwners[position] = playerId;
            player.properties.push(position);
            
            if (this.canBuildHouse(playerId, position) || this.canBuildHotel(playerId, position)) {
                this.turnPhase = 'action';
                return { success: true, cost: square.price, promptBuild: true };
            }
            this.endTurnPhase();
            return { success: true, cost: square.price, promptBuild: false };
        }
        return { success: false };
    }

    takeoverProperty(playerId, position, cost) {
        const player = this.players.find(p => p.id === playerId);
        const oldOwnerId = this.propertyOwners[position];
        const oldOwner = this.players.find(p => p.id === oldOwnerId);
        
        if (player && oldOwner && player.money >= cost) {
            player.money -= cost;
            oldOwner.money += cost;
            
            // Transfer ownership
            this.propertyOwners[position] = playerId;
            oldOwner.properties = oldOwner.properties.filter(pos => pos !== position);
            player.properties.push(position);
            
            if (this.canBuildHouse(playerId, position) || this.canBuildHotel(playerId, position)) {
                this.turnPhase = 'action';
                return { success: true, promptBuild: true };
            }
            this.endTurnPhase();
            return { success: true, promptBuild: false };
        }
        return { success: false };
    }

    declineTakeover(playerId) {
        this.endTurnPhase();
        return { success: true };
    }

    canBuildHouse(playerId, position) {
        const player = this.players.find(p => p.id === playerId);
        const square = this.board[position];
        if (!player || player.isBankrupt || !square || square.type !== 'property') return false;
        if (this.propertyOwners[position] !== playerId) return false;

        if (this.board[position].isMortgaged) return false;

        const currentHouses = this.houses[position] || 0;
        if (currentHouses >= 3 || this.hotels[position]) return false;

        return player.money >= square.buildCost;
    }

    buildHouse(playerId, position) {
        if (!this.canBuildHouse(playerId, position)) {
            return { success: false, message: 'Cannot build house / ไม่สามารถสร้างบ้านได้' };
        }
        const player = this.players.find(p => p.id === playerId);
        const square = this.board[position];
        player.money -= square.buildCost;
        this.houses[position] = (this.houses[position] || 0) + 1;
        this.endTurnPhase();
        return { success: true, cost: square.buildCost, totalHouses: this.houses[position] };
    }

    canBuildHotel(playerId, position) {
        const player = this.players.find(p => p.id === playerId);
        const square = this.board[position];
        if (!player || player.isBankrupt || !square || square.type !== 'property') return false;
        if (this.propertyOwners[position] !== playerId) return false;

        if (this.board[position].isMortgaged) return false;

        if ((this.houses[position] || 0) !== 3 || this.hotels[position]) return false;

        return player.money >= square.buildCost;
    }

    buildHotel(playerId, position) {
        if (!this.canBuildHotel(playerId, position)) {
            return { success: false, message: 'Cannot build hotel / ไม่สามารถสร้างโรงแรมได้' };
        }
        const player = this.players.find(p => p.id === playerId);
        const square = this.board[position];
        player.money -= square.buildCost;
        this.houses[position] = 0;
        this.hotels[position] = true;
        this.endTurnPhase();
        return { success: true, cost: square.buildCost };
    }

    mortgageProperty(playerId, position) {
        const player = this.players.find(p => p.id === playerId);
        const square = this.board[position];
        if (!player || player.isBankrupt || !square) {
            return { success: false, message: 'Invalid player or property' };
        }
        if (this.propertyOwners[position] !== playerId) {
            return { success: false, message: 'You do not own this property / คุณไม่ได้เป็นเจ้าของที่ดินนี้' };
        }
        if (square.isMortgaged) {
            return { success: false, message: 'Already mortgaged / ที่ดินติดจำนองอยู่แล้ว' };
        }

        if (square.type === 'property') {
            const group = Board.COLOR_GROUPS[square.colorGroup];
            const hasBuildings = group.some(pos => (this.houses[pos] || 0) > 0 || this.hotels[pos]);
            if (hasBuildings) {
                return { success: false, message: 'Must sell all buildings in the color group first / ต้องขายสิ่งปลูกสร้างในกลุ่มสีนี้ทั้งหมดก่อน' };
            }
        }

        square.isMortgaged = true;
        player.money += square.mortgageValue;
        return { success: true, income: square.mortgageValue };
    }

    unmortgageProperty(playerId, position) {
        const player = this.players.find(p => p.id === playerId);
        const square = this.board[position];
        if (!player || player.isBankrupt || !square) {
            return { success: false, message: 'Invalid player or property' };
        }
        if (this.propertyOwners[position] !== playerId) {
            return { success: false, message: 'You do not own this property / คุณไม่ได้เป็นเจ้าของที่ดินนี้' };
        }
        if (!square.isMortgaged) {
            return { success: false, message: 'Property is not mortgaged / ที่ดินไม่ได้ติดจำนอง' };
        }
        const cost = Math.ceil(square.mortgageValue * 1.1);
        if (player.money < cost) {
            return { success: false, message: 'Insufficient funds to unmortgage / เงินไม่เพียงพอสำหรับถอนจำนอง' };
        }

        square.isMortgaged = false;
        player.money -= cost;
        return { success: true, cost };
    }

    sendToJail(playerId) {
        const player = this.players.find(p => p.id === playerId);
        player.position = 10;
        player.inJail = true;
        player.jailTurns = 0;
        this.doublesCount = 0;
        this.turnPhase = 'end';
    }

    attemptJailRoll(playerId) {
        const player = this.players.find(p => p.id === playerId);
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const total = dice1 + dice2;
        const isDouble = (dice1 === dice2);

        player.jailTurns++;

        const result = {
            success: false,
            forcedPay: false,
            dice1,
            dice2,
            isDouble,
            oldPosition: 10,
            newPosition: 10,
            passedGo: false,
            landingEffect: null
        };

        if (isDouble) {
            player.inJail = false;
            player.jailTurns = 0;
            const moveResult = this.movePlayer(playerId, total);
            result.success = true;
            result.newPosition = moveResult.newPosition;
            result.passedGo = moveResult.passedGo;
            result.landingEffect = this.resolveLanding(playerId, total);
            let hasActionOption = false;
            if (result.landingEffect) {
                const type = result.landingEffect.type;
                if (type === 'buy-option' || type === 'rent-and-takeover' || type === 'build-option') {
                    hasActionOption = true;
                }
            }
            this.turnPhase = hasActionOption ? 'action' : 'end';
        } else {
            if (player.jailTurns >= 3) {
                player.money -= 500;
                player.inJail = false;
                player.jailTurns = 0;
                const moveResult = this.movePlayer(playerId, total);
                result.success = false;
                result.forcedPay = true;
                result.newPosition = moveResult.newPosition;
                result.passedGo = moveResult.passedGo;
                result.landingEffect = this.resolveLanding(playerId, total);
                let hasActionOption = false;
                if (result.landingEffect) {
                    const type = result.landingEffect.type;
                    if (type === 'buy-option' || type === 'rent-and-takeover' || type === 'build-option') {
                        hasActionOption = true;
                    }
                }
                if (hasActionOption) {
                    this.turnPhase = 'action';
                } else {
                    this.endTurnPhase();
                }
            } else {
                this.endTurnPhase();
            }
        }
        return result;
    }

    payJailFine(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (player.money >= 500) {
            player.money -= 500;
            player.inJail = false;
            player.jailTurns = 0;
            this.turnPhase = 'roll';
            return { success: true };
        }
        return { success: false };
    }

    useGetOutOfJailCard(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (player.getOutOfJailCards > 0) {
            player.getOutOfJailCards--;
            player.inJail = false;
            player.jailTurns = 0;
            this.turnPhase = 'roll';
            return { success: true };
        }
        return { success: false };
    }

    drawChanceCard() {
        const card = this.chanceCards.shift();
        this.chanceCards.push(card);
        return card;
    }

    drawCommunityCard() {
        const card = this.communityCards.shift();
        this.communityCards.push(card);
        return card;
    }

    executeCardEffect(playerId, card) {
        const player = this.players.find(p => p.id === playerId);
        const results = [];
        const effect = card.effect;

        if (effect.action === 'move-to') {
            const oldPos = player.position;
            const dest = effect.destination;
            let passedGo = false;
            
            if (effect.collectGo && dest < oldPos) {
                passedGo = true;
                player.money += this.settings.goBonus;
            }
            player.position = dest;
            results.push({ type: 'move', playerId, from: oldPos, to: dest, passedGo });

            const subLanding = this.resolveLanding(playerId, 0);
            if (subLanding) {
                results.push({ type: 'landing', detail: subLanding });
            }
        } else if (effect.action === 'move-back') {
            const oldPos = player.position;
            const steps = effect.steps || effect.amount || 0;
            const dest = (oldPos - steps + 40) % 40;
            player.position = dest;
            results.push({ type: 'move', playerId, from: oldPos, to: dest, passedGo: false });

            const subLanding = this.resolveLanding(playerId, 0);
            if (subLanding) {
                results.push({ type: 'landing', detail: subLanding });
            }
        } else if (effect.action === 'receive') {
            player.money += effect.amount;
            results.push({ type: 'money', playerId, amount: effect.amount });
        } else if (effect.action === 'pay') {
            player.money -= effect.amount;
            if (this.settings.freeParkingRule) {
                this.freeParkingPot += effect.amount;
            }
            results.push({ type: 'money', playerId, amount: -effect.amount });
        } else if (effect.action === 'pay-all') {
            const count = this.players.filter(p => !p.isBankrupt && p.id !== playerId).length;
            const total = count * effect.amount;
            player.money -= total;
            results.push({ type: 'money', playerId, amount: -total });

            this.players.forEach(p => {
                if (!p.isBankrupt && p.id !== playerId) {
                    p.money += effect.amount;
                    results.push({ type: 'money', playerId: p.id, amount: effect.amount });
                }
            });
        } else if (effect.action === 'collect-all') {
            const activeOthers = this.players.filter(p => !p.isBankrupt && p.id !== playerId);
            activeOthers.forEach(p => {
                p.money -= effect.amount;
                results.push({ type: 'money', playerId: p.id, amount: -effect.amount });
                player.money += effect.amount;
            });
            results.push({ type: 'money', playerId, amount: activeOthers.length * effect.amount });
        } else if (effect.action === 'get-out-jail') {
            player.getOutOfJailCards++;
        } else if (effect.action === 'go-to-jail') {
            this.sendToJail(playerId);
            results.push({ type: 'jail', playerId });
        } else if (effect.action === 'repair') {
            let repairCost = 0;
            player.properties.forEach(pos => {
                if (this.hotels[pos]) {
                    repairCost += effect.hotel;
                } else {
                    repairCost += (this.houses[pos] || 0) * effect.house;
                }
            });
            player.money -= repairCost;
            if (this.settings.freeParkingRule) {
                this.freeParkingPot += repairCost;
            }
            results.push({ type: 'money', playerId, amount: -repairCost });
        }

        return results;
    }

    checkBankruptcy(playerId) {
        const netWorth = this.getPlayerNetWorth(playerId);
        return netWorth >= 0;
    }

    getPlayerNetWorth(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return 0;
        let worth = player.money;

        player.properties.forEach(pos => {
            const sq = this.board[pos];
            if (!sq.isMortgaged) {
                worth += sq.mortgageValue || 0;
            }
            const houses = this.houses[pos] || 0;
            const hasHotel = this.hotels[pos];
            if (hasHotel) {
                worth += (sq.buildCost * 5) / 2;
            } else if (houses > 0) {
                worth += (sq.buildCost * houses) / 2;
            }
        });

        return worth;
    }

    declareBankruptcy(playerId, creditorId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        player.isBankrupt = true;

        if (creditorId) {
            const creditor = this.players.find(p => p.id === creditorId);

            player.properties.forEach(pos => {
                const sq = this.board[pos];
                const houses = this.houses[pos] || 0;
                const hasHotel = this.hotels[pos];
                let refund = 0;
                if (hasHotel) {
                    refund = (sq.buildCost * 5) / 2;
                    this.hotels[pos] = false;
                } else if (houses > 0) {
                    refund = (sq.buildCost * houses) / 2;
                    this.houses[pos] = 0;
                }
                player.money += refund;
            });

            creditor.money += player.money;
            player.money = 0;

            player.properties.forEach(pos => {
                this.propertyOwners[pos] = creditorId;
                creditor.properties.push(pos);
            });
        } else {
            player.properties.forEach(pos => {
                const sq = this.board[pos];
                const houses = this.houses[pos] || 0;
                const hasHotel = this.hotels[pos];
                if (hasHotel) {
                    this.hotels[pos] = false;
                } else if (houses > 0) {
                    this.houses[pos] = 0;
                }
                delete this.propertyOwners[pos];
                sq.isMortgaged = false;
            });
            player.money = 0;
        }

        player.properties = [];
        player.getOutOfJailCards = 0;
    }

    checkGameOver() {
        const activePlayers = this.players.filter(p => !p.isBankrupt);
        if (activePlayers.length <= 1) {
            return { isOver: true, winnerId: activePlayers[0] ? activePlayers[0].id : null, reason: 'bankrupt' };
        }

        // Color groups mapping
        const colorGroups = {
            'brown': [1, 3],
            'light-blue': [6, 8, 9],
            'pink': [11, 13, 14],
            'orange': [16, 18, 19],
            'red': [21, 23, 24],
            'yellow': [26, 27, 29],
            'green': [31, 32, 34],
            'dark-blue': [37, 39]
        };

        const tourismStations = [5, 15, 25, 35]; // Railroads
        
        // Lines
        const lines = [
            [1, 2, 3, 4, 5, 6, 7, 8, 9],
            [11, 12, 13, 14, 15, 16, 17, 18, 19],
            [21, 22, 23, 24, 25, 26, 27, 28, 29],
            [31, 32, 33, 34, 35, 36, 37, 38, 39]
        ];

        // Filter lines to only include buyable properties
        const buyableLines = lines.map(line => line.filter(pos => {
            const sq = this.board[pos];
            return sq && (sq.type === 'property' || sq.type === 'railroad' || sq.type === 'utility');
        }));

        for (const player of activePlayers) {
            const props = player.properties;
            
            // 1. Tourism Victory (all 4 stations)
            const hasAllTourism = tourismStations.every(pos => props.includes(pos));
            if (hasAllTourism) {
                return { isOver: true, winnerId: player.id, reason: 'tourism_victory' };
            }

            // 2. Triple Victory (3 color groups)
            let completedGroups = 0;
            for (const color in colorGroups) {
                const group = colorGroups[color];
                if (group.every(pos => props.includes(pos))) {
                    completedGroups++;
                }
            }
            if (completedGroups >= 3) {
                return { isOver: true, winnerId: player.id, reason: 'triple_victory' };
            }

            // 3. Line Victory (all buyable properties on one side)
            for (const line of buyableLines) {
                if (line.length > 0 && line.every(pos => props.includes(pos))) {
                    return { isOver: true, winnerId: player.id, reason: 'line_victory' };
                }
            }
        }

        return { isOver: false };
    }

    getStats() {
        return this.players.map(p => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            color: p.color,
            isBankrupt: p.isBankrupt,
            money: p.money,
            propertiesCount: p.properties.length,
            netWorth: this.getPlayerNetWorth(p.id)
        }));
    }


    endTurn() {
        let index = this.currentPlayerIndex;
        do {
            index = (index + 1) % this.players.length;
        } while (this.players[index].isBankrupt && index !== this.currentPlayerIndex);

        this.currentPlayerIndex = index;
        this.doublesCount = 0;
        this.turnPhase = 'roll';
        return this.players[this.currentPlayerIndex].id;
    }

    getFullState() {
        return {
            players: this.players,
            settings: this.settings,
            currentPlayerIndex: this.currentPlayerIndex,
            currentPlayerId: this.getCurrentPlayer().id,
            doublesCount: this.doublesCount,
            turnPhase: this.turnPhase,
            propertyOwners: this.propertyOwners,
            freeParkingPot: this.freeParkingPot,
            currentTakeoverCost: this.currentTakeoverCost,
            board: this.board.map((sq, idx) => ({
                ...sq,
                isMortgaged: !!sq.isMortgaged,
                houses: this.houses[idx] || 0,
                hotel: !!this.hotels[idx]
            }))
        };
    }

    getPublicState() {
        return {
            ...this.getFullState(),
            chanceCardsCount: this.chanceCards.length,
            communityCardsCount: this.communityCards.length
        };
    }
}

module.exports = GameEngine;
