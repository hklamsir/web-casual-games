/**
 * 霓虹防線 (Neon Defense) - 塔防策略遊戲
 * Tower Defense Game with Cyberpunk Neon Aesthetics
 */

// ===== 遊戲配置 =====
const CONFIG = {
    GRID_SIZE: 12,
    CELL_SIZE: 0, // 動態計算
    FPS: 60,
    INITIAL_ENERGY: 150,
    INITIAL_LIVES: 20,
    WAVE_DELAY: 2000, // 波次間隔 (ms)
};

// ===== 防禦塔配置 =====
const TOWER_TYPES = {
    laser: {
        name: '雷射塔',
        cost: 50,
        range: 3,
        damage: 15,
        fireRate: 8, // 幀數間隔
        color: '#00f5ff',
        projectileSpeed: 8,
        description: '快速射擊，單體傷害'
    },
    blaster: {
        name: '爆破塔',
        cost: 100,
        range: 2.5,
        damage: 30,
        fireRate: 45,
        splashRadius: 1.5,
        color: '#ff00ff',
        projectileSpeed: 5,
        description: '範圍傷害，濺射攻擊'
    },
    slow: {
        name: '減速塔',
        cost: 75,
        range: 2.5,
        damage: 0,
        fireRate: 30,
        slowFactor: 0.5,
        slowDuration: 120, // 幀數
        color: '#00ff88',
        description: '減慢敵人速度'
    },
    sniper: {
        name: '狙擊塔',
        cost: 150,
        range: 5,
        damage: 80,
        fireRate: 90,
        color: '#ffdd00',
        projectileSpeed: 15,
        description: '超遠射程，高傷害'
    }
};

// ===== 敵人配置 =====
const ENEMY_TYPES = {
    normal: {
        name: '普通單位',
        hp: 40,
        speed: 1.5,
        reward: 10,
        color: '#00ff88',
        radius: 0.35
    },
    fast: {
        name: '快速單位',
        hp: 25,
        speed: 2.5,
        reward: 12,
        color: '#ff4444',
        radius: 0.3
    },
    tank: {
        name: '裝甲單位',
        hp: 100,
        speed: 0.8,
        reward: 20,
        color: '#ffaa00',
        radius: 0.4
    },
    elite: {
        name: '精英單位',
        hp: 150,
        speed: 1.8,
        reward: 35,
        color: '#aa00ff',
        radius: 0.38
    }
};

// ===== 波次配置 =====
const WAVES = [
    { enemies: [{ type: 'normal', count: 5, interval: 60 }] },
    { enemies: [{ type: 'normal', count: 8, interval: 50 }] },
    { enemies: [{ type: 'normal', count: 5, interval: 50 }, { type: 'fast', count: 3, interval: 40 }] },
    { enemies: [{ type: 'normal', count: 10, interval: 45 }, { type: 'tank', count: 2, interval: 80 }] },
    { enemies: [{ type: 'fast', count: 8, interval: 35 }] },
    { enemies: [{ type: 'normal', count: 8, interval: 40 }, { type: 'tank', count: 3, interval: 70 }, { type: 'fast', count: 4, interval: 35 }] },
    { enemies: [{ type: 'tank', count: 5, interval: 60 }, { type: 'elite', count: 1, interval: 100 }] },
    { enemies: [{ type: 'elite', count: 3, interval: 80 }, { type: 'fast', count: 10, interval: 30 }] },
    { enemies: [{ type: 'normal', count: 15, interval: 30 }, { type: 'tank', count: 5, interval: 60 }, { type: 'elite', count: 2, interval: 90 }] },
    { enemies: [{ type: 'elite', count: 5, interval: 70 }, { type: 'tank', count: 8, interval: 55 }] }
];

// ===== 遊戲狀態 =====
const state = {
    energy: CONFIG.INITIAL_ENERGY,
    lives: CONFIG.INITIAL_LIVES,
    wave: 1,
    isPlaying: false,
    isWaveActive: false,
    selectedTower: null,
    selectedTowerInstance: null,
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    waveEnemiesRemaining: 0,
    waveSpawnQueue: [],
    waveSpawnTimer: 0,
    gameOver: false,
    victory: false
};

