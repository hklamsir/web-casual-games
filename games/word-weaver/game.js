/**
 * Word Weaver (墨韻織詞)
 * A word puzzle game with ink brush aesthetics
 */

// ===== Game State =====
const GameState = {
    level: 1,
    score: 0,
    gridSize: 4,
    letters: [],
    targetWords: [],
    foundWords: [],
    selectedCells: [],
    isSelecting: false,
    hintsUsed: 0
};

// ===== Word Lists by Level =====
const WORD_LISTS = [
    // Level 1 (4x4, easy 3-4 letter words)
    {
        words: ['CAT', 'DOG', 'BAT', 'RAT', 'HAT', 'SAT', 'MAT', 'PAT', 'TAP', 'RAP', 'MAP', 'CAP', 'GAP', 'NAP', 'LAP'],
        gridSize: 4,
        requiredWords: 4
    },
    // Level 2
    {
        words: ['FISH', 'BIRD', 'FROG', 'TREE', 'LEAF', 'WIND', 'RAIN', 'SNOW', 'STAR', 'MOON'],
        gridSize: 4,
        requiredWords: 4
    },
    // Level 3
    {
        words: ['APPLE', 'GRAPE', 'LEMON', 'PEACH', 'BERRY', 'MANGO', 'MELON', 'PLUM', 'PEAR', 'KIWI'],
        gridSize: 4,
        requiredWords: 4
    },
    // Level 4 (5x5)
    {
        words: ['TIGER', 'LION', 'BEAR', 'WOLF', 'EAGLE', 'SNAKE', 'ZEBRA', 'HORSE', 'DEER', 'RABBIT'],
        gridSize: 5,
        requiredWords: 5
    },
    // Level 5
    {
        words: ['OCEAN', 'RIVER', 'LAKE', 'CLOUD', 'STORM', 'FLAME', 'EARTH', 'STONE', 'GRASS', 'FLOWER'],
        gridSize: 5,
        requiredWords: 5
    },
    // Level 6
    {
        words: ['HAPPY', 'SMILE', 'LAUGH', 'DREAM', 'PEACE', 'LIGHT', 'MUSIC', 'DANCE', 'PAINT', 'WRITE'],
        gridSize: 5,
        requiredWords: 5
    },
    // Level 7 (harder)
    {
        words: ['DRAGON', 'PHOENIX', 'CASTLE', 'KNIGHT', 'WIZARD', 'MAGIC', 'FOREST', 'GARDEN', 'TEMPLE', 'PALACE'],
        gridSize: 5,
        requiredWords: 5
    },
    // Level 8
    {
        words: ['CRYSTAL', 'DIAMOND', 'EMERALD', 'SILVER', 'GOLDEN', 'COPPER', 'BRONZE', 'MARBLE', 'PEARL', 'JADE'],
        gridSize: 5,
        requiredWords: 5
    }
];

// ===== DOM Elements =====
const DOM = {
    instructionsModal: document.getElementById('instructions-modal'),
    levelModal: document.getElementById('level-modal'),
    gameContainer: document.getElementById('game-container'),
    startBtn: document.getElementById('start-btn'),
    nextLevelBtn: document.getElementById('next-level-btn'),
    backBtn: document.getElementById('back-btn'),
    hintBtn: document.getElementById('hint-btn'),
    shuffleBtn: document.getElementById('shuffle-btn'),
    letterGrid: document.getElementById('letter-grid'),
    lineSvg: document.getElementById('line-svg'),
    currentWord: document.getElementById('current-word'),
    foundWords: document.getElementById('found-words'),
    wordsCount: document.getElementById('words-count'),
    levelDisplay: document.getElementById('level-display'),
    scoreDisplay: document.getElementById('score-display'),
    levelScoreText: document.getElementById('level-score-text')
};

