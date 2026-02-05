const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Fixed logical size (similar to space-invaders approach but square/flexible)
const GAME_WIDTH = 600;
const GAME_HEIGHT = 600;

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// Removed dynamic resize listener since we use CSS scaling
// function resize() { ... } 
// window.addEventListener('resize', resize);
// resize();

const scoreEl = document.getElementById('score-display');
const levelEl = document.getElementById('level-display');
const livesEl = document.getElementById('lives-display');
const startScreen = document.getElementById('start-screen');
const infoScreen = document.getElementById('info-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const infoBtn = document.getElementById('info-btn');
const closeInfoBtn = document.getElementById('close-info-btn');
const restartBtn = document.getElementById('restart-btn');

// Game Constants
const GRAVITY_FORCE = 0.6;
const SPEED_INITIAL = 5; // Reduced slightly for 600x600 scale
const OBSTACLE_WIDTH = 40;
const OBSTACLE_HEIGHT = 60; // Max height variation

// Game State
let isPlaying = false;
let score = 0;
let level = 1;
let lives = 3;
let speed = SPEED_INITIAL;
let frames = 0;
let gravityDir = 1; // 1 = down, -1 = up
let isInvincible = false;

// Entities
let player;
let obstacles = [];
let particles = [];

// Audio Context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'flip') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'gameover') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 1.0);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.linearRampToValueAtTime(0, now + 1.0);
        osc.start(now);
        osc.stop(now + 1.0);
    }
}

// Images
const playerImg = new Image();
playerImg.src = 'images/player.svg';

const obsImages = {
    'spike': new Image(),
    'block': new Image(),
    'tall': new Image(),
    'saw': new Image(),
    'pillar': new Image()
};
obsImages.spike.src = 'images/obstacle.svg';
obsImages.block.src = 'images/obstacle_block.svg';
obsImages.tall.src = 'images/obstacle_tall.svg';
obsImages.saw.src = 'images/obstacle_saw.svg';
obsImages.pillar.src = 'images/obstacle_tall.svg'; // Reuse tall graphic for now

class Player {
    constructor() {
        this.size = 50; 
        this.x = 100; // Fixed spawn x for 600w
        this.y = canvas.height / 2;
        this.vy = 0;
        this.trail = [];
        this.rotation = 0;
    }

    update() {
        // Apply gravity
        this.vy += GRAVITY_FORCE * gravityDir;
        this.y += this.vy;

        // Floor/Ceiling collision
        if (this.y + this.size > canvas.height) {
            this.y = canvas.height - this.size;
            this.vy = 0;
        } else if (this.y < 0) {
            this.y = 0;
            this.vy = 0;
        }
        
        // Rotation effect based on movement
        this.rotation += 0.1 * (speed / SPEED_INITIAL);

        // Trail effect
        if (frames % 3 === 0) {
            this.trail.push({ x: this.x, y: this.y, alpha: 0.5 });
        }
        this.trail.forEach(t => t.x -= speed);
        this.trail = this.trail.filter(t => t.x > -50 && t.alpha > 0);
    }

    draw() {
        // Draw Trail
        this.trail.forEach(t => {
            ctx.fillStyle = `rgba(0, 255, 255, ${t.alpha})`;
            ctx.beginPath();
            ctx.arc(t.x + this.size/2, t.y + this.size/2, this.size/3, 0, Math.PI*2);
            ctx.fill();
            t.alpha -= 0.05;
        });

        // Draw Player Image with Rotation
        ctx.save();
        ctx.translate(this.x + this.size/2, this.y + this.size/2);
        ctx.rotate(this.rotation);
        
        // Invincibility blink
        if (!isInvincible || Math.floor(Date.now() / 100) % 2 === 0) {
            if (playerImg.complete) {
                ctx.drawImage(playerImg, -this.size/2, -this.size/2, this.size, this.size);
            } else {
                ctx.fillStyle = '#00ffff';
                ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
            }
        }
        ctx.restore();
    }

    flip() {
        gravityDir *= -1;
        playSound('flip');
    }
}

class Obstacle {
    constructor() {
        this.x = canvas.width;
        this.marked = false;
        
        // Randomly select type
        const types = ['spike', 'block', 'tall', 'saw', 'pillar'];
        this.type = types[Math.floor(Math.random() * types.length)];
        
        const screenH = canvas.height;

        // Set dimensions based on type (optimized for 600x600)
        switch(this.type) {
            case 'spike':
                this.w = 40;
                this.h = 60;
                break;
            case 'block':
                this.w = 60;
                this.h = 80;
                break;
            case 'tall':
                this.w = 40;
                this.h = 180; // 30% of 600
                break;
            case 'saw':
                this.w = 60;
                this.h = 30;
                break;
            case 'pillar': // New tall obstacle
                this.w = 50;
                this.h = 240; // 40% of 600
                break;
        }

        // Randomly place on floor or ceiling
        this.isTop = Math.random() > 0.5;
        
        if (this.isTop) {
            this.y = 0;
        } else {
            this.y = canvas.height - this.h;
        }
    }

    update() {
        this.x -= speed;
    }