// ===== 地圖路徑 (12x12 網格) =====
const MAP_PATH = [
    { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 },
    { x: 3, y: 3 }, { x: 3, y: 4 }, { x: 3, y: 5 },
    { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 },
    { x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 2 },
    { x: 7, y: 2 }, { x: 8, y: 2 }, { x: 9, y: 2 },
    { x: 9, y: 3 }, { x: 9, y: 4 }, { x: 9, y: 5 }, { x: 9, y: 6 },
    { x: 8, y: 6 }, { x: 7, y: 6 }, { x: 6, y: 6 },
    { x: 6, y: 7 }, { x: 6, y: 8 }, { x: 6, y: 9 },
    { x: 7, y: 9 }, { x: 8, y: 9 }, { x: 9, y: 9 },
    { x: 9, y: 10 }, { x: 10, y: 10 }, { x: 11, y: 10 }
];

// ===== 初始化 =====
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 事件綁定
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    
    document.querySelectorAll('.tower-card').forEach(card => {
        card.addEventListener('click', () => selectTowerType(card.dataset.tower));
    });
    
    document.getElementById('start-wave-btn').addEventListener('click', startWave);
    document.getElementById('menu-btn').addEventListener('click', showInstructions);
    document.getElementById('message-btn').addEventListener('click', startGame);
    document.getElementById('close-instruction-btn').addEventListener('click', hideInstructions);
    document.getElementById('close-upgrade-btn').addEventListener('click', closeUpgradePanel);
    document.getElementById('upgrade-btn').addEventListener('click', upgradeSelectedTower);
    document.getElementById('sell-btn').addEventListener('click', sellSelectedTower);
    
    updateUI();
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    const wrapper = document.getElementById('canvas-wrapper');
    const size = Math.min(wrapper.clientWidth, wrapper.clientHeight) - 20;
    canvas.width = size;
    canvas.height = size;
    CONFIG.CELL_SIZE = size / CONFIG.GRID_SIZE;
}

// ===== 遊戲循環 =====
let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    if (state.isPlaying && !state.gameOver) {
        update(deltaTime);
    }
    
    render();
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    // 生成敵人
    if (state.isWaveActive) {
        updateWaveSpawning();
    }
    
    // 更新敵人
    updateEnemies();
    
    // 更新防禦塔
    updateTowers();
    
    // 更新投射物
    updateProjectiles();
    
    // 更新粒子效果
    updateParticles();
    
    // 檢查波次結束
    if (state.isWaveActive && state.waveEnemiesRemaining === 0 && state.enemies.length === 0) {
        endWave();
    }
    
    // 檢查遊戲結束
    if (state.lives <= 0 && !state.gameOver) {
        gameOver();
    }
}

// ===== 波次系統 =====
function startWave() {
    if (state.isWaveActive || state.gameOver) return;
    
    const waveConfig = WAVES[Math.min(state.wave - 1, WAVES.length - 1)];
    state.waveSpawnQueue = [];
    
    // 建立生成隊列
    let spawnDelay = 0;
    waveConfig.enemies.forEach(group => {
        for (let i = 0; i < group.count; i++) {
            state.waveSpawnQueue.push({
                type: group.type,
                delay: spawnDelay
            });
            spawnDelay += group.interval;
        }
    });
    
    state.waveEnemiesRemaining = state.waveSpawnQueue.length;
    state.isWaveActive = true;
    state.waveSpawnTimer = 0;
    
    document.getElementById('start-wave-btn').disabled = true;
    document.getElementById('start-wave-btn').textContent = '波次進行中...';
}

function updateWaveSpawning() {
    state.waveSpawnTimer++;
    
    while (state.waveSpawnQueue.length > 0 && state.waveSpawnQueue[0].delay <= 0) {
        const enemyConfig = state.waveSpawnQueue.shift();
        spawnEnemy(enemyConfig.type);
    }
    
    // 減少延遲
    state.waveSpawnQueue.forEach(item => item.delay--);
}

function spawnEnemy(type) {
    const config = ENEMY_TYPES[type];
    const startPos = gridToPixel(MAP_PATH[0].x, MAP_PATH[0].y);
    
    state.enemies.push({
        type: type,
        x: startPos.x,
        y: startPos.y,
        hp: config.hp * (1 + (state.wave - 1) * 0.2), // 隨波次增加血量
        maxHp: config.hp * (1 + (state.wave - 1) * 0.2),
        speed: config.speed,
        baseSpeed: config.speed,
        color: config.color,
        radius: config.radius,
        reward: config.reward,
        pathIndex: 0,
        slowTimer: 0,
        effects: []
    });
}