// ===== Sound Effects (Web Audio API) =====
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioCtx();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    switch (type) {
        case 'select':
            osc.frequency.setValueAtTime(400 + GameState.selectedCells.length * 50, now);
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialDecayTo && gain.gain.exponentialDecayTo(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        case 'success':
            osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(659, now + 0.1);
            osc.frequency.setValueAtTime(784, now + 0.2);
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
            break;
        case 'fail':
            osc.frequency.setValueAtTime(200, now);
            osc.type = 'sawtooth';
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
        case 'levelup':
            [523, 659, 784, 1047].forEach((freq, i) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.connect(g);
                g.connect(audioCtx.destination);
                o.frequency.setValueAtTime(freq, now + i * 0.15);
                o.type = 'sine';
                g.gain.setValueAtTime(0.12, now + i * 0.15);
                g.gain.linearRampToValueAtTime(0.01, now + i * 0.15 + 0.3);
                o.start(now + i * 0.15);
                o.stop(now + i * 0.15 + 0.3);
            });
            return;
    }
}

// ===== Game Logic =====
function initLevel() {
    const levelIndex = (GameState.level - 1) % WORD_LISTS.length;
    const levelData = WORD_LISTS[levelIndex];
    
    GameState.gridSize = levelData.gridSize;
    GameState.foundWords = [];
    GameState.selectedCells = [];
    GameState.isSelecting = false;
    
    // Select random words for this level
    const shuffledWords = [...levelData.words].sort(() => Math.random() - 0.5);
    GameState.targetWords = shuffledWords.slice(0, levelData.requiredWords);
    
    // Generate grid with target words
    generateGrid();
    
    // Update UI
    updateUI();
    renderGrid();
    renderFoundWords();
}

function generateGrid() {
    const size = GameState.gridSize;
    const totalCells = size * size;
    
    // Initialize empty grid
    GameState.letters = Array(totalCells).fill('');
    
    // Place words in grid
    const placedWords = [];
    
    for (const word of GameState.targetWords) {
        if (tryPlaceWord(word)) {
            placedWords.push(word);
        }
    }
    
    // Update target words to only include placed ones
    GameState.targetWords = placedWords;
    
    // Fill remaining cells with random letters
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < totalCells; i++) {
        if (GameState.letters[i] === '') {
            GameState.letters[i] = alphabet[Math.floor(Math.random() * 26)];
        }
    }
}

function tryPlaceWord(word) {
    const size = GameState.gridSize;
    const directions = [
        [0, 1],   // right
        [1, 0],   // down
        [1, 1],   // diagonal down-right
        [-1, 1],  // diagonal up-right
        [0, -1],  // left
        [-1, 0],  // up
        [-1, -1], // diagonal up-left
        [1, -1]   // diagonal down-left
    ];
    
    // Try multiple random positions
    for (let attempt = 0; attempt < 100; attempt++) {
        const startRow = Math.floor(Math.random() * size);
        const startCol = Math.floor(Math.random() * size);
        const dir = directions[Math.floor(Math.random() * directions.length)];
        
        if (canPlaceWord(word, startRow, startCol, dir)) {
            placeWord(word, startRow, startCol, dir);
            return true;
        }
    }
    
    return false;
}

function canPlaceWord(word, row, col, [dr, dc]) {
    const size = GameState.gridSize;
    
    for (let i = 0; i < word.length; i++) {
        const r = row + i * dr;
        const c = col + i * dc;
        
        if (r < 0 || r >= size || c < 0 || c >= size) return false;
        
        const idx = r * size + c;
        const existing = GameState.letters[idx];
        
        if (existing !== '' && existing !== word[i]) return false;
    }
    
    return true;
}

function placeWord(word, row, col, [dr, dc]) {
    const size = GameState.gridSize;
    
    for (let i = 0; i < word.length; i++) {
        const r = row + i * dr;
        const c = col + i * dc;
        const idx = r * size + c;
        GameState.letters[idx] = word[i];
    }
}

function renderGrid() {
    const size = GameState.gridSize;
    DOM.letterGrid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    DOM.letterGrid.innerHTML = '';
    
    GameState.letters.forEach((letter, index) => {
        const cell = document.createElement('div');
        cell.className = 'letter-cell';
        cell.textContent = letter;
        cell.dataset.index = index;
        
        // Touch events
        cell.addEventListener('touchstart', handleTouchStart, { passive: false });
        cell.addEventListener('touchmove', handleTouchMove, { passive: false });
        cell.addEventListener('touchend', handleTouchEnd);
        
        // Mouse events
        cell.addEventListener('mousedown', handleMouseDown);
        cell.addEventListener('mouseenter', handleMouseEnter);
        
        DOM.letterGrid.appendChild(cell);
    });
    
    // Mouse up on document
    document.addEventListener('mouseup', handleMouseUp);
}

