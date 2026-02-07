/**
 * Synth Flow - 音律流動
 * A Rhythm Game with Synthwave Aesthetics
 */

(() => {
    'use strict';

    // ========================================
    // Game Configuration
    // ========================================
    const CONFIG = {
        noteSpeed: 4, // pixels per frame
        perfectWindow: 30, // pixels
        goodWindow: 60, // pixels
        scorePerPerfect: 100,
        scorePerGood: 50,
        comboMultiplier: 0.1, // bonus per combo
        hitLineY: 108, // distance from bottom
        spawnY: -50, // spawn above screen
        songDuration: 60000, // 60 seconds
        bpm: 120,
        lanes: 4,
        keyBindings: ['d', 'f', 'j', 'k'],
    };

    // ========================================
    // Game State
    // ========================================
    const state = {
        isPlaying: false,
        score: 0,
        combo: 0,
        maxCombo: 0,
        perfectCount: 0,
        goodCount: 0,
        missCount: 0,
        notes: [],
        startTime: 0,
        lastNoteTime: 0,
        animationId: null,
        audioCtx: null,
        beatMap: [],
    };

    // ========================================
    // DOM Elements
    // ========================================
    const elements = {
        instructionsModal: document.getElementById('instructions-modal'),
        gameoverModal: document.getElementById('gameover-modal'),
        gameContainer: document.getElementById('game-container'),
        startBtn: document.getElementById('start-game-btn'),
        retryBtn: document.getElementById('retry-btn'),
        scoreDisplay: document.getElementById('score'),
        comboDisplay: document.getElementById('combo'),
        progressFill: document.getElementById('progress-fill'),
        feedback: document.getElementById('feedback'),
        lanes: document.querySelectorAll('.lane'),
        touchBtns: document.querySelectorAll('.touch-btn'),
        finalScore: document.getElementById('final-score'),
        finalCombo: document.getElementById('final-combo'),
        finalPerfect: document.getElementById('final-perfect'),
        finalGood: document.getElementById('final-good'),
        finalMiss: document.getElementById('final-miss'),
    };

    // ========================================
    // Beat Map Generator
    // ========================================
    function generateBeatMap() {
        const beatMap = [];
        const beatInterval = 60000 / CONFIG.bpm; // ms per beat
        const totalBeats = Math.floor(CONFIG.songDuration / beatInterval);
        
        // Generate patterns for each beat
        for (let i = 4; i < totalBeats - 4; i++) {
            const time = i * beatInterval;
            const pattern = getPattern(i, totalBeats);
            
            pattern.forEach(lane => {
                beatMap.push({ time, lane });
            });
        }
        
        return beatMap;
    }

    function getPattern(beatIndex, totalBeats) {
        const patterns = [];
        const progress = beatIndex / totalBeats;
        const difficulty = Math.min(1, progress * 1.5); // ramp up difficulty
        
        // Basic patterns based on difficulty
        const rand = Math.random();
        
        if (rand < 0.3 + difficulty * 0.2) {
            // Single note
            patterns.push(Math.floor(Math.random() * CONFIG.lanes));
        } else if (rand < 0.5 + difficulty * 0.1) {
            // Double note (adjacent)
            const start = Math.floor(Math.random() * (CONFIG.lanes - 1));
            patterns.push(start, start + 1);
        } else if (rand < 0.7 && difficulty > 0.3) {
            // Double note (opposite)
            const pair = Math.random() < 0.5 ? [0, 3] : [1, 2];
            patterns.push(...pair);
        } else if (difficulty > 0.5 && rand < 0.8) {
            // Triple note
            const skip = Math.floor(Math.random() * CONFIG.lanes);
            for (let i = 0; i < CONFIG.lanes; i++) {
                if (i !== skip) patterns.push(i);
            }
        }
        
        // Skip some beats for breathing room
        if (Math.random() < 0.15) {
            return [];
        }
        
        return patterns;
    }

    // ========================================
    // Audio System (Web Audio API)
    // ========================================
    function initAudio() {
        if (!state.audioCtx) {
            state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (state.audioCtx.state === 'suspended') {
            state.audioCtx.resume();
        }
    }

    function playHitSound(isPerfect) {
        if (!state.audioCtx) return;
        
        const osc = state.audioCtx.createOscillator();
        const gain = state.audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(state.audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.value = isPerfect ? 880 : 660;
        
        gain.gain.setValueAtTime(0.3, state.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, state.audioCtx.currentTime + 0.1);
        
        osc.start();
        osc.stop(state.audioCtx.currentTime + 0.1);
    }

    function playMissSound() {
        if (!state.audioCtx) return;
        
        const osc = state.audioCtx.createOscillator();
        const gain = state.audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(state.audioCtx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.value = 150;
        
        gain.gain.setValueAtTime(0.2, state.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, state.audioCtx.currentTime + 0.15);
        
        osc.start();
        osc.stop(state.audioCtx.currentTime + 0.15);
    }

    // ========================================
    // Game Logic
    // ========================================
    function startGame() {
        initAudio();
        
        // Reset state
        state.score = 0;
        state.combo = 0;
        state.maxCombo = 0;
        state.perfectCount = 0;
        state.goodCount = 0;
        state.missCount = 0;
        state.notes = [];
        state.isPlaying = true;
        state.startTime = performance.now();
        state.lastNoteTime = 0;
        state.beatMap = generateBeatMap();
        
        // UI updates
        updateHUD();
        elements.instructionsModal.classList.add('hidden');
        elements.gameoverModal.classList.add('hidden');
        elements.gameContainer.classList.remove('hidden');
        
        // Clear existing notes
        document.querySelectorAll('.note').forEach(n => n.remove());
        
        // Start game loop
        gameLoop();
    }

    function gameLoop() {
        if (!state.isPlaying) return;
        
        const elapsed = performance.now() - state.startTime;
        const progress = Math.min(1, elapsed / CONFIG.songDuration);
        
        // Update progress bar
        elements.progressFill.style.width = `${progress * 100}%`;
        
        // Spawn notes based on beatmap
        spawnNotes(elapsed);
        
        // Update note positions
        updateNotes();
        
        // Check for game end
        if (elapsed >= CONFIG.songDuration && state.notes.length === 0) {
            endGame();
            return;
        }
        
        state.animationId = requestAnimationFrame(gameLoop);
    }

    function spawnNotes(elapsed) {
        const gameArea = document.getElementById('game-area');
        const travelTime = (gameArea.offsetHeight + Math.abs(CONFIG.spawnY)) / CONFIG.noteSpeed * (1000 / 60);
        
        state.beatMap.forEach((beat, index) => {
            const spawnTime = beat.time - travelTime;
            
            if (spawnTime <= elapsed && !beat.spawned) {
                beat.spawned = true;
                createNote(beat.lane, index);
            }
        });
    }

    function createNote(laneIndex, id) {
        const lane = elements.lanes[laneIndex];
        if (!lane) return;
        
        const note = document.createElement('div');
        note.className = `note lane-${laneIndex}`;
        note.dataset.id = id;
        note.dataset.lane = laneIndex;
        note.style.top = `${CONFIG.spawnY}px`;
        
        lane.appendChild(note);
        state.notes.push({
            element: note,
            lane: laneIndex,
            id: id,
            y: CONFIG.spawnY,
        });
    }

    function updateNotes() {
        const gameArea = document.getElementById('game-area');
        const hitLineY = gameArea.offsetHeight - CONFIG.hitLineY;
        const toRemove = [];
        
        state.notes.forEach((note, index) => {
            note.y += CONFIG.noteSpeed;
            note.element.style.top = `${note.y}px`;
            
            // Check if note passed hit zone (miss)
            if (note.y > hitLineY + CONFIG.goodWindow + 30) {
                if (!note.hit) {
                    handleMiss();
                }
                toRemove.push(index);
            }
        });
        
        // Remove missed notes
        toRemove.reverse().forEach(index => {
            const note = state.notes[index];
            note.element.remove();
            state.notes.splice(index, 1);
        });
    }

    function handleLanePress(laneIndex) {
        if (!state.isPlaying) return;
        
        const gameArea = document.getElementById('game-area');
        const hitLineY = gameArea.offsetHeight - CONFIG.hitLineY;
        
        // Find closest note in this lane
        let closestNote = null;
        let closestDistance = Infinity;
        
        state.notes.forEach(note => {
            if (note.lane === laneIndex && !note.hit) {
                const distance = Math.abs(note.y + 15 - hitLineY); // 15 = half note height
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestNote = note;
                }
            }
        });
        
        if (closestNote && closestDistance <= CONFIG.goodWindow) {
            closestNote.hit = true;
            closestNote.element.classList.add('hit');
            
            if (closestDistance <= CONFIG.perfectWindow) {
                handlePerfect();
            } else {
                handleGood();
            }
            
            setTimeout(() => {
                const index = state.notes.indexOf(closestNote);
                if (index > -1) {
                    closestNote.element.remove();
                    state.notes.splice(index, 1);
                }
            }, 200);
        }
    }

    function handlePerfect() {
        state.combo++;
        state.perfectCount++;
        const bonus = Math.floor(state.combo * CONFIG.comboMultiplier * CONFIG.scorePerPerfect);
        state.score += CONFIG.scorePerPerfect + bonus;
        state.maxCombo = Math.max(state.maxCombo, state.combo);
        
        showFeedback('PERFECT!', 'perfect');
        playHitSound(true);
        updateHUD();
    }

    function handleGood() {
        state.combo++;
        state.goodCount++;
        const bonus = Math.floor(state.combo * CONFIG.comboMultiplier * CONFIG.scorePerGood);
        state.score += CONFIG.scorePerGood + bonus;
        state.maxCombo = Math.max(state.maxCombo, state.combo);
        
        showFeedback('GOOD', 'good');
        playHitSound(false);
        updateHUD();
    }

    function handleMiss() {
        state.combo = 0;
        state.missCount++;
        
        showFeedback('MISS', 'miss');
        playMissSound();
        updateHUD();
    }

    function showFeedback(text, type) {
        elements.feedback.textContent = text;
        elements.feedback.className = `show ${type}`;
        
        setTimeout(() => {
            elements.feedback.classList.remove('show');
        }, 500);
    }

    function updateHUD() {
        elements.scoreDisplay.textContent = state.score.toLocaleString();
        elements.comboDisplay.textContent = state.combo;
    }

    function endGame() {
        state.isPlaying = false;
        cancelAnimationFrame(state.animationId);
        
        // Show results
        elements.finalScore.textContent = state.score.toLocaleString();
        elements.finalCombo.textContent = state.maxCombo;
        elements.finalPerfect.textContent = state.perfectCount;
        elements.finalGood.textContent = state.goodCount;
        elements.finalMiss.textContent = state.missCount;
        
        elements.gameContainer.classList.add('hidden');
        elements.gameoverModal.classList.remove('hidden');
    }

    // ========================================
    // Event Listeners
    // ========================================
    function initEventListeners() {
        // Start button
        elements.startBtn.addEventListener('click', startGame);
        elements.retryBtn.addEventListener('click', startGame);
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            const laneIndex = CONFIG.keyBindings.indexOf(e.key.toLowerCase());
            if (laneIndex !== -1) {
                e.preventDefault();
                handleLanePress(laneIndex);
                elements.touchBtns[laneIndex].classList.add('pressed');
            }
        });
        
        document.addEventListener('keyup', (e) => {
            const laneIndex = CONFIG.keyBindings.indexOf(e.key.toLowerCase());
            if (laneIndex !== -1) {
                elements.touchBtns[laneIndex].classList.remove('pressed');
            }
        });
        
        // Touch controls
        elements.touchBtns.forEach(btn => {
            const handleStart = (e) => {
                e.preventDefault();
                const lane = parseInt(btn.dataset.lane);
                handleLanePress(lane);
                btn.classList.add('pressed');
            };
            
            const handleEnd = (e) => {
                e.preventDefault();
                btn.classList.remove('pressed');
            };
            
            btn.addEventListener('touchstart', handleStart, { passive: false });
            btn.addEventListener('touchend', handleEnd, { passive: false });
            btn.addEventListener('mousedown', handleStart);
            btn.addEventListener('mouseup', handleEnd);
            btn.addEventListener('mouseleave', handleEnd);
        });
        
        // Prevent scrolling on game area
        document.getElementById('game-area').addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    // ========================================
    // Initialize
    // ========================================
    initEventListeners();
})();
