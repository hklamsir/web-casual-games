const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const finalScoreEl = document.getElementById('final-score');
const skillBar = document.getElementById('skillBar');

// --- Audio System (Synthwave style) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    
    if (type === 'eat') {
        // High pitch "ding"
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'dash') {
        // Low pitch power hum
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(300, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'die') {
        // Noise-like crash (approximated with modulation)
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
        
        // Add LFO for roughness
        const lfo = audioCtx.createOscillator();
        lfo.frequency.value = 50;
        lfo.connect(gain.gain);
        lfo.start(now);
        lfo.stop(now+0.5);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    }
}

// Constants
const GRID_SIZE = 20;
let TILE_COUNT = 30; // Dynamic based on resize
const SPEED_NORMAL = 130; // Slower speed (was 100)
const SPEED_DASH = 60; // Slower dash (was 40)

function resizeCanvas() {
    // Get container size (force square if possible or adapt)
    // To prevent "food outside screen", we fix the logic resolution to 600x600
    // and let CSS handle the visual scaling.
    canvas.width = 600; 
    canvas.height = 600;
    TILE_COUNT = canvas.width / GRID_SIZE; // Always 30
}

resizeCanvas();

// Game State
let snake = [];
let food = {x: 15, y: 15};
let velocity = {x: 0, y: 0};
let inputQueue = []; // Input buffer
let score = 0;
let highScore = parseInt(GameUtils.storage.get('neonSnakeHighScore', '0')) || 0;
let gameLoopId;
let lastTime = 0;
let accumulator = 0;

// Skill State
let energy = 100;
let isDashing = false;
let dashDrainRate = 1.5; // Energy drain per frame
let energyRegenRate = 0.2; // Energy gain per frame

// Particles
let particles = [];

// Init
highScoreEl.innerText = highScore;

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 4 - 2;
        this.speedY = Math.random() * 4 - 2;
        this.life = 1.0;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.03;
    }
    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

function startGame() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    
    snake = [
        {x: 10, y: 10},
        {x: 10, y: 11},
        {x: 10, y: 12}
    ];
    velocity = {x: 0, y: -1}; // Start moving up
    inputQueue = [];
    score = 0;
    energy = 100;
    particles = [];
    spawnFood();
    scoreEl.innerText = score;

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    lastTime = performance.now();
    accumulator = 0; // Reset accumulator to prevent catch-up lag
    requestAnimationFrame(loop);
}

function spawnFood() {
    let valid = false;
    // Buffer to keep food away from walls (2 tiles)
    const buffer = 2;
    
    while (!valid) {
        food = {
            x: Math.floor(Math.random() * (TILE_COUNT - 2 * buffer)) + buffer,
            y: Math.floor(Math.random() * (TILE_COUNT - 2 * buffer)) + buffer
        };
        valid = true;
        for(let part of snake) {
            if(part.x === food.x && part.y === food.y) {
                valid = false;
                break;
            }
        }
    }
}

function explode(x, y, color) {
    const px = x * GRID_SIZE + GRID_SIZE/2;
    const py = y * GRID_SIZE + GRID_SIZE/2;
    for(let i=0; i<10; i++) {
        particles.push(new Particle(px, py, color));
    }
}

function loop(timestamp) {
    let dt = timestamp - lastTime;
    lastTime = timestamp;
    
    // Prevent spiral of death on lag/tab switch
    if (dt > 500) dt = 500;
    
    // Check if game is actually playing to prevent running update logic after game over
    if (document.getElementById('game-over-screen').style.display !== 'none') {
            // Loop continues but no update logic runs, effectively pausing the game logic
            // We don't cancelAnimationFrame here to keep drawing the last state if needed,
            // but typically gameOver cancels it. This is a safety check.
            return; 
    }
    
    // Fixed update step for logic
    const updateRate = isDashing ? SPEED_DASH : SPEED_NORMAL;
    
    accumulator += dt;
    
    // Skill Management
    if(isDashing) {
        energy -= dashDrainRate;
        if(energy <= 0) {
            energy = 0;
            isDashing = false;
        }
        if (Math.random() < 0.3) playSound('dash'); // Periodic dash sound
    } else {
        if(energy < 100) energy += energyRegenRate;
    }
    skillBar.style.transform = `scaleX(${energy/100})`;
    // Color change when dashing
    skillBar.style.backgroundColor = isDashing ? '#fff' : 'var(--secondary)';
    skillBar.style.boxShadow = isDashing ? '0 0 20px #fff' : '0 0 10px var(--secondary)';

    // Update Logic loop
    // We use a while loop but with a safety break to prevent infinite loops if updateRate is 0 or logic is slow
    let updates = 0;
    while (accumulator > updateRate && updates < 10) {
        update();
        accumulator -= updateRate;
        updates++;
        
        // If game over happened inside update, break immediately
        if (document.getElementById('game-over-screen').style.display !== 'none') {
            return;
        }
    }

    draw();
    gameLoopId = requestAnimationFrame(loop);
}