function renderFoundWords() {
    DOM.foundWords.innerHTML = '';
    
    // Show found words
    GameState.foundWords.forEach(word => {
        const chip = document.createElement('span');
        chip.className = 'word-chip';
        chip.textContent = word;
        DOM.foundWords.appendChild(chip);
    });
    
    // Show placeholders for remaining words
    const remaining = GameState.targetWords.length - GameState.foundWords.length;
    for (let i = 0; i < remaining; i++) {
        const placeholder = document.createElement('span');
        placeholder.className = 'word-placeholder';
        placeholder.textContent = '???';
        DOM.foundWords.appendChild(placeholder);
    }
    
    DOM.wordsCount.textContent = `(${GameState.foundWords.length}/${GameState.targetWords.length})`;
}

function updateUI() {
    DOM.levelDisplay.textContent = `第 ${GameState.level} 關`;
    DOM.scoreDisplay.textContent = `${GameState.score} 分`;
}

// ===== Selection Logic =====
function getCellFromPoint(x, y) {
    const element = document.elementFromPoint(x, y);
    if (element && element.classList.contains('letter-cell')) {
        return parseInt(element.dataset.index);
    }
    return -1;
}

function isAdjacent(idx1, idx2) {
    const size = GameState.gridSize;
    const row1 = Math.floor(idx1 / size);
    const col1 = idx1 % size;
    const row2 = Math.floor(idx2 / size);
    const col2 = idx2 % size;
    
    const dr = Math.abs(row1 - row2);
    const dc = Math.abs(col1 - col2);
    
    return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
}

function selectCell(index) {
    if (index < 0 || GameState.selectedCells.includes(index)) return;
    
    const lastSelected = GameState.selectedCells[GameState.selectedCells.length - 1];
    
    if (GameState.selectedCells.length > 0 && !isAdjacent(lastSelected, index)) {
        return;
    }
    
    GameState.selectedCells.push(index);
    updateSelectionUI();
    playSound('select');
}

function updateSelectionUI() {
    // Update cell styles
    document.querySelectorAll('.letter-cell').forEach((cell, idx) => {
        cell.classList.toggle('selected', GameState.selectedCells.includes(idx));
    });
    
    // Update current word display
    const word = GameState.selectedCells.map(i => GameState.letters[i]).join('');
    DOM.currentWord.textContent = word;
    
    // Draw lines
    renderLines();
}

function renderLines() {
    DOM.lineSvg.innerHTML = '';
    
    if (GameState.selectedCells.length < 2) return;
    
    const cells = document.querySelectorAll('.letter-cell');
    
    for (let i = 1; i < GameState.selectedCells.length; i++) {
        const prevIdx = GameState.selectedCells[i - 1];
        const currIdx = GameState.selectedCells[i];
        
        const prevCell = cells[prevIdx];
        const currCell = cells[currIdx];
        
        const prevRect = prevCell.getBoundingClientRect();
        const currRect = currCell.getBoundingClientRect();
        const svgRect = DOM.lineSvg.getBoundingClientRect();
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', prevRect.left + prevRect.width / 2 - svgRect.left);
        line.setAttribute('y1', prevRect.top + prevRect.height / 2 - svgRect.top);
        line.setAttribute('x2', currRect.left + currRect.width / 2 - svgRect.left);
        line.setAttribute('y2', currRect.top + currRect.height / 2 - svgRect.top);
        
        DOM.lineSvg.appendChild(line);
    }
}

function submitWord() {
    const word = GameState.selectedCells.map(i => GameState.letters[i]).join('');
    
    if (word.length >= 3 && 
        GameState.targetWords.includes(word) && 
        !GameState.foundWords.includes(word)) {
        
        // Valid word found!
        GameState.foundWords.push(word);
        
        // Calculate score
        let points = 100;
        if (word.length === 4) points = 200;
        if (word.length >= 5) points = 300;
        GameState.score += points;
        
        playSound('success');
        createInkSplash();
        
        // Check level complete
        if (GameState.foundWords.length === GameState.targetWords.length) {
            setTimeout(showLevelComplete, 500);
        }
        
        renderFoundWords();
        updateUI();
    } else if (word.length >= 3) {
        playSound('fail');
    }
    
    // Clear selection
    GameState.selectedCells = [];
    updateSelectionUI();
}