    draw() {
        ctx.save();
        
        // Center rotation/scale point
        ctx.translate(this.x + this.w/2, this.y + this.h/2);
        
        if (this.isTop) {
            ctx.scale(1, -1); // Flip vertically if on top
        }
        
        const img = obsImages[this.type];
        if (img && img.complete) {
            ctx.drawImage(img, -this.w/2, -this.h/2, this.w, this.h);
        } else {
            ctx.fillStyle = '#ff0055';
            ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
        }
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.02;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 4, 4);
        ctx.globalAlpha = 1.0;
    }
}

function init() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    player = new Player();
    obstacles = [];
    particles = [];
    score = 0;
    level = 1;
    lives = 3;
    speed = SPEED_INITIAL;
    gravityDir = 1;
    isInvincible = false;
    
    updateStats();
    
    isPlaying = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    loop();
}

function updateStats() {
    scoreEl.innerText = `分數: ${score}`;
    levelEl.innerText = `Level: ${level}`;
    livesEl.innerText = '❤️'.repeat(lives);
}

function spawnObstacle() {
    // Spawn rate depends on speed
    const spawnRate = Math.max(20, Math.floor(120 / (speed / SPEED_INITIAL)));
    
    if (frames % spawnRate === 0) {
        if (Math.random() > 0.3) {
            obstacles.push(new Obstacle());
        }
    }
}

function checkCollisions() {
    if (isInvincible) return;

    // Use a slightly smaller hitbox for better gameplay feel
    const hitboxPadding = 5;

    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        
        if (
            player.x + hitboxPadding < obs.x + obs.w - hitboxPadding &&
            player.x + player.size - hitboxPadding > obs.x + hitboxPadding &&
            player.y + hitboxPadding < obs.y + obs.h - hitboxPadding &&
            player.y + player.size - hitboxPadding > obs.y + hitboxPadding
        ) {
            handleHit(obs);
            return; // Handle one collision at a time
        }

        // Score
        if (!obs.marked && player.x > obs.x + obs.w) {
            score++;
            obs.marked = true;
            
            // Level up every 10 points
            if (score % 10 === 0) {
                level++;
                speed += 1;
                // Optional: Play level up sound
            }
            updateStats();
        }
    }
}

function handleHit(obs) {
    lives--;
    updateStats();
    playSound('hit');
    
    // Remove the obstacle that hit us
    const index = obstacles.indexOf(obs);
    if (index > -1) obstacles.splice(index, 1);

    // Explosion effect
    for(let i=0; i<15; i++) {
        particles.push(new Particle(player.x + player.size/2, player.y + player.size/2, '#ff0055'));
    }

    if (lives <= 0) {
        gameOver();
    } else {
        // Invincibility
        isInvincible = true;
        setTimeout(() => { isInvincible = false; }, 1500);
    }
}

function gameOver() {
    isPlaying = false;
    playSound('gameover');
    
    // Explosion effect
    for(let i=0; i<50; i++) {
        particles.push(new Particle(player.x + player.size/2, player.y + player.size/2, '#00ffff'));
    }
    
    finalScoreEl.innerText = score;
    gameOverScreen.classList.remove('hidden');
}

function loop() {
    // Clear screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background Grid (Cyber effect) with parallax feel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // Vertical lines moving
    const gridOffset = (frames * -speed * 0.5) % 50;
    for(let x = gridOffset; x < canvas.width; x += 50) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }
    
    // Horizontal lines static
    for(let y = 0; y < canvas.height; y += 50) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    if (isPlaying) {
        player.update();
        player.draw();

        spawnObstacle();

        obstacles.forEach((obs, index) => {
            obs.update();
            obs.draw();
            if (obs.x + obs.w < -100) obstacles.splice(index, 1);
        });

        checkCollisions();
        frames++;
        
        // Update particles
        particles.forEach((p, i) => {
            p.update();
            p.draw();
            if (p.life <= 0) particles.splice(i, 1);
        });
        
        requestAnimationFrame(loop);
    } else {
        // Draw particles even if game over
        particles.forEach((p, i) => {
            p.update();
            p.draw();
            if (p.life <= 0) particles.splice(i, 1);
        });
        if (particles.length > 0) requestAnimationFrame(loop);
    }
}

// Inputs
function handleInput(e) {
    if (e.type === 'keydown' && e.code !== 'Space' && e.code !== 'ArrowUp' && e.code !== 'ArrowDown') return;
    if (isPlaying) {
        player.flip();
    }
    // Prevent default scrolling for Space/Arrows
    if(e.type === 'keydown') e.preventDefault();
}

window.addEventListener('keydown', handleInput);
window.addEventListener('touchstart', (e) => {
    if(e.target.tagName !== 'BUTTON') {
        e.preventDefault(); // Prevent default touch actions like scroll/zoom
        handleInput(e);
    }
}, {passive: false});
window.addEventListener('mousedown', (e) => {
    if(e.target.tagName !== 'BUTTON') handleInput(e);
});

startBtn.addEventListener('click', init);
restartBtn.addEventListener('click', init);

infoBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    infoScreen.classList.remove('hidden');
});

closeInfoBtn.addEventListener('click', () => {
    infoScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
});

// Initial Render
// No resize function needed, fixed size
ctx.clearRect(0, 0, canvas.width, canvas.height);