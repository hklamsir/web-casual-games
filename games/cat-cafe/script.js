// Constants
const INCOME_INTERVAL = 60; // Seconds

// Game State
let game = {
    money: 0,
    clickValue: 1,
    autoIncome: 0,
    lastSaveTime: Date.now(),
    coffeeType: 1, // Store random coffee machine type
    items: {
        'coffee_machine': { name: '高級咖啡機', cost: 15, income: 0, clickBonus: 1, icon: '⚙️', desc: '點擊收益 +1' },
        'stray_cat': { name: '收留流浪貓', cost: 50, income: 2, clickBonus: 0, icon: '🐱', desc: '每分鐘收益 +2' }, 
        'cat_toy': { name: '貓抓板', cost: 200, income: 5, clickBonus: 0, icon: '🧶', desc: '每分鐘收益 +5' }, 
        'barista': { name: '雇用店員', cost: 1000, income: 20, clickBonus: 0, icon: '👱‍♀️', desc: '每分鐘收益 +20' } 
    },
    owned: {
        'coffee_machine': 0,
        'stray_cat': 0,
        'cat_toy': 0,
        'barista': 0
    }
};

// DOM Elements
const moneyEl = document.getElementById('money');
const clickBtn = document.getElementById('clickBtn');
const shopList = document.getElementById('shopList');
const catArea = document.getElementById('catArea');
const offlineModal = document.getElementById('offlineModal');
const offlineEarningsEl = document.getElementById('offlineEarnings');

// Init
loadGame();
renderShop();
updateShopState();
updateSceneItems();
requestAnimationFrame(gameLoop);

setInterval(saveGame, 10000);
window.addEventListener('beforeunload', () => { saveGame(); });
window.addEventListener('pagehide', () => { saveGame(); }); // iOS support

function exitGame() {
    saveGame();
    window.location.href = '../../index.html';
}

function showInfo() {
    document.getElementById('infoModal').style.display = 'flex';
}

function resetGame() {
    if(confirm("確定要重置遊戲進度嗎？所有貓咪和升級都會消失喔！")) {
        GameUtils.storage.remove('catCafeSave');
        location.reload();
    }
}

