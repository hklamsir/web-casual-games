const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('best-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let bestScore = localStorage.getItem('zenStackBest') || 0;
let frames = 0;

// Config
const INITIAL_WIDTH = 200; // Base width relative to a standard screen, scaled later
const BLOCK_HEIGHT = 30;
const MOVE_SPEED_BASE = 3;
const CAMERA_LERP = 0.1;

// Colors (Pastel / Zen palette)
const COLORS = [
    '#ff7675', '#74b9ff', '#55efc4', '#a29bfe', '#ffeaa7', '#fab1a0', '#81ecec'
];

// Objects
let blocks = [];
let debris = [];
let currentBlock = null;
let direction = 1; // 1 = right, -1 = left
let moveSpeed = MOVE_SPEED_BASE;
let cameraY = 0;
let targetCameraY = 0;

// Resize handling
let scale = 1;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    scale = Math.min(canvas.width / 400, 1.5); // Base scale on width, cap at 1.5
    if (gameState === 'START') {
        initGame();
        draw();
    }
}
window.addEventListener('resize', resize);

class Block {
    constructor(x, y, w, h, color) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.color = color;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y - cameraY, this.w, this.h);
        
        // Highlights for 3D-ish effect
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(this.x, this.y - cameraY, this.w, this.h * 0.2);
        
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(this.x, (this.y + this.h * 0.8) - cameraY, this.w, this.h * 0.2);
    }
}

class Debris {
    constructor(x, y, w, h, color, velocityX) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.color = color;
        this.vx = velocityX;
        this.vy = 0;
        this.gravity = 0.5;
        this.alpha = 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.alpha -= 0.02;
    }

    draw() {
        if (this.alpha <= 0) return;
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y - cameraY, this.w, this.h);
        ctx.globalAlpha = 1;
    }
}

function initGame() {
    blocks = [];
    debris = [];
    score = 0;
    moveSpeed = MOVE_SPEED_BASE;
    direction = 1;
    scoreEl.innerText = score;
    bestScoreEl.innerText = `最佳: ${bestScore}`;
    
    // Base block
    const baseW = INITIAL_WIDTH * scale;
    const baseH = BLOCK_HEIGHT * scale;
    const baseX = (canvas.width - baseW) / 2;
    const baseY = canvas.height - baseH - 50; // Start near bottom
    
    blocks.push(new Block(baseX, baseY, baseW, baseH, COLORS[0]));
    
    spawnNextBlock();
    
    // Reset Camera
    cameraY = 0;
    targetCameraY = 0;
}

function spawnNextBlock() {
    const prevBlock = blocks[blocks.length - 1];
    const color = COLORS[score % COLORS.length];
    
    // Spawn off-screen depending on direction?
    // Actually, let's spawn centered but moving
    // Wait, typical stacker spawns at one side.
    
    // Alternate direction
    // If last direction was 1 (right), next one starts from left or right?
    // Let's just bounce back and forth.
    
    // For simplicity: Spawn at Left edge moving Right, or Right edge moving Left.
    // Let's randomize start side or alternate.
    const spawnX = direction === 1 ? -prevBlock.w : canvas.width;
    
    currentBlock = new Block(spawnX, prevBlock.y - prevBlock.h, prevBlock.w, prevBlock.h, color);
}

function update() {
    if (gameState !== 'PLAYING') return;

    // Move current block
    currentBlock.x += moveSpeed * scale * direction;

    // Bounce off walls (or just reverse if it goes too far? No, standard stacker is bounce)
    // Actually, standard stacker: if you miss, you lose. It moves back and forth.
    if (currentBlock.x + currentBlock.w > canvas.width) {
        currentBlock.x = canvas.width - currentBlock.w;
        direction = -1;
    } else if (currentBlock.x < 0) {
        currentBlock.x = 0;
        direction = 1;
    }

    // Camera follow
    // Keep the stack in the lower 1/3rd
    const desiredY = currentBlock.y - (canvas.height * 0.6);
    if (desiredY < targetCameraY) { // Moving up (y decreases)
        targetCameraY = desiredY; // Coordinate system: y=0 top. moving up means lower y value.
        // But wait, cameraY is subtracted. 
        // If block is at 500, and we want to see it, cameraY should be such that 500 - cameraY is visible.
        // Initially block at 800. Camera 0. 800-0 = 800.
        // New block at 770. Camera should ideally move so 770 stays relative.
        // Let's make the "stack top" stay at approx 70% height.
    }
    
    // Actually, simpler logic:
    // Stack grows upwards (lower Y). 
    // If top block Y < canvas.height * 0.5, move camera up (decrease cameraY, wait, increase cameraY so objects shift down?)
    // draw: y - cameraY. To shift objects down, cameraY must decrease?
    // No, y=100. cameraY=0 -> draw at 100.
    // y=100. cameraY=-50 -> draw at 150 (shifted down).
    
    // Target: We want the top block to be at approx 60% of screen height.
    const topBlockY = blocks[blocks.length - 1].y;
    const targetScreenY = canvas.height * 0.6;
    // topBlockY - cameraY = targetScreenY
    // cameraY = topBlockY - targetScreenY
    
    // However, since we stack up, topBlockY decreases.
    // Initially topBlockY = 800. target = 600. cameraY = 200.
    // This shifts it up by 200... wait.
    // 800 - 200 = 600. Correct.
    
    // We only want to scroll UP (cameraY decreases... no, cameraY must decrease to shift things down? No.
    // y=0 (top). y=1000 (bottom).
    // Stack builds 900 -> 800 -> 700.
    // At 700, we want it at 800 on screen. 
    // 700 - cameraY = 800 => cameraY = -100.
    // So cameraY becomes negative as we go up.
    
    targetCameraY = Math.min(0, topBlockY - canvas.height * 0.6);
    
    cameraY += (targetCameraY - cameraY) * CAMERA_LERP;

    // Update Debris
    debris.forEach(d => d.update());
    debris = debris.filter(d => d.alpha > 0 && d.y < canvas.height + cameraY + 100);
}

