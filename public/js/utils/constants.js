// Constants for Thai Monopoly Client

export const BOARD_LAYOUT = {
    BOARD_SIZE: 800,           // logical pixels
    CORNER_SIZE: 110,          // corner square size (adjusted slightly for better rendering of corners)
    SQUARE_WIDTH: 60,          // side square width (800 - 2*110 = 580, divided by 9 side tiles is ~64.44 pixels, let's make it automatic or exact. Wait, (800 - 2 * 110) / 9 = 64.44. Let's use coordinates calculated programmatically based on the board size and corner size, but define these as reference sizes.)
    SQUARE_HEIGHT: 110,        // side square height (equal to corner size for alignment)
    SQUARES_PER_SIDE: 9
};

export const COLOR_GROUPS = {
    brown:     [1, 3],
    lightblue: [6, 8, 9],
    pink:      [11, 13, 14],
    orange:    [16, 18, 19],
    red:       [21, 23, 24],
    yellow:    [26, 27, 29],
    green:     [31, 32, 34],
    darkblue:  [37, 39]
};

export const PLAYER_COLORS = [
    { name: 'แดง / Red',     hex: '#EF4444', light: '#FCA5A5' },
    { name: 'น้ำเงิน / Blue', hex: '#3B82F6', light: '#93C5FD' },
    { name: 'เขียว / Green',  hex: '#22C55E', light: '#86EFAC' },
    { name: 'เหลือง / Yellow', hex: '#EAB308', light: '#FDE047' },
    { name: 'ม่วง / Purple',  hex: '#A855F7', light: '#D8B4FE' },
    { name: 'ส้ม / Orange',   hex: '#F97316', light: '#FDBA74' }
];

export const AVATARS = [
    { id: 'cat',      emoji: '🐱', name: 'แมวเหมียว / Kitten' },
    { id: 'dog',      emoji: '🐶', name: 'หมาน้อย / Puppy' },
    { id: 'rabbit',   emoji: '🐰', name: 'กระต่าย / Bunny' },
    { id: 'duck',     emoji: '🐥', name: 'เป็ดน้อย / Duckling' },
    { id: 'milktea',  emoji: '🧋', name: 'ชานมไข่มุก / Milk Tea' },
    { id: 'dino',     emoji: '🦖', name: 'ไดโนน้อย / Baby Dino' }
];

