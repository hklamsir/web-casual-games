/**
 * Stellar Reflector - A physics-based puzzle shooter
 */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const levelDisplay = document.getElementById('level-display');
const scoreDisplay = document.getElementById('score-display');
const energyDisplay = document.getElementById('energy-display');
const instructionModal = document.getElementById('instruction-modal');
const gameOverModal = document.getElementById('game-over-modal');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const launchBtn = document.getElementById('launch-btn');
const backBtn = document.getElementById('back-btn');

// Game State
let gameState = 'IDLE'; // IDLE, PLAYING, SHOOTING, GAME_OVER
let level = 1;
let score = 0;
let energy = 100;
let ball = { x: 0, y: 0, vx: 0, vy: 0, radius: 8, active: false };
let target = { x: 0, y: 0, radius: 25 };
let reflectors = [];
let blackHoles = [];
let particles = [];
let lastTime = 0;

// Config
const BALL_SPEED = 6;
const ENERGY_COST_PER_SHOT = 5;
const ENERGY_REWARD_PER_LEVEL = 15;

// Initialize
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    launchBtn.addEventListener('click', launchBall);
    backBtn.addEventListener('click', () => window.location.href = '../../index.html');

    // Canvas Events
    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('mouseup', handlePointerUp);
    canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
    canvas.addEventListener('touchmove', handlePointerMove, { passive: false });
    canvas.addEventListener('touchend', handlePointerUp);

    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    const wrapper = document.getElementById('canvas-wrapper');
    canvas.width = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
    if (gameState === 'PLAYING' || gameState === 'IDLE') {
        setupLevel();
    }
}

function startGame() {
    level = 1;
    score = 0;
    energy = 100;
    instructionModal.classList.add('hidden');
    gameOverModal.classList.add('hidden');
    setupLevel();
}

function setupLevel() {
    gameState = 'PLAYING';
    ball.active = false;
    ball.x = canvas.width * 0.5;
    ball.y = canvas.height - 100;
    
    // Target position (random top half)
    target.x = 50 + Math.random() * (canvas.width - 100);
    target.y = 80 + Math.random() * (canvas.height * 0.3);

    // Reflectors (increase with level)
    reflectors = [];
    const count = Math.min(2 + Math.floor(level / 3), 5);
    for (let i = 0; i < count; i++) {
        reflectors.push({
            x: canvas.width * 0.2 + Math.random() * (canvas.width * 0.6),
            y: canvas.height * 0.4 + Math.random() * (canvas.height * 0.3),
            length: 80,
            angle: Math.random() * Math.PI,
            width: 10,
            dragging: false
        });
    }

    // Black Holes
    blackHoles = [];
    if (level > 2) {
        const bhCount = Math.min(Math.floor(level / 2), 4);
        for (let i = 0; i < bhCount; i++) {
            blackHoles.push({
                x: 50 + Math.random() * (canvas.width - 100),
                y: 150 + Math.random() * (canvas.height * 0.5),
                radius: 20 + Math.random() * 15
            });
        }
    }

    updateUI();
}

function updateUI() {
    levelDisplay.textContent = level;
    scoreDisplay.textContent = score;
    energyDisplay.textContent = Math.max(0, Math.floor(energy));
    launchBtn.disabled = ball.active || energy < ENERGY_COST_PER_SHOT;
}

function launchBall() {
    if (ball.active || energy < ENERGY_COST_PER_SHOT) return;
    
    energy -= ENERGY_COST_PER_SHOT;
    ball.active = true;
    ball.vx = 0;
    ball.vy = -BALL_SPEED;
    gameState = 'SHOOTING';
    updateUI();
}

// Input Handling
let activeReflector = null;

function handlePointerDown(e) {
    if (gameState !== 'PLAYING') return;
    const pos = getPointerPos(e);
    
    reflectors.forEach(r => {
        const dx = pos.x - r.x;
        const dy = pos.y - r.y;
        if (Math.sqrt(dx*dx + dy*dy) < 50) {
            r.dragging = true;
            activeReflector = r;
        }
    });
}

function handlePointerMove(e) {
    if (!activeReflector || gameState !== 'PLAYING') return;
    e.preventDefault();
    const pos = getPointerPos(e);
    const dx = pos.x - activeReflector.x;
    const dy = pos.y - activeReflector.y;
    activeReflector.angle = Math.atan2(dy, dx);
}

function handlePointerUp() {
    if (activeReflector) activeReflector.dragging = false;
    activeReflector = null;
}

function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

// Game Loop
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    draw();
    requestAnimationFrame(gameLoop);
}