// Click Event
function handleInteraction(e) {
    // Prevent default to avoid double-firing (touchstart -> click) and zooming
    if (e.cancelable) e.preventDefault();

    let clientX, clientY;
    if (e.type === 'touchstart') {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    addMoney(game.clickValue);
    createFloatingText(clientX, clientY, `+$${game.clickValue}`);
    clickBtn.style.transform = 'scale(0.95)';
    setTimeout(() => clickBtn.style.transform = 'scale(1)', 50);
    updateShopState(); // Check upgrades on manual click
}

clickBtn.addEventListener('mousedown', handleInteraction);
clickBtn.addEventListener('touchstart', handleInteraction, {passive: false});

function addMoney(amount) {
    game.money += amount;
    updateUI();
}

function createFloatingText(x, y, text) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.innerText = text;
    el.style.left = `${x - 20}px`;
    el.style.top = `${y - 40}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function buyItem(id) {
    const item = game.items[id];
    const currentCost = Math.floor(item.cost * Math.pow(1.15, game.owned[id]));

    if (game.money >= currentCost) {
        game.money -= currentCost;
        game.owned[id]++;
        
        // Special logic for first coffee machine purchase
        if (id === 'coffee_machine' && game.owned[id] === 1) {
            // Randomly select type 1, 2, or 3 only on first purchase
            game.coffeeType = Math.floor(Math.random() * 3) + 1;
        }
        
        // Update stats
        if (item.clickBonus > 0) game.clickValue += item.clickBonus;
        if (item.income > 0) game.autoIncome += item.income;

        // Visual Feedback
        if (id === 'stray_cat') {
            // Limit visual cats to avoid performance drop
            if (document.querySelectorAll('.cat').length < 15) spawnCat();
        }
        if (id === 'barista') {
            if (document.querySelectorAll('.staff').length < 5) spawnStaff();
        }

        updateSceneItems();
        updateUI();
        renderShop(); 
        updateShopState();
    }
}

function updateSceneItems() {
    // Coffee Machine
    const coffeeLevel = game.owned['coffee_machine'];
    const coffeeWrapper = document.getElementById('coffee-wrapper');
    const coffeeImg = document.getElementById('coffee-display');
    const coffeeBadge = document.getElementById('coffee-badge');

    if (coffeeLevel > 0) {
        // Always use the stored random type
        coffeeImg.src = `img/items/coffee_lv${game.coffeeType}.svg`;
        coffeeBadge.innerText = `Lv. ${coffeeLevel}`;
        coffeeWrapper.style.display = 'block';
    } else {
        coffeeWrapper.style.display = 'none';
    }

    // Scratcher logic remains...
    const scratcherLevel = game.owned['cat_toy'];
    const scratcherImg = document.getElementById('scratcher-display');
    if (scratcherLevel > 0) {
        const visLvl = Math.min(scratcherLevel, 3);
        scratcherImg.src = `img/items/scratcher_lv${visLvl}.svg`;
        scratcherImg.style.display = 'block';
    }
}

function spawnStaff() {
    const staff = document.createElement('img');
    staff.className = 'staff';
    staff.src = 'img/items/barista.svg';
    // Offset animation delay so they don't walk in perfect sync
    staff.style.animationDelay = `-${Math.random() * 10}s`;
    // Randomize starting position
    staff.style.left = `${10 + Math.random() * 30}%`;
    catArea.appendChild(staff);
}

// Create the DOM elements for the shop
function renderShop() {
    shopList.innerHTML = '';
    for (const [id, item] of Object.entries(game.items)) {
        const count = game.owned[id];
        const currentCost = Math.floor(item.cost * Math.pow(1.15, count));
        
        const div = document.createElement('div');
        div.className = 'upgrade-item';
        div.id = `shop-item-${id}`; // Add ID for easier updates
        div.onclick = () => buyItem(id);
        div.innerHTML = `
            <div style="font-size: 1.5rem; margin-right: 15px;">${item.icon}</div>
            <div class="item-info" style="flex:1">
                <h4>${item.name} <span style="font-size:0.8em; color:#bbb">Lv.${count}</span></h4>
                <p>${item.desc}</p>
            </div>
            <div class="item-cost">$${currentCost}</div>
        `;
        shopList.appendChild(div);
    }
    updateShopState();
}

// Light/Darken buttons based on money (Performance optimized)
function updateShopState() {
    for (const [id, item] of Object.entries(game.items)) {
        const count = game.owned[id];
        const currentCost = Math.floor(item.cost * Math.pow(1.15, count));
        const el = document.getElementById(`shop-item-${id}`);
        
        if (el) {
            if (game.money >= currentCost) {
                el.classList.remove('disabled');
            } else {
                el.classList.add('disabled');
            }
        }
    }
}

function spawnCat() {
    const cat = document.createElement('img');
    cat.className = 'cat';
    
    // Randomly select one of our cat SVGs
    const types = ['cat_orange.svg', 'cat_black.svg', 'cat_white.svg'];
    const type = types[Math.floor(Math.random() * types.length)];
    cat.src = `img/cats/${type}`;
    
    // Random position but keep within container width
    const leftPos = 10 + Math.random() * 80; 
    cat.style.left = `${leftPos}%`;
    
    cat.style.animationDelay = `${Math.random() * 2}s`;
    catArea.appendChild(cat);
}

// Game Loop (Modified for 15s interval)
let lastTime = Date.now();
let accumulator = 0;

function gameLoop() {
    const now = Date.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    if (game.autoIncome > 0) {
        accumulator += dt;
        if (accumulator >= INCOME_INTERVAL) {
            // Give income every 15 seconds
            const cycles = Math.floor(accumulator / INCOME_INTERVAL);
            addMoney(game.autoIncome * cycles);
            createFloatingText(450, 300, `+$${game.autoIncome * cycles}`); // Show center float text
            accumulator -= cycles * INCOME_INTERVAL;
            updateShopState();
        }
    }
    
    requestAnimationFrame(gameLoop);
}

function updateUI() {
    moneyEl.innerText = Math.floor(game.money);
}

function saveGame() {
    game.lastSaveTime = Date.now(); // Record time
    GameUtils.storage.setJSON('catCafeSave', game);
}

function loadGame() {
    const data = GameUtils.storage.getJSON('catCafeSave');
    if (data) {
        game = { ...game, ...data, items: game.items }; 
        
        // Ensure coffeeType exists for old saves
        if (!game.coffeeType) game.coffeeType = 1;

        game.clickValue = 1;
        game.autoIncome = 0;
        
        // Restore visuals
        for(let i=0; i<game.owned['stray_cat']; i++) if(i < 10) spawnCat();
        for(let i=0; i<game.owned['barista']; i++) if(i < 5) spawnStaff(); // Limit visual staff

        for (const [id, count] of Object.entries(game.owned)) {
            if (game.items[id].clickBonus) game.clickValue += game.items[id].clickBonus * count;
            if (game.items[id].income) game.autoIncome += game.items[id].income * count;
        }

        // Calculate Offline Earnings (Adjusted for 15s interval)
        if (game.lastSaveTime) {
            const now = Date.now();
            const secondsOffline = (now - game.lastSaveTime) / 1000;
            if (secondsOffline > INCOME_INTERVAL && game.autoIncome > 0) { 
                // Income is now "per 15s", so divide seconds by 15
                const cycles = Math.floor(secondsOffline / INCOME_INTERVAL);
                const earnings = cycles * game.autoIncome;
                
                if (earnings > 0) {
                    addMoney(earnings);
                    offlineEarningsEl.innerText = earnings;
                    offlineModal.style.display = 'flex';
                }
            }
        }
    }
    updateUI();
}
