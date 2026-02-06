const board = document.getElementById('board');
const movesEl = document.getElementById('moves');
const timerEl = document.getElementById('timer');
const levelEl = document.getElementById('level');
const levelModal = document.getElementById('levelModal');
const gameCompleteModal = document.getElementById('gameCompleteModal');
const levelMovesEl = document.getElementById('levelMoves');
const levelTimeEl = document.getElementById('levelTime');

// --- Audio System (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const Sound = {
    flip: () => playTone(400, 'sine', 0.1, 0.05),
    match: () => playMelody([523.25, 659.25, 783.99], 'sine', 0.1), // C Major
    error: () => playTone(150, 'sawtooth', 0.3, 0.2),
    win: () => playMelody([523.25, 659.25, 783.99, 1046.50], 'square', 0.15, 0.1) // Fanfare
};

function playTone(freq, type, duration, vol=0.1) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playMelody(notes, type, noteDuration, gap=0) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    notes.forEach((note, i) => {
        const startTime = audioCtx.currentTime + i * (noteDuration + gap);
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(note, startTime);
        
        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + noteDuration);
    });
}

// --- Game Logic ---

const EMOJI_POOL = [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
    '🦁','🐮','🐷','🐸','🐵','🐔','🦄','🐝','🐞','🦋',
    '🐌','🐢','🐠','🦀','🐙','🦑','🦕','🐬','🦓','🦒'
];

const LEVELS = [
    { cols: 3, rows: 2, pairs: 3 },  // Level 1: 6 cards
    { cols: 4, rows: 3, pairs: 6 },  // Level 2: 12 cards
    { cols: 4, rows: 4, pairs: 8 },  // Level 3: 16 cards
    { cols: 5, rows: 4, pairs: 10 }, // Level 4: 20 cards
    { cols: 6, rows: 4, pairs: 12 }, // Level 5: 24 cards
    { cols: 6, rows: 5, pairs: 15 }  // Level 6: 30 cards
];

let currentLevel = 0;
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let timerInterval;
let seconds = 0;
let isLocked = false;
let isGameActive = false;

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

function initGame(levelIndex) {
    // Reset State
    stopTimer();
    timerEl.innerText = "00:00";
    moves = 0;
    movesEl.innerText = 0;
    matchedPairs = 0;
    flippedCards = [];
    isLocked = false;
    isGameActive = false;
    
    // Hide Modals
    levelModal.style.display = 'none';
    gameCompleteModal.style.display = 'none';

    // Config Level
    if (levelIndex >= LEVELS.length) levelIndex = 0; // Loop or end? Let's restart.
    currentLevel = levelIndex;
    levelEl.innerText = currentLevel + 1;
    
    const config = LEVELS[currentLevel];
    
    // Set Grid
    board.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`;
    board.innerHTML = '';
    
    // Prepare Deck
    const levelEmojis = EMOJI_POOL.slice(0, config.pairs);
    const deck = [...levelEmojis, ...levelEmojis];
    shuffle(deck);
    
    // Create Cards
    deck.forEach(emoji => {
        const card = createCard(emoji);
        board.appendChild(card);
    });
}

function createCard(emoji) {
    const card = document.createElement('div');
    card.classList.add('card');
    
    const inner = document.createElement('div');
    inner.classList.add('card-inner');
    
    const front = document.createElement('div');
    front.classList.add('card-front');
    front.innerText = '?';
    
    const back = document.createElement('div');
    back.classList.add('card-back');
    back.innerText = emoji;
    
    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);
    
    card.addEventListener('click', () => flipCard(card, emoji));
    
    return card;
}

function startTimer() {
    if (isGameActive) return;
    isGameActive = true;
    seconds = 0;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        timerEl.innerText = `${mins}:${secs}`;
    }, 1000);
}

function stopTimer() {
    isGameActive = false;
    clearInterval(timerInterval);
}

function flipCard(card, emoji) {
    if (isLocked || card.classList.contains('flipped') || card.classList.contains('matched')) return;
    
    if (!isGameActive) startTimer();

    // Play Flip Sound
    Sound.flip();

    card.classList.add('flipped');
    flippedCards.push({ element: card, value: emoji });

    if (flippedCards.length === 2) {
        moves++;
        movesEl.innerText = moves;
        checkMatch();
    }
}

function checkMatch() {
    isLocked = true;
    const [card1, card2] = flippedCards;

    if (card1.value === card2.value) {
        // Match!
        setTimeout(() => {
            Sound.match();
            card1.element.classList.add('matched');
            card2.element.classList.add('matched');
            matchedPairs++;
            flippedCards = [];
            isLocked = false;
            
            // Level Complete Logic
            if (matchedPairs === LEVELS[currentLevel].pairs) {
                stopTimer();
                handleLevelComplete();
            }
        }, 300); // Slight delay for visual flip to finish
    } else {
        // No Match
        setTimeout(() => {
            Sound.error();
            card1.element.classList.remove('flipped');
            card2.element.classList.remove('flipped');
            flippedCards = [];
            isLocked = false;
        }, 1000);
    }
}

function handleLevelComplete() {
    Sound.win();
    
    if (currentLevel + 1 >= LEVELS.length) {
        // All levels finished
        setTimeout(() => {
            gameCompleteModal.style.display = 'flex';
        }, 500);
    } else {
        // Show Level Complete Modal
        levelMovesEl.innerText = moves;
        levelTimeEl.innerText = timerEl.innerText;
        setTimeout(() => {
            levelModal.style.display = 'flex';
        }, 500);
    }
}

function nextLevel() {
    initGame(currentLevel + 1);
}

function restartGame() {
    initGame(0);
}

// Start
initGame(0);