function createInkSplash() {
    const splash = document.createElement('div');
    splash.className = 'ink-splash';
    
    const lastIdx = GameState.selectedCells[GameState.selectedCells.length - 1];
    const cell = document.querySelectorAll('.letter-cell')[lastIdx];
    const rect = cell.getBoundingClientRect();
    
    splash.style.left = rect.left + rect.width / 2 - 25 + 'px';
    splash.style.top = rect.top + rect.height / 2 - 25 + 'px';
    
    document.body.appendChild(splash);
    setTimeout(() => splash.remove(), 600);
}

function showLevelComplete() {
    playSound('levelup');
    
    // Bonus score
    const bonus = GameState.level * 100;
    GameState.score += bonus;
    
    DOM.levelScoreText.textContent = `得分：${GameState.score} 分（+${bonus} 過關獎勵）`;
    DOM.levelModal.classList.remove('hidden');
    
    updateUI();
}

// ===== Event Handlers =====
function handleTouchStart(e) {
    e.preventDefault();
    initAudio();
    GameState.isSelecting = true;
    
    const touch = e.touches[0];
    const index = getCellFromPoint(touch.clientX, touch.clientY);
    selectCell(index);
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!GameState.isSelecting) return;
    
    const touch = e.touches[0];
    const index = getCellFromPoint(touch.clientX, touch.clientY);
    selectCell(index);
}

function handleTouchEnd(e) {
    e.preventDefault();
    if (GameState.isSelecting) {
        GameState.isSelecting = false;
        submitWord();
    }
}

function handleMouseDown(e) {
    initAudio();
    GameState.isSelecting = true;
    const index = parseInt(e.target.dataset.index);
    selectCell(index);
}

function handleMouseEnter(e) {
    if (!GameState.isSelecting) return;
    const index = parseInt(e.target.dataset.index);
    selectCell(index);
}

function handleMouseUp() {
    if (GameState.isSelecting) {
        GameState.isSelecting = false;
        submitWord();
    }
}

// ===== Hint System =====
function showHint() {
    // Find an unfound word
    const unfound = GameState.targetWords.find(w => !GameState.foundWords.includes(w));
    if (!unfound) return;
    
    // Find the first letter of that word
    const firstLetter = unfound[0];
    const cells = document.querySelectorAll('.letter-cell');
    
    for (let i = 0; i < GameState.letters.length; i++) {
        if (GameState.letters[i] === firstLetter) {
            cells[i].classList.add('hint');
            setTimeout(() => cells[i].classList.remove('hint'), 2000);
            break;
        }
    }
    
    GameState.hintsUsed++;
}

// ===== Shuffle (Visual only - for fun) =====
function shuffleAnimation() {
    const cells = document.querySelectorAll('.letter-cell');
    cells.forEach(cell => {
        cell.style.transform = `rotate(${Math.random() * 20 - 10}deg) scale(0.9)`;
    });
    
    setTimeout(() => {
        cells.forEach(cell => {
            cell.style.transform = '';
        });
    }, 300);
}

// ===== Initialize =====
function init() {
    DOM.startBtn.addEventListener('click', () => {
        initAudio();
        DOM.instructionsModal.classList.add('hidden');
        DOM.gameContainer.classList.remove('hidden');
        initLevel();
    });
    
    DOM.nextLevelBtn.addEventListener('click', () => {
        DOM.levelModal.classList.add('hidden');
        GameState.level++;
        initLevel();
    });
    
    DOM.backBtn.addEventListener('click', () => {
        DOM.gameContainer.classList.add('hidden');
        DOM.instructionsModal.classList.remove('hidden');
    });
    
    DOM.hintBtn.addEventListener('click', showHint);
    DOM.shuffleBtn.addEventListener('click', shuffleAnimation);
    
    // Handle window resize for lines
    window.addEventListener('resize', () => {
        if (GameState.selectedCells.length > 1) {
            renderLines();
        }
    });
}

init();