export const BOARD_SQUARES = [
    {
        position: 0,
        type: 'go',
        name: 'จุดเริ่มต้น',
        nameEn: 'GO'
    },
    {
        position: 1,
        type: 'property',
        name: 'คลองสาน',
        nameEn: 'Khlong San',
        colorGroup: 'brown',
        color: '#8B4513',
        price: 600,
        buildCost: 500,
        rent: [20, 100, 300, 900, 1600, 2500],
        mortgageValue: 300
    },
    {
        position: 2,
        type: 'community',
        name: 'เปิดหีบสมบัติ',
        nameEn: 'Community Chest'
    },
    {
        position: 3,
        type: 'property',
        name: 'บางลำพู',
        nameEn: 'Banglamphu',
        colorGroup: 'brown',
        color: '#8B4513',
        price: 600,
        buildCost: 500,
        rent: [40, 200, 600, 1800, 3200, 4500],
        mortgageValue: 300
    },
    {
        position: 4,
        type: 'tax',
        name: 'ภาษีรายได้',
        nameEn: 'Income Tax',
        cost: 2000
    },
    {
        position: 5,
        type: 'railroad',
        name: 'สถานีหัวลำโพง',
        nameEn: 'Hua Lamphong',
        price: 2000,
        rent: [250, 500, 1000, 2000],
        mortgageValue: 1000
    },
    {
        position: 6,
        type: 'property',
        name: 'เยาวราช',
        nameEn: 'Yaowarat',
        colorGroup: 'lightblue',
        color: '#87CEEB',
        price: 1000,
        buildCost: 500,
        rent: [60, 300, 900, 2700, 4000, 5500],
        mortgageValue: 500
    },
    {
        position: 7,
        type: 'chance',
        name: 'โชคชะตา',
        nameEn: 'Chance'
    },
    {
        position: 8,
        type: 'property',
        name: 'สำเพ็ง',
        nameEn: 'Sampheng',
        colorGroup: 'lightblue',
        color: '#87CEEB',
        price: 1000,
        buildCost: 500,
        rent: [60, 300, 900, 2700, 4000, 5500],
        mortgageValue: 500
    },
    {
        position: 9,
        type: 'property',
        name: 'เจริญกรุง',
        nameEn: 'Charoen Krung',
        colorGroup: 'lightblue',
        color: '#87CEEB',
        price: 1200,
        buildCost: 500,
        rent: [80, 400, 1000, 3000, 4500, 6000],
        mortgageValue: 600
    },
    {
        position: 10,
        type: 'jail',
        name: 'คุก',
        nameEn: 'Jail'
    },
    {
        position: 11,
        type: 'property',
        name: 'พัทยา',
        nameEn: 'Pattaya',
        colorGroup: 'pink',
        color: '#FF69B4',
        price: 1400,
        buildCost: 1000,
        rent: [100, 500, 1500, 4500, 6250, 7500],
        mortgageValue: 700
    },
    {
        position: 12,
        type: 'utility',
        name: 'การไฟฟ้า',
        nameEn: 'Electric Co.',
        icon: '⚡',
        price: 1500,
        multiplier: [40, 100],
        mortgageValue: 750
    },
    {
        position: 13,
        type: 'property',
        name: 'หัวหิน',
        nameEn: 'Hua Hin',
        colorGroup: 'pink',
        color: '#FF69B4',
        price: 1400,
        buildCost: 1000,
        rent: [100, 500, 1500, 4500, 6250, 7500],
        mortgageValue: 700
    },
    {
        position: 14,
        type: 'property',
        name: 'เขาใหญ่',
        nameEn: 'Khao Yai',
        colorGroup: 'pink',
        color: '#FF69B4',
        price: 1600,
        buildCost: 1000,
        rent: [120, 600, 1800, 5000, 7000, 9000],
        mortgageValue: 800
    },
    {
        position: 15,
        type: 'railroad',
        name: 'สถานีบางซื่อ',
        nameEn: 'Bang Sue',
        price: 2000,
        rent: [250, 500, 1000, 2000],
        mortgageValue: 1000
    },
    {
        position: 16,
        type: 'property',
        name: 'เชียงใหม่',
        nameEn: 'Chiang Mai',
        colorGroup: 'orange',
        color: '#FF8C00',
        price: 1800,
        buildCost: 1000,
        rent: [140, 700, 2000, 5500, 7500, 9500],
        mortgageValue: 900
    },
    {
        position: 17,
        type: 'community',
        name: 'เปิดหีบสมบัติ',
        nameEn: 'Community Chest'
    },
    {
        position: 18,
        type: 'property',
        name: 'เชียงราย',
        nameEn: 'Chiang Rai',
        colorGroup: 'orange',
        color: '#FF8C00',
        price: 1800,
        buildCost: 1000,
        rent: [140, 700, 2000, 5500, 7500, 9500],
        mortgageValue: 900
    },
    {
        position: 19,
        type: 'property',
        name: 'ปาย',
        nameEn: 'Pai',
        colorGroup: 'orange',
        color: '#FF8C00',
        price: 2000,
        buildCost: 1000,
        rent: [160, 800, 2200, 6000, 8000, 10000],
        mortgageValue: 1000
    },
    {
        position: 20,
        type: 'free-parking',
        name: 'จอดรถฟรี',
        nameEn: 'Free Parking'
    },
    {
        position: 21,
        type: 'property',
        name: 'สยามพารากอน',
        nameEn: 'Siam Paragon',
        colorGroup: 'red',
        color: '#DC143C',
        price: 2200,
        buildCost: 1500,
        rent: [180, 900, 2500, 7000, 8750, 10500],
        mortgageValue: 1100
    },
    {
        position: 22,
        type: 'chance',
        name: 'โชคชะตา',
        nameEn: 'Chance'
    },
    {
        position: 23,
        type: 'property',
        name: 'สีลม',
        nameEn: 'Silom',
        colorGroup: 'red',
        color: '#DC143C',
        price: 2200,
        buildCost: 1500,
        rent: [180, 900, 2500, 7000, 8750, 10500],
        mortgageValue: 1100
    },
    {
        position: 24,
        type: 'property',
        name: 'สุขุมวิท',
        nameEn: 'Sukhumvit',
        colorGroup: 'red',
        color: '#DC143C',
        price: 2400,
        buildCost: 1500,
        rent: [200, 1000, 3000, 7500, 9250, 11000],
        mortgageValue: 1200
    },
    {
        position: 25,
        type: 'railroad',
        name: 'สถานี MRT',
        nameEn: 'MRT Station',
        price: 2000,
        rent: [250, 500, 1000, 2000],
        mortgageValue: 1000
    },
    {
        position: 26,
        type: 'property',
        name: 'ภูเก็ต',
        nameEn: 'Phuket',
        colorGroup: 'yellow',
        color: '#FFD700',
        price: 2600,
        buildCost: 1500,
        rent: [220, 1100, 3300, 8000, 9750, 11500],
        mortgageValue: 1300
    },
    {
        position: 27,
        type: 'property',
        name: 'กระบี่',
        nameEn: 'Krabi',
        colorGroup: 'yellow',
        color: '#FFD700',
        price: 2600,
        buildCost: 1500,
        rent: [220, 1100, 3300, 8000, 9750, 11500],
        mortgageValue: 1300
    },
    {
        position: 28,
        type: 'utility',
        name: 'การประปา',
        nameEn: 'Water Works',
        icon: '💧',
        price: 1500,
        multiplier: [40, 100],
        mortgageValue: 750
    },
    {
        position: 29,
        type: 'property',
        name: 'เกาะสมุย',
        nameEn: 'Koh Samui',
        colorGroup: 'yellow',
        color: '#FFD700',
        price: 2800,
        buildCost: 1500,
        rent: [240, 1200, 3600, 8500, 10250, 12000],
        mortgageValue: 1400
    },
    {
        position: 30,
        type: 'go-to-jail',
        name: 'ไปคุก!',
        nameEn: 'Go to Jail!'
    },
    {
        position: 31,
        type: 'property',
        name: 'ไอคอนสยาม',
        nameEn: 'ICONSIAM',
        colorGroup: 'green',
        color: '#2E8B57',
        price: 3000,
        buildCost: 2000,
        rent: [260, 1300, 3900, 9000, 11000, 12750],
        mortgageValue: 1500
    },
    {
        position: 32,
        type: 'property',
        name: 'วัดพระแก้ว',
        nameEn: 'Wat Phra Kaew',
        colorGroup: 'green',
        color: '#2E8B57',
        price: 3000,
        buildCost: 2000,
        rent: [260, 1300, 3900, 9000, 11000, 12750],
        mortgageValue: 1500
    },
    {
        position: 33,
        type: 'community',
        name: 'เปิดหีบสมบัติ',
        nameEn: 'Community Chest'
    },
    {
        position: 34,
        type: 'property',
        name: 'อโศก',
        nameEn: 'Asok',
        colorGroup: 'green',
        color: '#2E8B57',
        price: 3200,
        buildCost: 2000,
        rent: [280, 1500, 4500, 10000, 12000, 14000],
        mortgageValue: 1600
    },
    {
        position: 35,
        type: 'railroad',
        name: 'สถานี BTS',
        nameEn: 'BTS Station',
        price: 2000,
        rent: [250, 500, 1000, 2000],
        mortgageValue: 1000
    },
    {
        position: 36,
        type: 'chance',
        name: 'โชคชะตา',
        nameEn: 'Chance'
    },
    {
        position: 37,
        type: 'property',
        name: 'ทองหล่อ',
        nameEn: 'Thonglor',
        colorGroup: 'darkblue',
        color: '#00008B',
        price: 3500,
        buildCost: 2000,
        rent: [350, 1750, 5000, 11000, 13000, 15000],
        mortgageValue: 1750
    },
    {
        position: 38,
        type: 'tax',
        name: 'ภาษีฟุ่มเฟือย',
        nameEn: 'Luxury Tax',
        cost: 1000
    },
    {
        position: 39,
        type: 'property',
        name: 'สาทร',
        nameEn: 'Sathorn',
        colorGroup: 'darkblue',
        color: '#00008B',
        price: 4000,
        buildCost: 2000,
        rent: [500, 2000, 6000, 14000, 17000, 20000],
        mortgageValue: 2000
    }
];