function placeBlock() {
    if (gameState !== 'PLAYING') return;

    const prevBlock = blocks[blocks.length - 1];
    const curr = currentBlock;
    
    const dist = curr.x - prevBlock.x;
    const overlap = curr.w - Math.abs(dist);

    if (overlap > 0) {
        // Successful placement
        score++;
        scoreEl.innerText = score;
        if (score > 10) moveSpeed += 0.1;

        // Create new aligned block
        let newX = prevBlock.x;
        if (curr.x < prevBlock.x) {
            newX = prevBlock.x; // Clamped to left edge of prev
            // Actually, if coming from left and stopped early:
            // [   Prev   ]
            // [ Curr ]
            // New block should be [ Curr ] aligned? No.
            // Cut off the left part.
            // Wait, logic:
            // [   Prev   ]
            //      [ Curr ]  (Moved too far right)
            // Result:
            //      [ New ]
            // Debris:    [D]
            
            // New Width = overlap
            // If dist > 0 (Curr is to the right of Prev)
            // New X = Curr X
            // New W = Overlap
            // Debris X = Curr X + Overlap
            // Debris W = Dist
            
            // If dist < 0 (Curr is to the left of Prev)
            // New X = Prev X
            // New W = Overlap
            // Debris X = Curr X
            // Debris W = Abs(Dist)
        }

        let cutW = Math.abs(dist);
        let newW = overlap;
        let newBlockX, debrisX, debrisW;

        if (dist > 0) {
            // Right side overhanging
            newBlockX = curr.x; // Wait, if we cut the right, the left aligns with prev? No.
            // Prev: |-------|
            // Curr:     |-------|
            // Cut:          |---| (right part)
            // Keep:     |---|
            // New X should be PrevX + Dist? No, that's complex.
            
            // Standard logic: The part of Curr that overlaps Prev is kept.
            // Overlap range: Max(curr.left, prev.left) to Min(curr.right, prev.right)
            
            const overlapLeft = Math.max(curr.x, prevBlock.x);
            // const overlapRight = Math.min(curr.x + curr.w, prevBlock.x + prevBlock.w);
            // newW = overlapRight - overlapLeft;
            
            newBlockX = overlapLeft;
            
            debrisW = curr.w - newW;
            // If dist > 0 (moved right), debris is on the right
            debrisX = newBlockX + newW;
            
        } else {
            // Left side overhanging
            // Prev:      |-------|
            // Curr:  |-------|
            // Keep:      |---|
            // Debris:|---|
            
            const overlapLeft = Math.max(curr.x, prevBlock.x);
            newBlockX = overlapLeft;
            
            debrisW = curr.w - newW;
            debrisX = curr.x;
        }

        const newBlock = new Block(newBlockX, curr.y, newW, curr.h, curr.color);
        blocks.push(newBlock);
        
        // Add Debris
        const debrisColor = curr.color;
        const d = new Debris(debrisX, curr.y, debrisW, curr.h, debrisColor, direction * 2);
        debris.push(d);

        spawnNextBlock();
    } else {
        // Missed completely
        gameOver();
    }
}

function gameOver() {
    gameState = 'GAMEOVER';
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('zenStackBest', bestScore);
    }
    finalScoreEl.innerText = `分數: ${score}`;
    scoreEl.style.display = 'none';
    gameOverScreen.classList.add('active');
    
    // Make current block fall as debris
    const curr = currentBlock;
    debris.push(new Debris(curr.x, curr.y, curr.w, curr.h, curr.color, 0));
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background gradient
    // ctx.fillStyle = '#e0e5ec';
    // ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    debris.forEach(d => d.draw());
    blocks.forEach(b => b.draw());
    
    if (gameState === 'PLAYING' && currentBlock) {
        currentBlock.draw();
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Input
function handleInput(e) {
    if (e.type === 'touchstart') e.preventDefault(); // Prevent default touch actions
    
    if (gameState === 'START') {
        gameState = 'PLAYING';
        startScreen.classList.remove('active');
        scoreEl.style.display = 'block';
        initGame();
    } else if (gameState === 'PLAYING') {
        placeBlock();
    }
}

window.addEventListener('mousedown', handleInput);
window.addEventListener('touchstart', handleInput, {passive: false});
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') handleInput(e);
});

startBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent triggering game input
    gameState = 'PLAYING';
    startScreen.classList.remove('active');
    scoreEl.style.display = 'block';
    initGame();
});

restartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    gameOverScreen.classList.remove('active');
    gameState = 'PLAYING';
    scoreEl.style.display = 'block';
    initGame();
});

// Init
bestScoreEl.innerText = `最佳: ${bestScore}`;
resize();
loop();
