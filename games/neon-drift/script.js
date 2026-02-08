/**
 * Neon Drift - A Cyberpunk ZigZag Drifting Game
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-display');
const highScoreDisplay = document.getElementById('high-score');
const levelDisplay = document.getElementById('level-display');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreDisplay = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const exitBtn = document.getElementById('exit-btn');

// Game State
let gameState = 'START';
let score = 0;
let level = 1;
let highScore = localStorage.getItem('neon-drift-highscore') || 0;
let lastTime = 0;
let animationId;

// Game Constants
const TILE_SIZE = 40;
const PLAYER_SIZE = 12;
const PATH_WIDTH = 120;
const INITIAL_SPEED = 4;
const SPEED_INCREMENT = 0.0005;

// Player Settings
const player = {
    x: 0,
    y: 0,
    direction: 1, // 1 for right, -1 for left
    speed: INITIAL_SPEED,
    trail: []
};

// Path Generation
let paths = [];
let collectibles = [];
let viewOffset = { x: 0, y: 0 };

function initGame() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Reset state
    score = 0;
    level = 1;
    player.speed = INITIAL_SPEED;
    player.direction = 1;
    player.trail = [];
    paths = [];
    collectibles = [];
    
    // Set initial player position (bottom center-ish, moving up)
    player.x = canvas.width / 2;
    player.y = canvas.height * 0.7;
    
    // Initial path setup
    let currentX = player.x;
    let currentY = player.y;
    
    // Create first few segments
    for (let i = 0; i < 20; i++) {
        addPathSegment();
    }
    
    highScoreDisplay.textContent = `最高: ${highScore}`;
    updateScoreUI();
}

function addPathSegment() {
    let lastPath = paths[paths.length - 1];
    let startX, startY, dir;
    
    if (!lastPath) {
        // Start exactly where the player is to ensure they are on the path
        startX = player.x;
        startY = player.y; 
        dir = 1;
    } else {
        startX = lastPath.endX;
        startY = lastPath.endY;
        dir = Math.random() > 0.5 ? 1 : -1;
    }
    
    const length = Math.random() * 200 + 150;
    const endX = startX + (dir * length);
    const endY = startY - length; // Moving UP in screen coordinates
    
    paths.push({
        startX, startY, endX, endY, dir, length
    });
    
    // Randomly spawn collectible
    if (Math.random() > 0.7) {
        const t = Math.random() * 0.6 + 0.2;
        collectibles.push({
            x: startX + (dir * length * t),
            y: startY - (length * t),
            collected: false,
            pulse: 0
        });
    }
}

function update(deltaTime) {
    if (gameState !== 'PLAYING') return;

    // Increase speed slightly over time
    player.speed += SPEED_INCREMENT * deltaTime;

    // Move player (diagonal movement)
    // 45 degree movement: x and y change by same amount relative to speed
    const moveAmount = (player.speed * deltaTime) / 16;
    player.x += player.direction * moveAmount;
    player.y -= moveAmount;

    // Update trail
    player.trail.push({ x: player.x, y: player.y });
    if (player.trail.length > 20) player.trail.shift();

    // Check collision with path
    if (!isOnPath(player.x, player.y)) {
        endGame();
    }

    // Check collectibles
    collectibles.forEach(c => {
        if (!c.collected) {
            const dist = Math.hypot(player.x - c.x, player.y - c.y);
            if (dist < 25) {
                c.collected = true;
                score += 10;
                updateScoreUI();
                createParticleExplosion(c.x, c.y);
            }
            c.pulse += 0.1;
        }
    });

    // Score based on distance (y movement)
    // Use a slow increment
    if (Math.floor(Math.abs(player.y) / 100) > Math.floor((Math.abs(player.y) + moveAmount) / 100)) {
        // Handled by continuous check or just simple timer
    }
    
    // Actually simpler: score = total distance traveled
    // Let's use a simpler score logic: 1 point every 50 pixels moved up
    const currentDistanceScore = Math.floor(Math.abs(player.y - (canvas.height * 0.7)) / 50);
    if (currentDistanceScore > score) {
        // Only update if it doesn't decrease (collected items add score too)
        // score = currentDistanceScore; // This would overwrite collectible score
    }
    
    // Let's just increment score based on Y progress
    // We'll track the highest Y reached
    if (!this.highestY) this.highestY = player.y;
    if (player.y < this.highestY) {
        const diff = this.highestY - player.y;
        score += diff * 0.1;
        this.highestY = player.y;
        updateScoreUI();
    }

    // Camera follow (keep player in lower center)
    viewOffset.x = player.x - canvas.width / 2;
    viewOffset.y = player.y - canvas.height * 0.6;

    // Generate new paths as needed
    const lastPath = paths[paths.length - 1];
    if (lastPath.endY > player.y - canvas.height) {
        addPathSegment();
    }
    
    // Clean up old paths/collectibles
    if (paths.length > 50) paths.shift();
    if (collectibles.length > 50) collectibles.shift();
}

function isOnPath(x, y) {
    // Check if point is within PATH_WIDTH of any active path segment line
    for (let path of paths) {
        if (y <= path.startY && y >= path.endY) {
            // Distance from point to line segment
            // Our lines are always 45 degrees, so x = startX + dir * (startY - y)
            const expectedX = path.startX + path.dir * (path.startY - y);
            if (Math.abs(x - expectedX) < PATH_WIDTH / 2) {
                return true;
            }
        }
    }
    return false;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(-viewOffset.x, -viewOffset.y);

    // Draw Grid (Cyberpunk background)
    drawGrid();

    // Draw Paths
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Path glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = PATH_WIDTH;
    ctx.beginPath();
    paths.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.startX, p.startY);
        ctx.lineTo(p.endX, p.endY);
    });
    ctx.stroke();

    // Path Edges
    ctx.shadowBlur = 5;
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 4;
    
    // Left edge
    ctx.beginPath();
    paths.forEach((p, i) => {
        const offset = -PATH_WIDTH / 2;
        if (i === 0) ctx.moveTo(p.startX + offset, p.startY);
        ctx.lineTo(p.endX + offset, p.endY);
    });
    ctx.stroke();

    // Right edge
    ctx.beginPath();
    paths.forEach((p, i) => {
        const offset = PATH_WIDTH / 2;
        if (i === 0) ctx.moveTo(p.startX + offset, p.startY);
        ctx.lineTo(p.endX + offset, p.endY);
    });
    ctx.stroke();

    // Draw Collectibles
    collectibles.forEach(c => {
        if (c.collected) return;
        const size = 10 + Math.sin(c.pulse) * 3;
        ctx.fillStyle = '#ff00ff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff00ff';
        ctx.fillRect(c.x - size/2, c.y - size/2, size, size);
        
        // Spinning border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(c.x - size, c.y - size, size * 2, size * 2);
    });

    // Draw Player Trail
    if (player.trail.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.3)';
        ctx.lineWidth = 6;
        ctx.moveTo(player.trail[0].x, player.trail[0].y);
        for (let i = 1; i < player.trail.length; i++) {
            ctx.lineTo(player.trail[i].x, player.trail[i].y);
        }
        ctx.stroke();
    }

    // Draw Player
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff00ff';
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_SIZE, 0, Math.PI * 2);
    ctx.fill();
    
    // Player direction indicator
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + player.direction * 20, player.y - 20);
    ctx.stroke();

    ctx.restore();
}

function drawGrid() {
    const gridSize = 100;
    const startX = Math.floor(viewOffset.x / gridSize) * gridSize;
    const startY = Math.floor(viewOffset.y / gridSize) * gridSize;
    
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let x = startX; x < startX + canvas.width + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, startY + canvas.height + gridSize);
        ctx.stroke();
    }
    for (let y = startY; y < startY + canvas.height + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + canvas.width + gridSize, y);
        ctx.stroke();
    }
}

function updateScoreUI() {
    const displayScore = Math.floor(score);
    scoreDisplay.textContent = `分數: ${displayScore}`;
    
    // Level Up Logic: Every 100 points
    const newLevel = Math.floor(displayScore / 100) + 1;
    if (newLevel > level) {
        level = newLevel;
        player.speed += 0.5; // Significant speed boost on level up
        // Optional: show level up effect
    }
    levelDisplay.textContent = `Level: ${level}`;
}

function endGame() {
    gameState = 'GAMEOVER';
    const finalScore = Math.floor(score);
    finalScoreDisplay.textContent = finalScore;
    
    if (finalScore > highScore) {
        highScore = finalScore;
        localStorage.setItem('neon-drift-highscore', highScore);
        highScoreDisplay.textContent = `最高: ${highScore}`;
    }
    
    gameOverScreen.classList.remove('hidden');
}

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    draw();

    animationId = requestAnimationFrame(gameLoop);
}

// Particles
let particles = [];
function createParticleExplosion(x, y) {
    // Basic explosion logic can be added here if needed
}

// Input Handling
function handleInput(e) {
    if (gameState === 'PLAYING') {
        player.direction *= -1;
    }
}

window.addEventListener('mousedown', handleInput);
window.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput();
}, { passive: false });
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        handleInput();
    }
});

startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    gameState = 'PLAYING';
    initGame();
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
});

restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    gameState = 'PLAYING';
    initGame();
});

exitBtn.addEventListener('click', () => {
    window.location.href = '../../index.html';
});

// Resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Start
initGame();
draw(); // Initial draw