function endWave() {
    state.isWaveActive = false;
    
    if (state.wave >= WAVES.length) {
        victory();
        return;
    }
    
    state.wave++;
    state.energy += 50 + state.wave * 10; // 波次獎勵
    
    document.getElementById('start-wave-btn').disabled = false;
    document.getElementById('start-wave-btn').textContent = '開始波次';
    updateUI();
}

// ===== 敵人更新 =====
function updateEnemies() {
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];
        
        // 減速效果
        let currentSpeed = enemy.speed;
        if (enemy.slowTimer > 0) {
            currentSpeed *= 0.5;
            enemy.slowTimer--;
        }
        
        // 沿著路徑移動
        const targetCell = MAP_PATH[enemy.pathIndex + 1];
        if (!targetCell) {
            // 到達終點
            state.lives--;
            state.enemies.splice(i, 1);
            updateUI();
            createParticles(enemy.x, enemy.y, '#ff3366', 10);
            continue;
        }
        
        const targetPos = gridToPixel(targetCell.x, targetCell.y);
        const dx = targetPos.x - enemy.x;
        const dy = targetPos.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < currentSpeed) {
            enemy.pathIndex++;
            if (enemy.pathIndex >= MAP_PATH.length - 1) {
                state.lives--;
                state.enemies.splice(i, 1);
                updateUI();
                createParticles(enemy.x, enemy.y, '#ff3366', 10);
            }
        } else {
            enemy.x += (dx / dist) * currentSpeed;
            enemy.y += (dy / dist) * currentSpeed;
        }
        
        // 檢查死亡
        if (enemy.hp <= 0) {
            state.energy += enemy.reward;
            createParticles(enemy.x, enemy.y, enemy.color, 15);
            state.enemies.splice(i, 1);
            updateUI();
        }
    }
}

// ===== 防禦塔更新 =====
function updateTowers() {
    state.towers.forEach(tower => {
        tower.cooldown--;
        
        if (tower.cooldown <= 0) {
            const target = findTarget(tower);
            if (target) {
                fireTower(tower, target);
                tower.cooldown = tower.fireRate;
            }
        }
    });
}

function findTarget(tower) {
    const rangePx = tower.range * CONFIG.CELL_SIZE;
    let closestEnemy = null;
    let maxProgress = -1;
    
    for (const enemy of state.enemies) {
        const dx = enemy.x - tower.x;
        const dy = enemy.y - tower.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= rangePx + enemy.radius * CONFIG.CELL_SIZE) {
            // 優先攻擊路徑進度最高的敵人
            if (enemy.pathIndex > maxProgress) {
                maxProgress = enemy.pathIndex;
                closestEnemy = enemy;
            }
        }
    }
    
    return closestEnemy;
}

function fireTower(tower, target) {
    const config = TOWER_TYPES[tower.type];
    
    if (tower.type === 'slow') {
        // 減速塔直接生效
        target.slowTimer = config.slowDuration;
        createParticles(target.x, target.y, config.color, 5);
    } else {
        // 發射投射物
        state.projectiles.push({
            x: tower.x,
            y: tower.y,
            target: target,
            damage: tower.damage,
            speed: config.projectileSpeed,
            color: config.color,
            type: tower.type,
            splashRadius: config.splashRadius || 0
        });
    }
    
    // 發射特效
    createParticles(tower.x, tower.y, config.color, 3);
}

// ===== 投射物更新 =====
function updateProjectiles() {
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const proj = state.projectiles[i];
        
        // 如果目標已死亡，移除投射物
        if (!state.enemies.includes(proj.target)) {
            state.projectiles.splice(i, 1);
            continue;
        }
        
        const dx = proj.target.x - proj.x;
        const dy = proj.target.y - proj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < proj.speed) {
            // 命中
            if (proj.splashRadius > 0) {
                // 範圍傷害
                applySplashDamage(proj.target.x, proj.target.y, proj.splashRadius * CONFIG.CELL_SIZE, proj.damage);
                createParticles(proj.target.x, proj.target.y, proj.color, 20);
            } else {
                // 單體傷害
                proj.target.hp -= proj.damage;
                createParticles(proj.target.x, proj.target.y, proj.color, 8);
            }
            state.projectiles.splice(i, 1);
        } else {
            proj.x += (dx / dist) * proj.speed;
            proj.y += (dy / dist) * proj.speed;
        }
    }
}

function applySplashDamage(x, y, radius, damage) {
    state.enemies.forEach(enemy => {
        const dx = enemy.x - x;
        const dy = enemy.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= radius + enemy.radius * CONFIG.CELL_SIZE) {
            // 距離越遠傷害越低
            const damageMultiplier = 1 - (dist / radius) * 0.5;
            enemy.hp -= damage * damageMultiplier;
        }
    });
}

