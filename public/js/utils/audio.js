// AudioManager - Client-side Synthesized Audio Feedback via Web Audio API

class AudioManager {
    constructor() {
        this.ctx = null;
    }

    /**
     * Initializes the AudioContext if not already created.
     */
    init() {
        if (this.ctx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            this.ctx = new AudioContextClass();
        }
    }

    /**
     * Resumes the AudioContext if suspended (browser security).
     */
    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(err => console.warn('AudioContext resume failed:', err));
        }
    }

    /**
     * Plays a sequence of clicking sounds to simulate rolling dice.
     */
    playDiceRoll() {
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const ticks = 7;
        for (let i = 0; i < ticks; i++) {
            const time = now + i * 0.08;
            // Descending volume, varied click frequency
            const freq = 120 + (ticks - i) * 12;
            const volume = 0.25 * (1 - (i / ticks));
            this.playClick(time, freq, volume);
        }
    }

    playClick(time, freq, volume) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.005, time + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + 0.06);
    }

    /**
     * Plays an upbeat rising chord sequence when a property is bought.
     */
    playBuyProperty() {
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        // Rising arpeggio: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        
        notes.forEach((freq, idx) => {
            const time = now + idx * 0.07;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.2, time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.005, time + 0.22);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(time);
            osc.stop(time + 0.25);
        });
    }

    /**
     * Plays a sad descending minor chord sequence for rent or taxes.
     */
    playPayRent() {
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        // Descending sad chord: G4 (392Hz), Eb4 (311Hz), C4 (261Hz)
        const notes = [392.00, 311.13, 261.63];

        notes.forEach((freq, idx) => {
            const time = now + idx * 0.12;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.18, time + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.005, time + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(time);
            osc.stop(time + 0.35);
        });
    }

    /**
     * Plays a quick frequency sweep (whoosh/chirp) representing drawing a card.
     */
    playDrawCard() {
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.2);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.21);
    }

    /**
     * Plays a dramatic low pitch slide and noise crash representing bankruptcy.
     */
    playBankruptcy() {
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        
        // Sawtooth falling tone
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.75);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.75);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.8);

        // Synthesize noise buffer for the crash crunch
        const bufferSize = this.ctx.sampleRate * 0.5; // 0.5s duration
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.linearRampToValueAtTime(60, now + 0.5);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.005, now + 0.5);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        noise.start(now);
        noise.stop(now + 0.52);
    }
}

const audioManager = new AudioManager();

// Global document interaction handlers to automatically unlock Web Audio contexts
const unlockAudio = () => {
    audioManager.resume();
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
};
document.addEventListener('click', unlockAudio);
document.addEventListener('keydown', unlockAudio);

export default audioManager;
export { audioManager };
