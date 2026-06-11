function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function createChanceDeck() {
    const cards = [
        {
            id: 'chance_1',
            text: 'เดินไปจุดเริ่มต้น รับ ฿2,000',
            textEn: 'Advance to GO. Collect ฿2,000',
            type: 'move',
            effect: {
                action: 'move-to',
                destination: 0,
                collectGo: true
            }
        },
        {
            id: 'chance_2',
            text: 'เดินไป สาทร',
            textEn: 'Advance to Sathorn',
            type: 'move',
            effect: {
                action: 'move-to',
                destination: 39,
                collectGo: true
            }
        },
        {
            id: 'chance_3',
            text: 'เดินไป สยามพารากอน',
            textEn: 'Advance to Siam Paragon',
            type: 'move',
            effect: {
                action: 'move-to',
                destination: 21,
                collectGo: true
            }
        },
        {
            id: 'chance_4',
            text: 'เดินไป การไฟฟ้า',
            textEn: 'Advance to Electric Company',
            type: 'move',
            effect: {
                action: 'move-to',
                destination: 12,
                collectGo: true
            }
        },
        {
            id: 'chance_5',
            text: 'เดินไป สถานีหัวลำโพง',
            textEn: 'Advance to Hua Lamphong Station',
            type: 'move',
            effect: {
                action: 'move-to',
                destination: 5,
                collectGo: true
            }
        },
        {
            id: 'chance_6',
            text: 'ได้รับเงินปันผล ฿500',
            textEn: 'Bank pays you dividend of ฿500',
            type: 'money',
            effect: {
                action: 'receive',
                amount: 500
            }
        },
        {
            id: 'chance_7',
            text: 'ออกคุกฟรี',
            textEn: 'Get Out of Jail Free',
            type: 'get-out-jail',
            effect: {
                action: 'get-out-jail'
            }
        },
        {
            id: 'chance_8',
            text: 'ถอยหลัง 3 ช่อง',
            textEn: 'Go back 3 spaces',
            type: 'move',
            effect: {
                action: 'move-back',
                amount: 3
            }
        },
        {
            id: 'chance_9',
            text: 'ไปคุก!',
            textEn: 'Go to Jail!',
            type: 'jail',
            effect: {
                action: 'go-to-jail'
            }
        },
        {
            id: 'chance_10',
            text: 'ค่าซ่อมบ้าน ฿250/บ้าน ฿1,000/โรงแรม',
            textEn: 'Make general repairs on all your property: ฿250 per house, ฿1,000 per hotel',
            type: 'repair',
            effect: {
                action: 'repair',
                house: 250,
                hotel: 1000
            }
        },
        {
            id: 'chance_11',
            text: 'จ่ายค่าปรับ ฿150',
            textEn: 'Pay poor tax of ฿150',
            type: 'money',
            effect: {
                action: 'pay',
                amount: 150
            }
        },
        {
            id: 'chance_12',
            text: 'เดินไป เชียงใหม่',
            textEn: 'Advance to Chiang Mai',
            type: 'move',
            effect: {
                action: 'move-to',
                destination: 16,
                collectGo: true
            }
        },
        {
            id: 'chance_13',
            text: 'ธนาคารจ่ายเงินปันผล ฿1,000',
            textEn: 'Your building loan matures. Receive ฿1,000',
            type: 'money',
            effect: {
                action: 'receive',
                amount: 1000
            }
        },
        {
            id: 'chance_14',
            text: 'เดินไป ภูเก็ต',
            textEn: 'Advance to Phuket',
            type: 'move',
            effect: {
                action: 'move-to',
                destination: 26,
                collectGo: true
            }
        },
        {
            id: 'chance_15',
            text: 'ได้รับเลือกเป็นประธาน จ่ายทุกคน คนละ ฿500',
            textEn: 'You have been elected Chairman of the Board. Pay each player ฿500',
            type: 'money',
            effect: {
                action: 'pay-all',
                amount: 500
            }
        },
        {
            id: 'chance_16',
            text: 'ค่ารักษาพยาบาล ฿1,000',
            textEn: 'Pay hospital fees of ฿1,000',
            type: 'money',
            effect: {
                action: 'pay',
                amount: 1000
            }
        }
    ];
    return shuffle(cards);
}