// ===== 粒子效果 =====
function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 1 + Math.random() * 2;
        state.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 30 + Math.random() * 20,
            color: color,
            size: 2 + Math.random() * 3
        });
    }
}

function updateParticles() {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.size *= 0.95;
        
        if (p.life <= 0) {
            state.particles.splice(i, 1);
        }
    }
}

// ===== 輸入處理 =====
function handleCanvasClick(e) {
    if (!state.isPlaying || state.gameOver) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    handleGridClick(x, y);
}

function handleTouch(e) {
    if (!state.isPlaying || state.gameOver) return;
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    handleGridClick(x, y);
}

function handleGridClick(x, y) {
    const cell = pixelToGrid(x, y);
    
    // 檢查是否點擊到現有防禦塔
    const clickedTower = state.towers.find(t => {
        const tCell = pixelToGrid(t.x, t.y);
        return tCell.x === cell.x && tCell.y === cell.y;
    });
    
    if (clickedTower) {
        showUpgradePanel(clickedTower);
        return;
    }
    
    // 關閉升級面板
    closeUpgradePanel();
    
    // 嘗試放置新防禦塔
    if (state.selectedTower) {
        placeTower(cell.x, cell.y, state.selectedTower);
    }
}

function selectTowerType(type) {
    if (state.selectedTower === type) {
        state.selectedTower = null;
    } else {
        state.selectedTower = type;
    }
    
    // 更新UI
    document.querySelectorAll('.tower-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.tower === state.selectedTower);
    });
    
    closeUpgradePanel();
}

function placeTower(gridX, gridY, type) {
    // 檢查位置是否有效
    if (!isValidPlacement(gridX, gridY)) return;
    
    const config = TOWER_TYPES[type];
    
    // 檢查能量
    if (state.energy < config.cost) {
        showMessage('能量不足！', '需要更多能量才能建造此防禦塔。');
        return;
    }
    
    // 扣除能量
    state.energy -= config.cost;
    
    // 創建防禦塔
    const pos = gridToPixel(gridX, gridY);
    state.towers.push({
        type: type,
        x: pos.x,
        y: pos.y,
        gridX: gridX,
        gridY: gridY,
        level: 1,
        damage: config.damage,
        range: config.range,
        fireRate: config.fireRate,
        cooldown: 0
    });
    
    // 建造特效
    createParticles(pos.x, pos.y, config.color, 20);
    
    // 取消選擇
    state.selectedTower = null;
    document.querySelectorAll('.tower-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    updateUI();
}

function isValidPlacement(x, y) {
    // 檢查邊界
    if (x < 0 || x >= CONFIG.GRID_SIZE || y < 0 || y >= CONFIG.GRID_SIZE) {
        return false;
    }
    
    // 檢查路徑
    for (const pathCell of MAP_PATH) {
        if (pathCell.x === x && pathCell.y === y) {
            return false;
        }
    }
    
    // 檢查是否有其他防禦塔
    for (const tower of state.towers) {
        if (tower.gridX === x && tower.gridY === y) {
            return false;
        }
    }
    
    return true;
}

// ===== 升級系統 =====
function showUpgradePanel(tower) {
    state.selectedTowerInstance = tower;
    const config = TOWER_TYPES[tower.type];
    const upgradeCost = Math.floor(config.cost * 0.8 * tower.level);
    const sellValue = Math.floor(config.cost * 0.5 * tower.level);
    
    const info = document.getElementById('upgrade-info');
    info.innerHTML = `
        <strong>${config.name} Lv.${tower.level}</strong><br>
        傷害: ${Math.floor(tower.damage)} | 射程: ${tower.range.toFixed(1)}<br>
        <span style="color: #ffdd00">升級費用: ${upgradeCost}💎</span><br>
        <span style="color: #ff3366">出售價值: ${sellValue}💎</span>
    `;
    
    document.getElementById('upgrade-btn').textContent = `升級 (${upgradeCost}💎)`;
    document.getElementById('upgrade-btn').disabled = state.energy < upgradeCost;
    document.getElementById('upgrade-panel').classList.remove('hidden');
}

function closeUpgradePanel() {
    state.selectedTowerInstance = null;
    document.getElementById('upgrade-panel').classList.add('hidden');
}

function upgradeSelectedTower() {
    if (!state.selectedTowerInstance) return;
    
    const tower = state.selectedTowerInstance;
    const config = TOWER_TYPES[tower.type];
    const upgradeCost = Math.floor(config.cost * 0.8 * tower.level);
    
    if (state.energy >= upgradeCost) {
        state.energy -= upgradeCost;
        tower.level++;
        tower.damage *= 1.5;
        tower.range *= 1.1;
        tower.fireRate = Math.max(5, Math.floor(tower.fireRate * 0.9));
        
        createParticles(tower.x, tower.y, '#ffdd00', 25);
        closeUpgradePanel();
        updateUI();
    }
}

function sellSelectedTower() {
    if (!state.selectedTowerInstance) return;
    
    const tower = state.selectedTowerInstance;
    const config = TOWER_TYPES[tower.type];
    const sellValue = Math.floor(config.cost * 0.5 * tower.level);
    
    state.energy += sellValue;
    
    // 移除防禦塔
    const index = state.towers.indexOf(tower);
    if (index > -1) {
        state.towers.splice(index, 1);
    }
    
    createParticles(tower.x, tower.y, '#ff3366', 15);
    closeUpgradePanel();
    updateUI();
}

// ===== 渲染 =====
function render() {
    // 清空畫布
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 繪製網格
    drawGrid();
    
    // 繪製路徑
    drawPath();
    
    // 繪製放置預覽
    if (state.selectedTower) {
        drawPlacementPreview();
    }
    
    // 繪製防禦塔
    state.towers.forEach(drawTower);
    
    // 繪製敵人
    state.enemies.forEach(drawEnemy);
    
    // 繪製投射物
    state.projectiles.forEach(drawProjectile);
    
    // 繪製粒子
    state.particles.forEach(drawParticle);
    
    // 繪製選中防禦塔的範圍
    if (state.selectedTowerInstance) {
        drawRangeIndicator(state.selectedTowerInstance);
    }
}

function drawGrid() {
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= CONFIG.GRID_SIZE; i++) {
        const pos = i * CONFIG.CELL_SIZE;
        
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(canvas.width, pos);
        ctx.stroke();
    }
}