function update(dt) {
    if (gameState === 'SHOOTING' && ball.active) {
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Wall collisions
        if (ball.x < ball.radius || ball.x > canvas.width - ball.radius) {
            ball.vx *= -1;
            createParticles(ball.x, ball.y, '#fff', 5);
        }
        if (ball.y < ball.radius) {
            ball.vy *= -1;
            createParticles(ball.x, ball.y, '#fff', 5);
        }

        // Out of bounds
        if (ball.y > canvas.height) {
            ball.active = false;
            gameState = 'PLAYING';
            if (energy < ENERGY_COST_PER_SHOT) endGame();
            updateUI();
        }

        // Target collision
        const distToTarget = Math.sqrt((ball.x - target.x)**2 + (ball.y - target.y)**2);
        if (distToTarget < ball.radius + target.radius) {
            winLevel();
        }

        // Black hole collision
        blackHoles.forEach(bh => {
            const dist = Math.sqrt((ball.x - bh.x)**2 + (ball.y - bh.y)**2);
            if (dist < ball.radius + bh.radius) {
                ball.active = false;
                energy -= 15;
                gameState = 'PLAYING';
                createParticles(ball.x, ball.y, '#ff3131', 20);
                if (energy < ENERGY_COST_PER_SHOT) endGame();
                updateUI();
            }
        });

        // Reflector collisions
        reflectors.forEach(r => {
            checkLineCollision(r);
        });
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function checkLineCollision(r) {
    const cos = Math.cos(r.angle);
    const sin = Math.sin(r.angle);
    
    // Line end points
    const x1 = r.x - (r.length/2) * cos;
    const y1 = r.y - (r.length/2) * sin;
    const x2 = r.x + (r.length/2) * cos;
    const y2 = r.y + (r.length/2) * sin;

    // Vector ball to line start
    const dx = ball.x - x1;
    const dy = ball.y - y1;
    // Line vector
    const ldx = x2 - x1;
    const ldy = y2 - y1;
    const lineLenSq = ldx*ldx + ldy*ldy;
    
    // Projection factor
    let t = (dx * ldx + dy * ldy) / lineLenSq;
    t = Math.max(0, Math.min(1, t));

    // Closest point on line
    const closestX = x1 + t * ldx;
    const closestY = y1 + t * ldy;

    const dist = Math.sqrt((ball.x - closestX)**2 + (ball.y - closestY)**2);

    if (dist < ball.radius + r.width/2) {
        // Reflection vector
        const normalAngle = r.angle + Math.PI/2;
        const nx = Math.cos(normalAngle);
        const ny = Math.sin(normalAngle);
        
        // Dot product of velocity and normal
        const dot = ball.vx * nx + ball.vy * ny;
        
        // Reflect: v = v - 2 * (v.n) * n
        ball.vx = ball.vx - 2 * dot * nx;
        ball.vy = ball.vy - 2 * dot * ny;
        
        // Push out of collision
        ball.x = closestX + nx * (ball.radius + r.width/2 + 1) * (dot > 0 ? 1 : -1);
        ball.y = closestY + ny * (ball.radius + r.width/2 + 1) * (dot > 0 ? 1 : -1);

        createParticles(closestX, closestY, '#00f2ff', 8);
    }
}

function winLevel() {
    ball.active = false;
    score += level * 100 + Math.floor(energy);
    energy = Math.min(100, energy + ENERGY_REWARD_PER_LEVEL);
    level++;
    createParticles(target.x, target.y, '#39ff14', 40);
    
    setTimeout(setupLevel, 1000);
}

function endGame() {
    gameState = 'GAME_OVER';
    document.getElementById('final-level').textContent = level;
    document.getElementById('final-score').textContent = score;
    gameOverModal.classList.remove('hidden');
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1.0,
            color
        });
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Space Background detail
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    for(let i=0; i<canvas.width; i+=40) {
        ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height);
    }
    for(let j=0; j<canvas.height; j+=40) {
        ctx.moveTo(0, j); ctx.lineTo(canvas.width, j);
    }
    ctx.stroke();

    // Draw Target (Star Core)
    const targetGrd = ctx.createRadialGradient(target.x, target.y, 5, target.x, target.y, target.radius);
    targetGrd.addColorStop(0, '#fff');
    targetGrd.addColorStop(0.3, '#39ff14');
    targetGrd.addColorStop(1, 'rgba(57, 255, 20, 0)');
    ctx.fillStyle = targetGrd;
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius + Math.sin(Date.now()/200)*3, 0, Math.PI*2);
    ctx.fill();

    // Draw Black Holes
    blackHoles.forEach(bh => {
        const grd = ctx.createRadialGradient(bh.x, bh.y, 2, bh.x, bh.y, bh.radius);
        grd.addColorStop(0, '#000');
        grd.addColorStop(0.7, '#111');
        grd.addColorStop(1, 'rgba(255, 49, 49, 0.4)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI*2);
        ctx.fill();
        
        ctx.strokeStyle = '#ff3131';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.radius + Math.sin(Date.now()/100)*2, 0, Math.PI*2);
        ctx.stroke();
    });

    // Draw Reflectors
    reflectors.forEach(r => {
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.angle);
        
        // Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f2ff';
        
        ctx.fillStyle = r.dragging ? '#fff' : '#00f2ff';
        ctx.fillRect(-r.length/2, -r.width/2, r.length, r.width);
        
        // Handles
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-r.length/2, 0, 4, 0, Math.PI*2);
        ctx.arc(r.length/2, 0, 4, 0, Math.PI*2);
        ctx.fill();
        
        ctx.restore();
    });

    // Draw Ball
    if (ball.active) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff00ff';
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
    } else if (gameState === 'PLAYING') {
        // Draw trajectory guide (simplified)
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(ball.x, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(255, 0, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI*2);
        ctx.fill();
    }

    // Draw Particles
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
    });
    ctx.globalAlpha = 1.0;
}

init();
