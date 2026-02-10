/**
 * Neon Angler - A Cyberpunk Fishing Game
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const energyEl = document.getElementById('energy');
const finalScoreEl = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let energy = 100;
let lastTime = 0;
let entities = [];
let particles = [];

// Screen sizing
let width, height;
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// Hook properties
const hook = {
    x: width / 2,
    y: 100,
    width: 10,
    height: 15,
    speed: 5,
    state: 'IDLE', // IDLE, DOWN, UP
    targetY: 100,
    originY: 100,
    maxLength: height - 50,
    dropSpeed: 12,
    retractSpeed: 8,
    dir: 1 // 1 for right, -1 for left
};

// Colors
const COLORS = {
    hook: '#00f3ff',
    line: '#00f3ff88',
    fish: ['#ff00ff', '#00ff9f', '#9d00ff', '#f3ff00'],
    virus: '#ff2222',
    bg: '#001a33'
};

class Entity {
    constructor(type) {
        this.type = type; // FISH or VIRUS
        this.reset();
    }

    reset() {
        this.radius = Math.random() * 15 + 10;
        this.speed = (Math.random() * 2 + 1.5) * (Math.random() > 0.5 ? 1 : -1);
        this.x = this.speed > 0 ? -50 : width + 50;
        this.y = 200 + Math.random() * (height - 300);
        this.color = this.type === 'FISH' ? COLORS.fish[Math.floor(Math.random() * COLORS.fish.length)] : COLORS.virus;
        this.points = this.type === 'FISH' ? 10 : -15;
        this.energyChange = this.type === 'FISH' ? 2 : -10;
        this.pulse = 0;
    }

    update() {
        this.x += this.speed;
        this.pulse += 0.05;

        // Reset if off screen
        if ((this.speed > 0 && this.x > width + 50) || (this.speed < 0 && this.x < -50)) {
            this.reset();
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        // Shape
        ctx.fillStyle = this.color;
        if (this.type === 'FISH') {
            // Simple data fish shape
            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius, this.radius / 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Tail
            ctx.beginPath();
            const tx = this.speed > 0 ? -this.radius : this.radius;
            ctx.moveTo(tx, 0);
            ctx.lineTo(tx + (this.speed > 0 ? -10 : 10), -10);
            ctx.lineTo(tx + (this.speed > 0 ? -10 : 10), 10);
            ctx.closePath();
            ctx.fill();
        } else {
            // Virus shape (diamond/glitchy)
            ctx.rotate(this.pulse);
            ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
            ctx.strokeRect(-this.radius - 2, -this.radius - 2, this.radius * 2 + 4, this.radius * 2 + 4);
        }
        
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.alpha = 1;
        this.life = 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.02;
    }

    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function spawnEntities() {
    entities = [];
    for (let i = 0; i < 6; i++) entities.push(new Entity('FISH'));
    for (let i = 0; i < 3; i++) entities.push(new Entity('VIRUS'));
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function update(time) {
    const dt = time - lastTime;
    lastTime = time;

    if (gameState !== 'PLAYING') return;

    // Update Hook
    if (hook.state === 'IDLE') {
        hook.x += hook.speed * hook.dir;
        if (hook.x > width - 50 || hook.x < 50) hook.dir *= -1;
    } else if (hook.state === 'DOWN') {
        hook.y += hook.dropSpeed;
        if (hook.y >= hook.maxLength) {
            hook.state = 'UP';
        }
    } else if (hook.state === 'UP') {
        hook.y -= hook.retractSpeed;
        if (hook.y <= hook.originY) {
            hook.y = hook.originY;
            hook.state = 'IDLE';
        }
    }

    // Update Entities
    entities.forEach(ent => {
        ent.update();

        // Collision Check
        if (hook.state === 'DOWN' || hook.state === 'UP') {
            const dx = ent.x - hook.x;
            const dy = ent.y - hook.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < ent.radius + 10) {
                // Caught!
                score += ent.points;
                energy = Math.min(100, energy + ent.energyChange);
                score = Math.max(0, score);
                
                createExplosion(ent.x, ent.y, ent.color);
                ent.reset();
                
                // Return hook if fish caught
                if (ent.type === 'FISH') {
                    hook.state = 'UP';
                } else {
                    // Hit virus
                    energy -= 5;
                }

                updateUI();
            }
        }
    });

    // Update Particles
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => p.update());

    // Game Over Check
    if (energy <= 0) {
        endGame();
    }
}

function draw() {
    ctx.clearRect(0, 0, width, height);

    // Draw Line
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(hook.x, 0);
    ctx.lineTo(hook.x, hook.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Hook
    ctx.fillStyle = COLORS.hook;
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLORS.hook;
    ctx.beginPath();
    ctx.arc(hook.x, hook.y, 8, 0, Math.PI * 2);
    ctx.fill();
    // Hook barb
    ctx.beginPath();
    ctx.moveTo(hook.x, hook.y + 5);
    ctx.quadraticCurveTo(hook.x + 10, hook.y + 15, hook.x, hook.y + 20);
    ctx.stroke();

    // Draw Entities
    entities.forEach(ent => ent.draw());

    // Draw Particles
    particles.forEach(p => p.draw());

    // UI Glow on Hook
    ctx.shadowBlur = 0;
}

function gameLoop(time) {
    update(time);
    draw();
    requestAnimationFrame(gameLoop);
}

function updateUI() {
    scoreEl.innerText = score;
    energyEl.innerText = Math.ceil(energy);
    if (energy < 30) energyEl.style.color = '#ff2222';
    else energyEl.style.color = COLORS.hook;
}

function startGame() {
    score = 0;
    energy = 100;
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    spawnEntities();
    updateUI();
}

function endGame() {
    gameState = 'GAMEOVER';
    finalScoreEl.innerText = score;
    gameOverScreen.classList.remove('hidden');
}

// Controls
function handleAction() {
    if (gameState === 'PLAYING' && hook.state === 'IDLE') {
        hook.state = 'DOWN';
    }
}

window.addEventListener('mousedown', (e) => {
    if (e.target.tagName !== 'BUTTON') handleAction();
});
window.addEventListener('touchstart', (e) => {
    if (e.target.tagName !== 'BUTTON') handleAction();
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Start
requestAnimationFrame(gameLoop);
setInterval(() => {
    if (gameState === 'PLAYING') {
        energy -= 0.5; // Passive energy drain
        updateUI();
    }
}, 1000);