function createCommunityDeck() {
    const cards = [
        {
            id: 'community_1',
            text: 'เดินไปจุดเริ่มต้น รับ ฿2,000',
            textEn: 'Advance to GO. Collect ฿2,000',
            type: 'move',
            effect: {
                action: 'move-to',
                destination: 0,
                collectGo: true
            }
        },
        {
            id: 'community_2',
            text: 'ได้รับมรดก ฿1,000',
            textEn: 'Inheritance. Receive ฿1,000',
            type: 'money',
            effect: {
                action: 'receive',
                amount: 1000
            }
        },
        {
            id: 'community_3',
            text: 'ได้รับคืนภาษีเงินได้ ฿200',
            textEn: 'Income tax refund. Receive ฿200',
            type: 'money',
            effect: {
                action: 'receive',
                amount: 200
            }
        },
        {
            id: 'community_4',
            text: 'จ่ายค่าหมอ ฿500',
            textEn: "Doctor's fees. Pay ฿500",
            type: 'money',
            effect: {
                action: 'pay',
                amount: 500
            }
        },
        {
            id: 'community_5',
            text: 'ชนะรางวัลประกวดความงามที่สอง ได้รับ ฿100',
            textEn: 'Second prize in a beauty contest. Receive ฿100',
            type: 'money',
            effect: {
                action: 'receive',
                amount: 100
            }
        },
        {
            id: 'community_6',
            text: 'ขายหุ้นได้กำไร ฿500',
            textEn: 'From sale of stock you get ฿500',
            type: 'money',
            effect: {
                action: 'receive',
                amount: 500
            }
        },
        {
            id: 'community_7',
            text: 'ออกคุกฟรี',
            textEn: 'Get Out of Jail Free',
            type: 'get-out-jail',
            effect: {
                action: 'get-out-jail'
            }
        },
        {
            id: 'community_8',
            text: 'ไปคุก!',
            textEn: 'Go to Jail!',
            type: 'jail',
            effect: {
                action: 'go-to-jail'
            }
        },
        {
            id: 'community_9',
            text: 'จ่ายค่าเล่าเรียน ฿500',
            textEn: 'Pay school fees of ฿500',
            type: 'money',
            effect: {
                action: 'pay',
                amount: 500
            }
        },
        {
            id: 'community_10',
            text: 'ได้รับเงินบริจาค ฿1,000',
            textEn: 'Receive ฿1,000 donation',
            type: 'money',
            effect: {
                action: 'receive',
                amount: 1000
            }
        },
        {
            id: 'community_11',
            text: 'ประกันชีวิตครบกำหนด ได้รับ ฿1,000',
            textEn: 'Life insurance matures. Receive ฿1,000',
            type: 'money',
            effect: {
                action: 'receive',
                amount: 1000
            }
        },
        {
            id: 'community_12',
            text: 'จ่ายค่าประกันภัย ฿500',
            textEn: 'Pay insurance premium of ฿500',
            type: 'money',
            effect: {
                action: 'pay',
                amount: 500
            }
        },
        {
            id: 'community_13',
            text: 'วันนี้เป็นวันเกิดของคุณ! เก็บจากทุกคน คนละ ฿100',
            textEn: 'It is your birthday! Collect ฿100 from every player',
            type: 'collect-all',
            effect: {
                action: 'collect-all',
                amount: 100
            }
        },
        {
            id: 'community_14',
            text: 'จ่ายค่าธรรมเนียม ฿500',
            textEn: 'Pay bank fees of ฿500',
            type: 'money',
            effect: {
                action: 'pay',
                amount: 500
            }
        },
        {
            id: 'community_15',
            text: 'ได้รับโบนัส ฿250',
            textEn: 'Receive ฿250 holiday bonus',
            type: 'money',
            effect: {
                action: 'receive',
                amount: 250
            }
        },
        {
            id: 'community_16',
            text: 'ค่าซ่อมบ้าน ฿400/บ้าน ฿1,150/โรงแรม',
            textEn: 'You are assessed for street repairs: ฿400 per house, ฿1,150 per hotel',
            type: 'repair',
            effect: {
                action: 'repair',
                house: 400,
                hotel: 1150
            }
        }
    ];
    return shuffle(cards);
}

module.exports = {
    createChanceDeck,
    createCommunityDeck
};
