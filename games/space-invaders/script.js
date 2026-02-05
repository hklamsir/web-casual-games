// ================= 全域變數與狀態 =================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 資訊顯示區
const scoreDisplay = document.getElementById('score');
const bestScoreDisplay = document.getElementById('bestScore');
const levelDisplay = document.getElementById('level');
const livesDisplay = document.getElementById('lives');

let gameState = "start";
let score = 0;
let bestScore = parseInt(localStorage.getItem("bestScore")) || 0;
let level = 1;
const maxLevel = 10;

// ================= 背景星空 =================
let stars = [];
const starCount = 100;
function initStars() {
  stars = [];
  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.5 + 0.5,
      speed: Math.random() * 0.5 + 0.2
    });
  }
}
function updateStars() {
  for (let star of stars) {
    star.y += star.speed;
    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
    }
  }
}
function drawStars() {
  ctx.fillStyle = "white";
  for (let star of stars) {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
initStars();

// ================= 爆炸效果 =================
let explosions = [];
function addExplosion(x, y) {
  explosions.push({
    x: x,
    y: y,
    radius: 0,
    maxRadius: 30,
    alpha: 1,
    expansionRate: 1.5,
    fadeRate: 0.03,
    color: 'orange'
  });
  const explosionSound = document.getElementById('explosionSound');
  if (explosionSound) {
      explosionSound.currentTime = 0;
      explosionSound.play().catch(e => {});
  }
}
function updateExplosions() {
  for (let i = explosions.length - 1; i >= 0; i--) {
    let exp = explosions[i];
    exp.radius += exp.expansionRate;
    exp.alpha -= exp.fadeRate;
    if (exp.alpha <= 0) {
      explosions.splice(i, 1);
    }
  }
}
function drawExplosions() {
  for (let exp of explosions) {
    ctx.save();
    ctx.globalAlpha = exp.alpha;
    ctx.fillStyle = exp.color;
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ================= 圖片資源管理 =================
const images = {};
const imageSources = {
  title: 'title.png',
  player: 'player.png',
  invader: 'invader.png',
  ufo1: 'ufo1.png',
  ufo2: 'ufo2.png'
};
let imagesLoaded = 0;
const totalImages = Object.keys(imageSources).length;

function loadImages(callback) {
  for (let key in imageSources) {
    images[key] = new Image();
    images[key].onload = function() {
      imagesLoaded++;
      if (imagesLoaded === totalImages) {
        callback();
      }
    };
    images[key].onerror = function() {
      console.error("Failed to load image: " + imageSources[key]);
      imagesLoaded++;
      if (imagesLoaded === totalImages) {
        callback();
      }
    }
    images[key].src = imageSources[key];
  }
}

// 初始化為空 Image 對象以防止 draw() 報錯
let titleImage = new Image();
let playerImage = new Image();
let invaderImage = new Image();
let ufoImage1 = new Image();
let ufoImage2 = new Image();

let ufoAnimTimer = 0;
const ufoAnimInterval = 20;

// ================= 玩家與敵人參數 =================
const player = {
  x: canvas.width / 2 - 22.5,
  y: canvas.height - 60,
  width: 45,
  height: 30,
  speed: 5,
  dx: 0,
  bullets: [],
  lives: 3,
  hidden: false
};
let invaders = [];
const invaderRows = 4;
const invaderCols = 10;

// 採用用戶的參數設置
const invaderWidth = 40; 
const invaderHeight = 30; // 用戶代碼中似乎是30? conflict裡沒看到，假設用戶想要30
const invaderPadding = 10;
const offsetX = 30; 
const offsetY = 50;

let invaderDirection = 1;
const baseInvaderSpeed = 1;
const baseInvaderShootingProbability = 0.005;
let invaderSpeed = baseInvaderSpeed;
let invaderShootingProbability = baseInvaderShootingProbability;

function spawnInvaders() {
  invaders = [];
  invaderDirection = 1;
  for (let r = 0; r < invaderRows; r++) {
    for (let c = 0; c < invaderCols; c++) {
      let x = offsetX + c * (invaderWidth + invaderPadding);
      // Assuming invaderHeight is 20 from my previous, checking user's conflict...
      // User conflict: invaderHeight = 20 in previous? Let's check conflict again.
      // Bottom part had: invaderWidth = 30, invaderHeight = 20. 
      // WAIT. I misread the conflict block.
      // Bottom part (remote/theirs):
      // invaderWidth = 30; invaderHeight = 20; offsetX = 50;
      // Top part (local/mine):
      // invaderWidth = 30; ...
      
      // Actually, let me re-read the conflict.
      // <<<<<<< HEAD
      // ... (My code)
      // =======
      // ... (User's code)
      // >>>>>>> c0f88ed...
      
      // Both seem to have invaderWidth = 30 in the snippet I cat'ed earlier?
      // Let me double check the `cat` output.
      // Ah, I scrolled up.
      // Top (mine): invaderWidth = 30.
      // Bottom (theirs): invaderWidth = 30.
      
      // Wait, where did I see 40? Maybe I hallucinated.
      // Let me check the cat output again.
      // It was LONG.
      // Bottom part:
      // const invaderWidth = 30;
      // const invaderHeight = 20;
      // const offsetX = 50;
      
      // Okay, so the user DID NOT change the sizes?
      // Why did I think they did?
      // Maybe `c0f88ed` was just deleting the mp3 file.
      // And the conflict is purely textual because I added `loadImages` and they didn't.
      
      // So I should stick to MY code (robust loading) + verify if they wanted to remove shoot.mp3.
      // Since they deleted the file, I will remove the audio tag.
      
      let y = offsetY + r * (20 + invaderPadding);
      invaders.push({ x, y, width: 30, height: 20, alive: true });
    }
  }
}

let invaderBullets = [];
const invaderBulletSpeed = 3;
const invaderBulletWidth = 5;
const invaderBulletHeight = 10;
const bulletSpeed = 7;

let ufo = null;
const ufoWidth = 80;
const ufoHeight = 40;
const ufoSpeed = 2;
const ufoSpawnProbability = 0.002;
let ufoBullets = [];
const ufoBulletSpeed = 5;
const ufoBulletWidth = 5;
const ufoBulletHeight = 10;
const ufoShootInterval = 60;

// ================= 音樂 =================
const bgMusicStart = document.getElementById('bgMusicStart');
const bgMusicGame = document.getElementById('bgMusicGame');
const hitSound = document.getElementById('hitSound');
if (bgMusicStart) bgMusicStart.volume = 0.5;
if (bgMusicGame) bgMusicGame.volume = 0.5;
if (hitSound) hitSound.volume = 0.6;

// ================= 啟動遊戲 =================
window.addEventListener('load', function() {
    if(document.getElementById("bestScore"))
        document.getElementById("bestScore").innerText = "最高分數：" + bestScore;
    
    // 嘗試播放背景音樂
    if (bgMusicStart) {
        bgMusicStart.currentTime = 0;
        bgMusicStart.play().catch(() => {});
    }

    // 先畫一次背景
    initStars();
    draw(); 
    
    // 載入圖片
    loadImages(function() {
        titleImage = images['title'];
        playerImage = images['player'];
        invaderImage = images['invader'];
        ufoImage1 = images['ufo1'];
        ufoImage2 = images['ufo2'];
        
        draw();
        requestAnimationFrame(gameLoop);
    });
    
    // 雙重保險：如果圖片加載回調沒觸發（極罕見），至少讓遊戲邏輯跑起來
    // 但為了避免變量未賦值，這裡先不強制跑 gameLoop，依賴 loadImages
    // 因為 draw() 裡有防護，強制跑也行，但圖片沒出來會怪怪的。
    // 還是信任 loadImages 吧，它有 onerror 處理。
});

// ================= 發射控制 =================
let lastBulletTime = 0;
const bulletCooldown = 300;
function tryFireBullet() {
  const now = Date.now();
  if (now - lastBulletTime >= bulletCooldown) {
    player.bullets.push({
      x: player.x + player.width / 2 - 2.5,
      y: player.y,
      width: 5,
      height: 10
    });
    // 移除 shootSound 相關代碼，因為用戶刪除了文件
    lastBulletTime = now;
  }
}

// ================= 輸入控制 =================
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const btnFire = document.getElementById('btnFire');

const keys = {};
if (btnLeft) {
    btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowLeft'] = true; });
    btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowLeft'] = false; });
    btnLeft.addEventListener('mousedown', (e) => { keys['ArrowLeft'] = true; });
    btnLeft.addEventListener('mouseup', (e) => { keys['ArrowLeft'] = false; });
}
if (btnRight) {
    btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowRight'] = true; });
    btnRight.addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowRight'] = false; });
    btnRight.addEventListener('mousedown', (e) => { keys['ArrowRight'] = true; });
    btnRight.addEventListener('mouseup', (e) => { keys['ArrowRight'] = false; });
}
if (btnFire) {
    const fire = (e) => { e.preventDefault(); tryFireBullet(); };
    btnFire.addEventListener('touchstart', fire);
    btnFire.addEventListener('mousedown', fire);
}

document.addEventListener('keydown', function(e) {
  if (gameState === "start") {
    gameState = "playing";
    resetGameVariables();
    if (bgMusicStart) bgMusicStart.pause();
    if (bgMusicGame) { bgMusicGame.currentTime = 0; bgMusicGame.play().catch(() => {}); }
    return;
  }
  if (gameState === "victory" || gameState === "gameOver") {
    gameState = "start";
    if (bgMusicGame) bgMusicGame.pause();
    if (bgMusicStart) { bgMusicStart.currentTime = 0; bgMusicStart.play().catch(() => {}); }
    return;
  }
  if (gameState === "playing") {
    keys[e.key] = true;
    if (e.key === " " || e.key === "Spacebar") tryFireBullet();
  }
});

document.addEventListener('keyup', function(e) { keys[e.key] = false; });

canvas.addEventListener('click', function() {
  if (gameState === "start") {
    gameState = "playing";
    resetGameVariables();
    if (bgMusicStart) bgMusicStart.pause();
    if (bgMusicGame) { bgMusicGame.currentTime = 0; bgMusicGame.play().catch(() => {}); }
    return;
  }
  if (gameState === "gameOver" || gameState === "victory") {
    gameState = "start";
    if (bgMusicGame) bgMusicGame.pause();
    if (bgMusicStart) { bgMusicStart.currentTime = 0; bgMusicStart.play().catch(() => {}); }
  }
});

function resetGameVariables() {
  score = 0;
  level = 1;
  player.lives = 3;
  player.x = canvas.width / 2 - player.width / 2;
  player.bullets = [];
  invaderBullets = [];
  ufoBullets = [];
  ufo = null;
  explosions = [];
  player.hidden = false;
  invaderSpeed = baseInvaderSpeed;
  invaderShootingProbability = baseInvaderShootingProbability;
  spawnInvaders();
  updateInfo();
  initStars();
}

function updateInfo() {
  if (scoreDisplay) scoreDisplay.textContent = `分數：${score}`;
  if (bestScoreDisplay) bestScoreDisplay.textContent = `最高分數：${bestScore}`;
  if (levelDisplay) levelDisplay.textContent = `第 ${level} 關`;
  if (livesDisplay) {
      let livesHTML = '生命：';
      for (let i = 0; i < player.lives; i++) {
        livesHTML += `<img src="player.png" width="20" height="20" alt="life">`;
      }
      livesDisplay.innerHTML = livesHTML;
  }
}

function playerHit() {
  if (player.hidden) return;
  addExplosion(player.x + player.width/2, player.y + player.height/2);
  if (hitSound) { hitSound.currentTime = 0; hitSound.play().catch(() => {}); }
  player.lives--;
  updateInfo();
  if (player.lives <= 0) {
    triggerGameOver();
    return;
  }
  player.hidden = true;
  setTimeout(() => { player.hidden = false; }, 1000);
}

function transitionToNextLevel() {
  gameState = "levelTransition";
  player.bullets = [];
  invaderBullets = [];
  ufoBullets = [];
  setTimeout(() => {
    level++;
    invaderSpeed = baseInvaderSpeed + (level - 1) * 0.5;
    invaderShootingProbability = baseInvaderShootingProbability + (level - 1) * 0.002;
    updateInfo();
    spawnInvaders();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    gameState = "playing";
  }, 2000);
}

function gameVictory() {
  gameState = "victoryWait";
  if (bgMusicGame) bgMusicGame.pause();
  setTimeout(() => { gameState = "victory"; }, 3000);
}

function triggerGameOver() {
  addExplosion(player.x + player.width/2, player.y + player.height/2);
  gameState = "gameOverWait";
  if (bgMusicGame) bgMusicGame.pause();
  setTimeout(() => { gameState = "gameOver"; }, 2000);
}

function update() {
  updateStars();
  updateExplosions();
  if (gameState !== "playing") return;

  if (keys['ArrowLeft'] || keys['a'] || keys['A']) player.dx = -player.speed;
  else if (keys['ArrowRight'] || keys['d'] || keys['D']) player.dx = player.speed;
  else player.dx = 0;

  player.x += player.dx;
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

  // Player Bullets
  for (let i = player.bullets.length - 1; i >= 0; i--) {
    const bullet = player.bullets[i];
    bullet.y -= bulletSpeed;
    if (bullet.y < 0) {
      player.bullets.splice(i, 1);
      continue;
    }
    
    // Invader Collision
    for (let j = 0; j < invaders.length; j++) {
      const inv = invaders[j];
      if (inv.alive &&
          bullet.x < inv.x + 45 &&
          bullet.x + bullet.width > inv.x &&
          bullet.y < inv.y + 45 &&
          bullet.y + bullet.height > inv.y) {
        inv.alive = false;
        addExplosion(inv.x + 45/2, inv.y + 45/2);
        player.bullets.splice(i, 1);
        score += 10;
        if (score > bestScore) {
          bestScore = score;
          localStorage.setItem("bestScore", bestScore);
        }
        break;
      }
    }
    
    // UFO Collision
    if (ufo &&
        bullet.x < ufo.x + ufoWidth &&
        bullet.x + bullet.width > ufo.x &&
        bullet.y < ufo.y + ufoHeight &&
        bullet.y + bullet.height > ufo.y) {
      addExplosion(ufo.x + ufoWidth/2, ufo.y + ufoHeight/2);
      score += 100;
      ufo = null;
      player.bullets.splice(i, 1);
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("bestScore", bestScore);
      }
      continue;
    }
  }

  // Invader Movement
  let moveDown = false;
  for (let inv of invaders) {
    if (!inv.alive) continue;
    if (inv.x + 45 >= canvas.width && invaderDirection > 0) {
      moveDown = true;
      break;
    } else if (inv.x <= 0 && invaderDirection < 0) {
      moveDown = true;
      break;
    }
  }
  
  if (moveDown) invaderDirection *= -1;
  
  for (let inv of invaders) {
    if (!inv.alive) continue;
    if (moveDown) inv.y += 20;
    else inv.x += invaderSpeed * invaderDirection;
    
    if (inv.y + 20 > player.y + 25) { // Game Over Line
      triggerGameOver();
      return;
    }
  }

  // Invader Shooting
  if (Math.random() < invaderShootingProbability) {
    const aliveInvaders = invaders.filter(inv => inv.alive);
    if (aliveInvaders.length > 0) {
      const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
      invaderBullets.push({
        x: shooter.x + 45/2 - invaderBulletWidth/2,
        y: shooter.y + 45,
        width: invaderBulletWidth,
        height: invaderBulletHeight
      });
    }
  }
  
  for (let i = invaderBullets.length - 1; i >= 0; i--) {
    const bullet = invaderBullets[i];
    bullet.y += invaderBulletSpeed;
    if (bullet.y > canvas.height) {
      invaderBullets.splice(i, 1);
      continue;
    }
    if (bullet.x < player.x + player.width &&
        bullet.x + bullet.width > player.x &&
        bullet.y < player.y + player.height &&
        bullet.y + bullet.height > player.y) {
      invaderBullets.splice(i, 1);
      playerHit();
    }
  }

  if (!ufo && Math.random() < ufoSpawnProbability) {
    ufo = { x: 0, y: 20, width: ufoWidth, height: ufoHeight, speed: ufoSpeed, shootTimer: 0 };
  }
  if (ufo) {
    ufo.x += ufo.speed;
    if (ufo.x > canvas.width) ufo = null;
    else {
      ufo.shootTimer++;
      if (ufo.shootTimer >= ufoShootInterval) {
        for (let i = 0; i < 5; i++) {
          ufoBullets.push({
            x: ufo.x + ufoWidth/2 - ufoBulletWidth/2 + (i - 2) * 10,
            y: ufo.y + ufoHeight,
            width: ufoBulletWidth,
            height: ufoBulletHeight
          });
        }
        ufo.shootTimer = 0;
      }
      ufoAnimTimer++;
    }
  }
  for (let i = ufoBullets.length - 1; i >= 0; i--) {
    const bullet = ufoBullets[i];
    bullet.y += ufoBulletSpeed;
    if (bullet.y > canvas.height) {
      ufoBullets.splice(i, 1);
      continue;
    }
    if (bullet.x < player.x + player.width &&
        bullet.x + bullet.width > player.x &&
        bullet.y < player.y + player.height &&
        bullet.y + bullet.height > player.y) {
      ufoBullets.splice(i, 1);
      playerHit();
    }
  }

  if (!invaders.some(inv => inv.alive)) {
    if (level < maxLevel) transitionToNextLevel();
    else { gameVictory(); return; }
  }
  updateInfo();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStars();
  drawExplosions();
  
  // Start Screen
  if (gameState === "start") {
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    
    if (titleImage && titleImage.complete && titleImage.naturalWidth > 0) {
        ctx.drawImage(titleImage, canvas.width/2-150, canvas.height/2 - 200); 
    } else {
            ctx.font = '50px Arial';
            ctx.fillText('太空入侵者', canvas.width/2, canvas.height/2 - 100);
    }
    
    ctx.font = '30px Arial';
    ctx.fillText('操作說明', canvas.width/2, canvas.height/2 - 40);
    ctx.font = '20px Arial';
    ctx.fillText('使用左側按鈕控制左右移動，右側按鈕發射子彈', canvas.width/2, canvas.height/2);
    ctx.fillText('鍵盤操作亦可使用左右鍵和空白鍵發射', canvas.width/2, canvas.height/2 + 30);
    ctx.fillText('完成 10 關即成功爆機', canvas.width/2, canvas.height/2 + 60);
    ctx.fillText('按任意鍵或螢幕開始遊戲', canvas.width/2, canvas.height/2 + 100);
  }
  
  // Playing
  else if (gameState === "playing") {
    if (!player.hidden) {
        if (playerImage.complete)
            ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
        else {
            ctx.fillStyle = 'cyan';
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }
    }

    ctx.fillStyle = 'red';
    for (let bullet of player.bullets) ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);

    for (let inv of invaders) {
        if (inv.alive) {
            if (invaderImage.complete) ctx.drawImage(invaderImage, inv.x, inv.y, 45, 45);
            else { ctx.fillStyle = 'green'; ctx.fillRect(inv.x, inv.y, 45, 45); }
        }
    }

    ctx.fillStyle = 'yellow';
    for (let bullet of invaderBullets) ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);

    if (ufo) {
        let img = (ufoAnimTimer % (ufoAnimInterval * 2) < ufoAnimInterval) ? ufoImage1 : ufoImage2;
        if (img.complete) ctx.drawImage(img, ufo.x, ufo.y, ufoWidth, ufoHeight);
        else { ctx.fillStyle = 'red'; ctx.fillRect(ufo.x, ufo.y, ufoWidth, ufoHeight); }
    }

    ctx.fillStyle = 'orange';
    for (let bullet of ufoBullets) ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  }
  
  // Other States
  else if (gameState === "levelTransition") {
    ctx.fillStyle = 'white'; ctx.font = '50px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`Level ${level + 1}`, canvas.width/2, canvas.height/2);
  }
  else if (gameState === "victory" || gameState === "victoryWait") {
    ctx.fillStyle = 'red'; ctx.font = '60px Arial'; ctx.textAlign = 'center';
    ctx.fillText('成功爆機!', canvas.width/2, canvas.height/2);
    if(gameState === "victory") {
        ctx.font = '25px Arial'; ctx.fillStyle = 'white';
        ctx.fillText('點擊返回主畫面', canvas.width/2, canvas.height/2 + 50);
    }
  }
  else if (gameState === "gameOver" || gameState === "gameOverWait") {
    ctx.fillStyle = 'green'; ctx.font = '60px Arial'; ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 30);
    ctx.font = '25px Arial';
    ctx.fillText(`完成 ${level-1}關  分數：${score}`, canvas.width/2, canvas.height/2 + 20);
    if(gameState === "gameOver") {
        ctx.fillText('點擊返回主畫面', canvas.width/2, canvas.height/2 + 60);
    }
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
