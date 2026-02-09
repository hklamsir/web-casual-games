/**
 * Glitch Sorter (電幻修復師)
 * A fast-paced arcade sorting game with cyberpunk aesthetics.
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreVal = document.getElementById('score-val');
const levelVal = document.getElementById('level-val');
const energyFill = document.getElementById('energy-fill');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScore = document.getElementById('final-score');
const finalLevel = document.getElementById('final-level');

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let level = 1;
let energy = 100;
let cores = [];
let particles = [];
let scanlines = [];
let lastTime = 0;
let spawnTimer = 0;
let spawnInterval = 1500;
let dragCore = null;

// Constants
const COLORS = {
    RED: '#ff3c3c',
    BLUE: '#00f2ff',
    PURPLE: '#9d00ff',
    PINK: '#ff00ea',
    BG: '#0a0a12'
};

class Core {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'RED' (Left) or 'BLUE' (Right)
        this.radius = 25;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() * 1) + 0.5 + (level * 0.2);
        this.isDragging = false;
        this.flicker = 0;
        this.hue = type === 'RED' ? 0 : 190;
    }

    update() {
        if (!this.isDragging) {
            this.x += this.vx;
            this.y += this.vy;
            
            // Wall bounce
            if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) {
                this.vx *= -1;
                this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
            }
        }
        this.flicker = Math.sin(Date.now() / 100) * 5;
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 15 + this.flicker;
        ctx.shadowColor = this.type === 'RED' ? COLORS.RED : COLORS.BLUE;
        
        // Outer ring
        ctx.strokeStyle = this.type === 'RED' ? COLORS.RED : COLORS.BLUE;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.5, this.type === 'RED' ? COLORS.RED : COLORS.BLUE);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius - 5, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 4 + 2;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.alpha = 1;
        this.life = 1.0;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.02;
        this.alpha = this.life;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.size, this.size);
        ctx.fill();
        ctx.restore();
    }
}

function init() {
    resize();
    window.addEventListener('resize', resize);
    
    // Controls
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('touchstart', (e) => handleStart(e.touches[0]));
    canvas.addEventListener('touchmove', (e) => handleMove(e.touches[0]));
    canvas.addEventListener('touchend', handleEnd);

    document.getElementById('start-btn').onclick = startGame;
    document.getElementById('restart-btn').onclick = startGame;
    document.getElementById('back-btn').onclick = () => location.href = '../../index.html';

    requestAnimationFrame(gameLoop);
}

function resize() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

function startGame() {
    gameState = 'PLAYING';
    score = 0;
    level = 1;
    energy = 100;
    cores = [];
    particles = [];
    spawnTimer = 0;
    spawnInterval = 1500;
    
    scoreVal.innerText = '0';
    levelVal.innerText = '1';
    energyFill.style.width = '100%';
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
}

function gameOver() {
    gameState = 'GAMEOVER';
    finalScore.innerText = score;
    finalLevel.innerText = level;
    gameOverScreen.classList.remove('hidden');
}

function spawnCore() {
    const type = Math.random() > 0.5 ? 'RED' : 'BLUE';
    const x = Math.random() * (canvas.width - 100) + 50;
    cores.push(new Core(x, -50, type));
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function handleStart(e) {
    if (gameState !== 'PLAYING') return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (let i = cores.length - 1; i >= 0; i--) {
        const c = cores[i];
        const dist = Math.sqrt((mx - c.x) ** 2 + (my - c.y) ** 2);
        if (dist < c.radius * 2) {
            dragCore = c;
            c.isDragging = true;
            break;
        }
    }
}

function handleMove(e) {
    if (!dragCore || gameState !== 'PLAYING') return;
    const rect = canvas.getBoundingClientRect();
    dragCore.x = e.clientX - rect.left;
    dragCore.y = e.clientY - rect.top;
}

function handleEnd() {
    if (dragCore) {
        dragCore.isDragging = false;
        dragCore = null;
    }
}

function update(deltaTime) {
    if (gameState !== 'PLAYING') return;

    spawnTimer += deltaTime;
    if (spawnTimer > spawnInterval) {
        spawnCore();
        spawnTimer = 0;
        // Adjust difficulty
        spawnInterval = Math.max(600, 1500 - (level * 80));
    }

    for (let i = cores.length - 1; i >= 0; i--) {
        const c = cores[i];
        c.update();

        // Check if out of bounds (Bottom)
        if (c.y > canvas.height + c.radius) {
            energy -= 15;
            createExplosion(c.x, canvas.height, COLORS.PINK);
            cores.splice(i, 1);
            continue;
        }

        // Check if sorted
        const gateWidth = 40;
        if (c.x < gateWidth && c.type === 'RED') {
            score += 10;
            energy = Math.min(100, energy + 2);
            createExplosion(c.x, c.y, COLORS.RED);
            cores.splice(i, 1);
        } else if (c.x > canvas.width - gateWidth && c.type === 'BLUE') {
            score += 10;
            energy = Math.min(100, energy + 2);
            createExplosion(c.x, c.y, COLORS.BLUE);
            cores.splice(i, 1);
        } else if ((c.x < gateWidth && c.type === 'BLUE') || (c.x > canvas.width - gateWidth && c.type === 'RED')) {
            // Wrong gate
            energy -= 20;
            createExplosion(c.x, c.y, COLORS.PINK);
            cores.splice(i, 1);
        }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    // Update UI
    scoreVal.innerText = score;
    const newLevel = Math.floor(score / 200) + 1;
    if (newLevel > level) {
        level = newLevel;
        levelVal.innerText = level;
    }
    
    energyFill.style.width = energy + '%';
    if (energy <= 0) {
        energy = 0;
        gameOver();
    }
}

function draw() {
    // Clear
    ctx.fillStyle = COLORS.BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid Background
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.05)';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Sorting Gates
    const gateWidth = 10;
    // Left Gate (RED)
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLORS.RED;
    ctx.fillStyle = COLORS.RED;
    ctx.fillRect(0, 100, gateWidth, canvas.height - 200);
    
    // Right Gate (BLUE)
    ctx.shadowColor = COLORS.BLUE;
    ctx.fillStyle = COLORS.BLUE;
    ctx.fillRect(canvas.width - gateWidth, 100, gateWidth, canvas.height - 200);
    ctx.shadowBlur = 0;

    // Draw Entities
    cores.forEach(c => c.draw());
    particles.forEach(p => p.draw());

    // Post-processing: Scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillRect(0, y, canvas.width, 1);
    }
}

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

init();