function drawPath() {
    // 繪製路徑背景
    ctx.fillStyle = 'rgba(22, 33, 62, 0.6)';
    
    MAP_PATH.forEach(cell => {
        const x = cell.x * CONFIG.CELL_SIZE;
        const y = cell.y * CONFIG.CELL_SIZE;
        ctx.fillRect(x + 2, y + 2, CONFIG.CELL_SIZE - 4, CONFIG.CELL_SIZE - 4);
    });
    
    // 繪製起點和終點
    const start = MAP_PATH[0];
    const end = MAP_PATH[MAP_PATH.length - 1];
    
    const startPos = gridToPixel(start.x, start.y);
    const endPos = gridToPixel(end.x, end.y);
    
    // 起點
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(startPos.x, startPos.y, CONFIG.CELL_SIZE * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // 終點 (核心)
    ctx.fillStyle = '#ff3366';
    ctx.shadowColor = '#ff3366';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(endPos.x, endPos.y, CONFIG.CELL_SIZE * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // 核心內圈
    ctx.fillStyle = '#ff6699';
    ctx.beginPath();
    ctx.arc(endPos.x, endPos.y, CONFIG.CELL_SIZE * 0.2, 0, Math.PI * 2);
    ctx.fill();
}

function drawTower(tower) {
    const config = TOWER_TYPES[tower.type];
    const size = CONFIG.CELL_SIZE * 0.35;
    
    // 底座
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, size, 0, Math.PI * 2);
    ctx.fill();
    
    // 塔身
    ctx.fillStyle = config.color;
    ctx.shadowColor = config.color;
    ctx.shadowBlur = 15;
    
    // 根據類型繪製不同形狀
    ctx.save();
    ctx.translate(tower.x, tower.y);
    
    switch (tower.type) {
        case 'laser':
            // 三角形
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size, size);
            ctx.lineTo(-size, size);
            ctx.closePath();
            ctx.fill();
            break;
        case 'blaster':
            // 方形
            ctx.fillRect(-size * 0.8, -size * 0.8, size * 1.6, size * 1.6);
            break;
        case 'slow':
            // 圓形
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            // 內圈
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'sniper':
            // 菱形
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size * 0.7, 0);
            ctx.lineTo(0, size);
            ctx.lineTo(-size * 0.7, 0);
            ctx.closePath();
            ctx.fill();
            break;
    }
    
    // 等級指示
    if (tower.level > 1) {
        ctx.fillStyle = '#ffdd00';
        ctx.font = `bold ${size * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tower.level, 0, 0);
    }
    
    ctx.restore();
    ctx.shadowBlur = 0;
}

function drawEnemy(enemy) {
    const size = CONFIG.CELL_SIZE * enemy.radius;
    
    // 敵人身體
    ctx.fillStyle = enemy.color;
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // 血條背景
    const barWidth = CONFIG.CELL_SIZE * 0.6;
    const barHeight = 4;
    const barX = enemy.x - barWidth / 2;
    const barY = enemy.y - size - 10;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // 血條
    const hpPercent = enemy.hp / enemy.maxHp;
    ctx.fillStyle = hpPercent > 0.5 ? '#00ff88' : hpPercent > 0.25 ? '#ffaa00' : '#ff3366';
    ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
    
    // 減速效果指示
    if (enemy.slowTimer > 0) {
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, size + 4, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawProjectile(proj) {
    ctx.fillStyle = proj.color;
    ctx.shadowColor = proj.color;
    ctx.shadowBlur = 10;
    
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawParticle(p) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 50;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

function drawPlacementPreview() {
    // 這個功能會在滑鼠移動時顯示，這裡簡化處理
}

function drawRangeIndicator(tower) {
    const rangePx = tower.range * CONFIG.CELL_SIZE;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, rangePx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
}

// ===== 工具函數 =====
function gridToPixel(gridX, gridY) {
    return {
        x: gridX * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
        y: gridY * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2
    };
}

function pixelToGrid(pixelX, pixelY) {
    return {
        x: Math.floor(pixelX / CONFIG.CELL_SIZE),
        y: Math.floor(pixelY / CONFIG.CELL_SIZE)
    };
}

// ===== UI 更新 =====
function updateUI() {
    document.getElementById('energy-display').textContent = Math.floor(state.energy);
    document.getElementById('lives-display').textContent = state.lives;
    document.getElementById('wave-display').textContent = `${state.wave}/${WAVES.length}`;
    
    // 更新塔卡片狀態
    document.querySelectorAll('.tower-card').forEach(card => {
        const type = card.dataset.tower;
        const cost = TOWER_TYPES[type].cost;
        card.classList.toggle('disabled', state.energy < cost);
    });
}

// ===== 遊戲狀態 =====
function startGame() {
    state.isPlaying = true;
    document.getElementById('message-overlay').classList.add('hidden');
}

function gameOver() {
    state.gameOver = true;
    showMessage('遊戲結束', `你抵擋了 ${state.wave - 1} 波敵人的進攻！\n剩餘能量: ${Math.floor(state.energy)}`);
    document.getElementById('message-btn').textContent = '重新開始';
    document.getElementById('message-btn').onclick = resetGame;
}

function victory() {
    state.victory = true;
    state.gameOver = true;
    showMessage('勝利！', '恭喜！你成功保衛了核心數據庫！\n所有波次已完成！');
    document.getElementById('message-btn').textContent = '再玩一次';
    document.getElementById('message-btn').onclick = resetGame;
}

function resetGame() {
    // 重置狀態
    state.energy = CONFIG.INITIAL_ENERGY;
    state.lives = CONFIG.INITIAL_LIVES;
    state.wave = 1;
    state.isPlaying = true;
    state.isWaveActive = false;
    state.gameOver = false;
    state.victory = false;
    state.towers = [];
    state.enemies = [];
    state.projectiles = [];
    state.particles = [];
    state.waveEnemiesRemaining = 0;
    state.waveSpawnQueue = [];
    state.selectedTower = null;
    state.selectedTowerInstance = null;
    
    document.getElementById('start-wave-btn').disabled = false;
    document.getElementById('start-wave-btn').textContent = '開始波次';
    document.getElementById('message-overlay').classList.add('hidden');
    document.getElementById('message-btn').textContent = '開始遊戲';
    document.getElementById('message-btn').onclick = startGame;
    
    updateUI();
}

function showMessage(title, text) {
    document.getElementById('message-title').textContent = title;
    document.getElementById('message-text').textContent = text;
    document.getElementById('message-overlay').classList.remove('hidden');
}

function showInstructions() {
    document.getElementById('instruction-modal').classList.remove('hidden');
}

function hideInstructions() {
    document.getElementById('instruction-modal').classList.add('hidden');
    if (!state.isPlaying && !state.gameOver) {
        startGame();
    }
}

// ===== 啟動遊戲 =====
window.onload = init;
