/**
 * Shared Utilities for Web Casual Games
 * Provides safe localStorage access and unified AudioContext management
 */

const GameUtils = (() => {
    'use strict';

    // ========================================
    // Safe localStorage (Issue #1: localStorage 容錯處理)
    // ========================================
    const storage = {
        get(key, defaultValue = null) {
            try {
                const value = localStorage.getItem(key);
                return value !== null ? value : defaultValue;
            } catch (e) {
                console.warn('[GameUtils] localStorage.getItem failed:', e.message);
                return defaultValue;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (e) {
                console.warn('[GameUtils] localStorage.setItem failed:', e.message);
                return false;
            }
        },

        getJSON(key, defaultValue = null) {
            try {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : defaultValue;
            } catch (e) {
                console.warn('[GameUtils] localStorage.getJSON failed:', e.message);
                return defaultValue;
            }
        },

        setJSON(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('[GameUtils] localStorage.setJSON failed:', e.message);
                return false;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.warn('[GameUtils] localStorage.removeItem failed:', e.message);
                return false;
            }
        }
    };

    // ========================================
    // Unified AudioContext (Issue #2: AudioContext autoplay 政策)
    // ========================================
    let audioCtx = null;
    let audioInitialized = false;

    const audio = {
        /**
         * Get or create the shared AudioContext.
         * Call this after a user interaction (click/touch) to ensure autoplay works.
         */
        getContext() {
            if (!audioCtx) {
                try {
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                } catch (e) {
                    console.warn('[GameUtils] AudioContext creation failed:', e.message);
                    return null;
                }
            }
            // Resume if suspended (required for iOS Safari and Chrome autoplay policy)
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
            }
            return audioCtx;
        },

        /**
         * Initialize audio on user interaction.
         * Should be called once on first click/touch/keydown.
         */
        init() {
            if (audioInitialized) return;
            
            const ctx = this.getContext();
            if (ctx) {
                // Create a silent buffer to "unlock" audio on iOS
                const buffer = ctx.createBuffer(1, 1, 22050);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                source.start(0);
                audioInitialized = true;
            }
        },

        /**
         * Play a simple tone.
         * @param {number} freq - Frequency in Hz
         * @param {string} type - Oscillator type ('sine', 'square', 'sawtooth', 'triangle')
         * @param {number} duration - Duration in seconds
         * @param {number} volume - Volume (0-1)
         */
        playTone(freq, type = 'sine', duration = 0.1, volume = 0.3) {
            const ctx = this.getContext();
            if (!ctx) return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);

            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + duration);
        },

        /**
         * Play a melody (sequence of notes).
         * @param {number[]} notes - Array of frequencies
         * @param {string} type - Oscillator type
         * @param {number} noteDuration - Duration per note
         * @param {number} gap - Gap between notes
         */
        playMelody(notes, type = 'sine', noteDuration = 0.1, gap = 0) {
            const ctx = this.getContext();
            if (!ctx) return;

            notes.forEach((note, i) => {
                const startTime = ctx.currentTime + i * (noteDuration + gap);
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = type;
                osc.frequency.setValueAtTime(note, startTime);

                gain.gain.setValueAtTime(0.1, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + noteDuration);
            });
        }
    };

    // Auto-init audio on first user interaction
    const initOnInteraction = () => {
        audio.init();
        document.removeEventListener('click', initOnInteraction);
        document.removeEventListener('touchstart', initOnInteraction);
        document.removeEventListener('keydown', initOnInteraction);
    };

    document.addEventListener('click', initOnInteraction);
    document.addEventListener('touchstart', initOnInteraction);
    document.addEventListener('keydown', initOnInteraction);

    // ========================================
    // Debounce Utility
    // ========================================
    function debounce(fn, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // ========================================
    // Public API
    // ========================================
    return {
        storage,
        audio,
        debounce
    };
})();

// Export for ES modules (if used)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameUtils;
}
