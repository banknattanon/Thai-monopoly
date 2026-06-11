// BootScene - Generates dynamic visual assets and boots the lobby scene

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Create a simple text loading indicator
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const loadingText = this.add.text(width / 2, height / 2, 'กำลังโหลดข้อมูลเกม... / Loading...', {
            fontFamily: 'Noto Sans Thai, sans-serif',
            fontSize: '20px',
            fill: '#EAB308'
        }).setOrigin(0.5);

        // Animate loading text
        this.tweens.add({
            targets: loadingText,
            alpha: { from: 1, to: 0.4 },
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }

    create() {
        console.log('BootScene: Generating dynamic graphical assets...');
        
        // Generate dynamic visual textures using Phaser Graphics & Canvas cache
        this.generateDiceTexture();
        this.generateHouseTexture();
        this.generateHotelTexture();
        this.generateTokenBaseTexture();

        console.log('BootScene: Textures generated successfully. Transitioning to LobbyScene...');
        this.scene.start('LobbyScene');
    }

    /**
     * Generates a 64x64 rounded dice face texture.
     */
    generateDiceTexture() {
        const size = 64;
        const canvas = this.textures.createCanvas('dice_face', size, size);
        const ctx = canvas.context;

        // Draw rounded rectangle die face
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 3;

        const radius = 10;
        ctx.beginPath();
        ctx.roundRect(4, 4, size - 8, size - 8, radius);
        ctx.fill();
        ctx.stroke();

        // Refresh texture canvas
        canvas.refresh();
    }

    /**
     * Generates a green house triangle/shape texture.
     */
    generateHouseTexture() {
        const size = 16;
        const canvas = this.textures.createCanvas('house', size, size);
        const ctx = canvas.context;

        ctx.fillStyle = '#22C55E';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;

        // Draw house shape (triangle roof + rectangular base)
        ctx.beginPath();
        ctx.moveTo(size / 2, 1);
        ctx.lineTo(size - 1, size / 2);
        ctx.lineTo(size - 1, size - 1);
        ctx.lineTo(1, size - 1);
        ctx.lineTo(1, size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        canvas.refresh();
    }

    /**
     * Generates a red hotel texture.
     */
    generateHotelTexture() {
        const size = 20;
        const canvas = this.textures.createCanvas('hotel', size, size);
        const ctx = canvas.context;

        ctx.fillStyle = '#EF4444';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;

        // Draw hotel shape (pentagon house shape)
        ctx.beginPath();
        ctx.moveTo(size / 2, 1);
        ctx.lineTo(size - 1, size * 0.4);
        ctx.lineTo(size - 1, size - 1);
        ctx.lineTo(1, size - 1);
        ctx.lineTo(1, size * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        canvas.refresh();
    }

    /**
     * Generates a token base circle texture.
     */
    generateTokenBaseTexture() {
        const size = 32;
        const canvas = this.textures.createCanvas('token_base', size, size);
        const ctx = canvas.context;

        // White base circle
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        canvas.refresh();
    }
}
