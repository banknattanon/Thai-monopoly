const PLAYER_COLORS = [
    { name: 'แดง / Red',     hex: '#EF4444', light: '#FCA5A5' },
    { name: 'น้ำเงิน / Blue', hex: '#3B82F6', light: '#93C5FD' },
    { name: 'เขียว / Green',  hex: '#22C55E', light: '#86EFAC' },
    { name: 'เหลือง / Yellow', hex: '#EAB308', light: '#FDE047' },
    { name: 'ม่วง / Purple',  hex: '#A855F7', light: '#D8B4FE' },
    { name: 'ส้ม / Orange',   hex: '#F97316', light: '#FDBA74' }
];

const AVATARS = [
    { id: 'cat',      emoji: '🐱', name: 'แมวเหมียว / Kitten' },
    { id: 'dog',      emoji: '🐶', name: 'หมาน้อย / Puppy' },
    { id: 'rabbit',   emoji: '🐰', name: 'กระต่าย / Bunny' },
    { id: 'duck',     emoji: '🐥', name: 'เป็ดน้อย / Duckling' },
    { id: 'milktea',  emoji: '🧋', name: 'ชานมไข่มุก / Milk Tea' },
    { id: 'dino',     emoji: '🦖', name: 'ไดโนน้อย / Baby Dino' }
];

class Player {
    constructor(id, name, avatar, colorIndex) {
        this.id = id;
        this.name = name;
        this.avatar = avatar;
        this.colorIndex = colorIndex;
        this.color = PLAYER_COLORS[colorIndex] || PLAYER_COLORS[0];
        this.position = 0;
        this.money = 15000;
        this.properties = [];
        this.houses = {};
        this.hotels = {};
        this.inJail = false;
        this.jailTurns = 0;
        this.getOutOfJailCards = 0;
        this.isBankrupt = false;
    }

    addMoney(amount) {
        if (amount > 0) {
            this.money += amount;
        }
    }

    removeMoney(amount) {
        if (amount > 0) {
            this.money -= amount;
        }
    }

    addProperty(position) {
        if (!this.properties.includes(position)) {
            this.properties.push(position);
            this.properties.sort((a, b) => a - b);
        }
    }

    removeProperty(position) {
        this.properties = this.properties.filter(p => p !== position);
        delete this.houses[position];
        delete this.hotels[position];
    }

    getNetWorth(squares) {
        let worth = this.money;
        for (const pos of this.properties) {
            const sq = squares[pos] || squares.find(s => s.position === pos);
            if (!sq) continue;
            
            // Add property purchase price
            worth += sq.price || 0;
            
            // Add house/hotel costs
            const houseCount = this.houses[pos] || 0;
            if (houseCount > 0 && sq.buildCost) {
                worth += houseCount * sq.buildCost;
            }
            
            if (this.hotels[pos] && sq.buildCost) {
                worth += 5 * sq.buildCost;
            }
        }
        return worth;
    }

    canAfford(amount) {
        return this.money >= amount;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            avatar: this.avatar,
            colorIndex: this.colorIndex,
            color: this.color,
            position: this.position,
            money: this.money,
            properties: this.properties,
            houses: this.houses,
            hotels: this.hotels,
            inJail: this.inJail,
            jailTurns: this.jailTurns,
            getOutOfJailCards: this.getOutOfJailCards,
            isBankrupt: this.isBankrupt
        };
    }
}

module.exports = {
    Player,
    PLAYER_COLORS,
    AVATARS
};
