/**
 * Echo Chase (回聲獵人)
 * A sensory-based arcade game using visual ripple effects.
 */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const finalScoreEl = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let lives = 3;
let level = 1;
let lastTime = 0;
let ripples = [];
let targets = [];
let particles = [];
let spawnTimer = 0;

// Configuration
const COLORS = {
    ripple: 'rgba(0, 242, 255, 0.4)',
    target: '#ffcc00',
    particle: '#00f2ff',
    bg: '#000000'
};

class Ripple {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = Math.max(canvas.width, canvas.height) * 0.4;
        this.speed = 5;
        this.opacity = 1;
        this.alive = true;
    }

    update() {
        this.radius += this.speed;
        this.opacity = 1 - (this.radius / this.maxRadius);
        if (this.radius >= this.maxRadius) this.alive = false;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 242, 255, ${this.opacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

class Target {
    constructor() {
        this.radius = 12 + Math.random() * 8;
        this.x = this.radius + Math.random() * (canvas.width - this.radius * 2);
        this.y = this.radius + Math.random() * (canvas.height - this.radius * 2);
        this.visible = false;
        this.alive = true;
        this.spawnTime = Date.now();
        this.lifetime = 3000 - (level * 150); // Gets harder
        if (this.lifetime < 1000) this.lifetime = 1000;
        this.alpha = 0;
    }

    update(ripples) {
        // Check if revealed by a ripple
        let revealed = false;
        for (let ripple of ripples) {
            const dist = Math.hypot(this.x - ripple.x, this.y - ripple.y);
            // revealed if within the ripple frontier
            if (Math.abs(dist - ripple.radius) < 20) {
                revealed = true;
                break;
            }
        }

        if (revealed) {
            this.alpha = 1;
        } else {
            this.alpha *= 0.95; // Fade out quickly
        }

        if (Date.now() - this.spawnTime > this.lifetime) {
            this.alive = false;
            loseLife();
        }
    }

    draw() {
        if (this.alpha <= 0.05) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.shadowBlur = 15;
        ctx.shadowColor = COLORS.target;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.target;
        ctx.fill();
        
        // Inner pulse
        const pulse = Math.sin(Date.now() / 100) * 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius - 5 + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.radius = Math.random() * 3;
        this.alpha = 1;
        this.color = color;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.02;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function init() {
    resize();
    window.addEventListener('resize', resize);
    
    canvas.addEventListener('touchstart', handleInput, { passive: false });
    canvas.addEventListener('mousedown', handleInput);
    
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', startGame);
    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = '../../index.html';
    });
    
    requestAnimationFrame(gameLoop);
}

function resize() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

function startGame() {
    score = 0;
    lives = 3;
    level = 1;
    ripples = [];
    targets = [];
    particles = [];
    spawnTimer = 0;
    updateHUD();
    
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
}

function handleInput(e) {
    if (gameState !== 'PLAYING') return;
    if (e.type === 'touchstart') e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    
    // Check if clicked a target
    let hit = false;
    for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i];
        if (t.alpha > 0.2) { // Only clickable if somewhat visible
            const dist = Math.hypot(x - t.x, y - t.y);
            if (dist < t.radius + 20) {
                hit = true;
                targets.splice(i, 1);
                score += 10;
                createExplosion(t.x, t.y, COLORS.target);
                checkLevelUp();
                updateHUD();
                break;
            }
        }
    }
    
    // Create ripple on every click
    ripples.push(new Ripple(x, y));
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function loseLife() {
    lives--;
    updateHUD();
    if (lives <= 0) {
        endGame();
    }
}

function checkLevelUp() {
    const nextLevel = Math.floor(score / 100) + 1;
    if (nextLevel > level) {
        level = nextLevel;
        // Visual feedback
        createExplosion(canvas.width / 2, canvas.height / 2, COLORS.ripple);
    }
}

function updateHUD() {
    scoreEl.textContent = score;
    livesEl.textContent = lives;
    levelEl.textContent = level;
}

function endGame() {
    gameState = 'GAMEOVER';
    finalScoreEl.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

function spawnTarget() {
    const interval = Math.max(800, 2500 - (level * 200));
    if (Date.now() - spawnTimer > interval) {
        targets.push(new Target());
        spawnTimer = Date.now();
    }
}

function gameLoop(time) {
    const dt = time - lastTime;
    lastTime = time;
    
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'PLAYING') {
        spawnTarget();
        
        // Update & Draw Ripples
        for (let i = ripples.length - 1; i >= 0; i--) {
            ripples[i].update();
            ripples[i].draw();
            if (!ripples[i].alive) ripples.splice(i, 1);
        }
        
        // Update & Draw Targets
        for (let i = targets.length - 1; i >= 0; i--) {
            targets[i].update(ripples);
            targets[i].draw();
            if (!targets[i].alive) targets.splice(i, 1);
        }
        
        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].alpha <= 0) particles.splice(i, 1);
        }
    }
    
    requestAnimationFrame(gameLoop);
}

init();