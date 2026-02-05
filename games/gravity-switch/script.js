const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreEl = document.getElementById('score-display');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game Constants
const GRAVITY_FORCE = 0.6;
const JUMP_FORCE = 0; // Not a jump, just gravity flip
const SPEED_INITIAL = 6;
const OBSTACLE_WIDTH = 40;
const OBSTACLE_HEIGHT = 60; // Max height variation

// Game State
let isPlaying = false;
let score = 0;
let speed = SPEED_INITIAL;
let frames = 0;
let gravityDir = 1; // 1 = down, -1 = up

// Entities
let player;
let obstacles = [];
let particles = [];

// Resize handling
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Player {
    constructor() {
        this.size = 30;
        this.x = canvas.width * 0.2;
        this.y = canvas.height / 2;
        this.vy = 0;
        this.color = '#00ffff';
        this.trail = [];
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

        // Trail effect
        if (frames % 3 === 0) {
            this.trail.push({ x: this.x, y: this.y, alpha: 0.5 });
        }
        this.trail.forEach(t => t.x -= speed);
        this.trail = this.trail.filter(t => t.x > 0 && t.alpha > 0);
    }

    draw() {
        // Draw Trail
        this.trail.forEach(t => {
            ctx.fillStyle = `rgba(0, 255, 255, ${t.alpha})`;
            ctx.fillRect(t.x, t.y, this.size, this.size);
            t.alpha -= 0.05;
        });

        // Draw Player
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.shadowBlur = 0;
    }

    flip() {
        gravityDir *= -1;
        // Optional: Add a small boost or reset velocity for snappier feel
        // this.vy = 0; 
    }
}

class Obstacle {
    constructor() {
        this.w = 40 + Math.random() * 30;
        this.h = 50 + Math.random() * 80;
        this.x = canvas.width;
        
        // Randomly place on floor or ceiling
        this.isTop = Math.random() > 0.5;
        
        if (this.isTop) {
            this.y = 0;
        } else {
            this.y = canvas.height - this.h;
        }
        
        this.marked = false;
    }

    update() {
        this.x -= speed;
    }

    draw() {
        ctx.fillStyle = '#ff0055';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0055';
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.shadowBlur = 0;
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
    player = new Player();
    obstacles = [];
    particles = [];
    score = 0;
    speed = SPEED_INITIAL;
    gravityDir = 1;
    scoreEl.innerText = '分數: 0';
    isPlaying = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    loop();
}

function spawnObstacle() {
    // Spawn rate depends on speed
    if (frames % Math.floor(1000 / speed) === 0) { // Rough spawn rate
        // Chance to spawn
        if (Math.random() > 0.3) {
            obstacles.push(new Obstacle());
        }
    }
}

function checkCollisions() {
    for (let obs of obstacles) {
        // AABB Collision
        if (
            player.x < obs.x + obs.w &&
            player.x + player.size > obs.x &&
            player.y < obs.y + obs.h &&
            player.y + player.size > obs.y
        ) {
            gameOver();
        }

        // Score
        if (!obs.marked && player.x > obs.x + obs.w) {
            score++;
            scoreEl.innerText = `分數: ${score}`;
            obs.marked = true;
            
            // Increase speed slightly
            if (score % 5 === 0) speed += 0.5;
        }
    }
}

function gameOver() {
    isPlaying = false;
    
    // Explosion effect
    for(let i=0; i<30; i++) {
        particles.push(new Particle(player.x + player.size/2, player.y + player.size/2, player.color));
    }
    
    finalScoreEl.innerText = score;
    gameOverScreen.classList.remove('hidden');
}

function loop() {
    // Clear screen
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Background Grid (Cyber effect)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let x = (frames * -speed) % 50; x < canvas.width; x += 50) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }
    ctx.stroke();

    if (isPlaying) {
        player.update();
        player.draw();

        spawnObstacle();

        obstacles.forEach((obs, index) => {
            obs.update();
            obs.draw();
            if (obs.x + obs.w < 0) obstacles.splice(index, 1);
        });

        checkCollisions();
        frames++;
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
    if(e.target.tagName !== 'BUTTON') handleInput(e);
});
window.addEventListener('mousedown', (e) => {
    if(e.target.tagName !== 'BUTTON') handleInput(e);
});

startBtn.addEventListener('click', init);
restartBtn.addEventListener('click', init);

// Initial Render
resize();
ctx.fillStyle = '#0f0f1a';
ctx.fillRect(0, 0, canvas.width, canvas.height);