function update() {
    if (inputQueue.length > 0) {
        velocity = inputQueue.shift();
    }
    
    const head = {x: snake[0].x + velocity.x, y: snake[0].y + velocity.y};

    // Wall Collision
    if(head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        if(isDashing) {
            // Wrap around logic for Phase Dash
            if(head.x < 0) head.x = TILE_COUNT - 1;
            if(head.x >= TILE_COUNT) head.x = 0;
            if(head.y < 0) head.y = TILE_COUNT - 1;
            if(head.y >= TILE_COUNT) head.y = 0;
        } else {
            playSound('die');
            gameOver();
            return;
        }
    }

    // Self Collision
    if(!isDashing) {
        for(let part of snake) {
            if(head.x === part.x && head.y === part.y) {
                playSound('die');
                gameOver();
                return;
            }
        }
    }

    snake.unshift(head);

    // Eat Food
    if(head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.innerText = score;
        playSound('eat');
        explode(head.x, head.y, '#ff00ff');
        spawnFood();
    } else {
        snake.pop();
    }
}

function draw() {
    // Clear
    ctx.fillStyle = 'rgba(5, 5, 16, 0.4)'; // Trail effect
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Food
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff00ff';
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(food.x * GRID_SIZE + 2, food.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);

    // Draw Snake
    ctx.shadowBlur = isDashing ? 30 : 15;
    ctx.shadowColor = isDashing ? '#fff' : '#00f3ff';
    
    snake.forEach((part, index) => {
        ctx.fillStyle = isDashing ? '#ffffff' : (index === 0 ? '#ccfcff' : '#00f3ff');
        
        // Slight shrink for body parts
        const shrink = index === 0 ? 0 : 2;
        ctx.fillRect(
            part.x * GRID_SIZE + shrink/2, 
            part.y * GRID_SIZE + shrink/2, 
            GRID_SIZE - shrink, 
            GRID_SIZE - shrink
        );
    });

    ctx.shadowBlur = 0; // Reset

    // Update & Draw Particles
    for(let i=particles.length-1; i>=0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if(particles[i].life <= 0) particles.splice(i, 1);
    }
}

function gameOver() {
    cancelAnimationFrame(gameLoopId);
    finalScoreEl.innerText = score;
    if(score > highScore) {
        highScore = score;
        GameUtils.storage.set('neonSnakeHighScore', highScore);
        highScoreEl.innerText = highScore;
    }
    document.getElementById('game-over-screen').style.display = 'flex';
}

// Input
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            queueInput({x: 0, y: -1});
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            queueInput({x: 0, y: 1});
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            queueInput({x: -1, y: 0});
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            queueInput({x: 1, y: 0});
            break;
        case ' ':
            if(energy > 10) {
                    isDashing = true; 
                    playSound('dash');
            }
            break;
    }
});

document.addEventListener('keyup', (e) => {
    if(e.key === ' ') {
        isDashing = false;
    }
});

// Touch controls for mobile (Simple swipes)
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    e.preventDefault();
});

canvas.addEventListener('touchend', e => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    
    if(Math.abs(dx) > Math.abs(dy)) {
        if(dx > 0) queueInput({x: 1, y: 0});
        else queueInput({x: -1, y: 0});
    } else {
        if(dy > 0) queueInput({x: 0, y: 1});
        else queueInput({x: 0, y: -1});
    }
    e.preventDefault();
});

// Helper for Input Queue
function queueInput(newVel) {
    // Determine the velocity to check against
    const lastVel = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : velocity;
    
    // Prevent 180 degree turns
    if (newVel.x !== 0 && lastVel.x === -newVel.x) return;
    if (newVel.y !== 0 && lastVel.y === -newVel.y) return;
    
    // Limit queue size to prevent massive input lag
    if (inputQueue.length >= 2) return;

    inputQueue.push(newVel);
}

// Helper for D-Pad
function setDir(dx, dy) {
    queueInput({x: dx, y: dy});
}

function startDash() { 
    if(energy > 10) {
        isDashing = true; 
        playSound('dash');
    }
}
function endDash() { isDashing = false; }

// Setup Mobile Controls
function setupBtn(id, startFn, endFn) {
    const btn = document.getElementById(id);
    if(!btn) return;
    
    const handleStart = (e) => {
        e.preventDefault(); // Prevent ghost clicks
        startFn();
    };
    
    btn.addEventListener('touchstart', handleStart, {passive: false});
    btn.addEventListener('mousedown', handleStart);
    
    if (endFn) {
        const handleEnd = (e) => {
            e.preventDefault();
            endFn();
        };
        btn.addEventListener('touchend', handleEnd, {passive: false});
        btn.addEventListener('mouseup', handleEnd);
        btn.addEventListener('mouseleave', handleEnd);
    }
}

setupBtn('btn-up', () => setDir(0, -1));
setupBtn('btn-down', () => setDir(0, 1));
setupBtn('btn-left', () => setDir(-1, 0));
setupBtn('btn-right', () => setDir(1, 0));
setupBtn('btn-dash', startDash, endDash);
