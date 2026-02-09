/**
 * Prism Pulse - Match-3 Swap Game
 * Author: OpenClaw (Xiaoxin)
 */

class PrismPulse {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreDisplay = document.getElementById('score-val');
        this.levelDisplay = document.getElementById('level-val');
        this.targetDisplay = document.getElementById('target-val');
        
        // Game Settings
        this.rows = 8;
        this.cols = 8;
        this.colors = ['#00f2ff', '#bc13fe', '#ff00ff', '#39ff14', '#fff200'];
        this.tileSize = 0;
        this.margin = 4;
        
        // Game State
        this.grid = [];
        this.score = 0;
        this.level = 1;
        this.target = 1000;
        this.isAnimating = false;
        this.combo = 0;
        this.selectedTile = null;
        this.dragData = null; // { startRow, startCol, currentRow, currentCol, offsetX, offsetY }
        
        this.initAudio();
        this.init();
    }

    initAudio() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playPopSound(pitch = 1) {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440 * pitch, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, this.audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.2);
    }

    playSpecialSound() {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, this.audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, this.audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.3);
    }

    init() {
        this.createGrid();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupEventListeners();
        this.updateUI();
        this.draw();
    }

    resize() {
        const container = document.getElementById('board-container');
        const size = Math.min(container.clientWidth, container.clientHeight);
        this.canvas.width = size;
        this.canvas.height = size;
        this.tileSize = (size - (this.margin * (this.cols + 1))) / this.cols;
        this.draw();
    }

    createGrid() {
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c] = {
                    colorIndex: Math.floor(Math.random() * this.colors.length),
                    isPopping: false,
                    scale: 1,
                    yOffset: 0,
                    type: 'normal' // 'normal', 'row', 'col', 'color'
                };
            }
        }
        if (!this.hasValidMove()) this.createGrid();
    }

    setupEventListeners() {
        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const x = clientX - rect.left;
            const y = clientY - rect.top;
            return {
                x, y,
                col: Math.floor(x / (this.tileSize + this.margin)),
                row: Math.floor(y / (this.tileSize + this.margin))
            };
        };

        const handleStart = (e) => {
            if (this.isAnimating) return;
            const pos = getPos(e);
            if (pos.row >= 0 && pos.row < this.rows && pos.col >= 0 && pos.col < this.cols) {
                const tile = this.grid[pos.row][pos.col];
                if (tile.type !== 'normal') {
                    this.triggerItem(pos.row, pos.col);
                    return;
                }
                this.dragData = {
                    startRow: pos.row,
                    startCol: pos.col,
                    startX: pos.x,
                    startY: pos.y,
                    offsetX: 0,
                    offsetY: 0,
                    targetRow: pos.row,
                    targetCol: pos.col
                };
            }
        };

        const handleMove = (e) => {
            if (!this.dragData) return;
            const pos = getPos(e);
            let dx = pos.x - this.dragData.startX;
            let dy = pos.y - this.dragData.startY;

            // Constrain to one axis and max tileSize
            if (Math.abs(dx) > Math.abs(dy)) {
                dy = 0;
                dx = Math.max(-this.tileSize, Math.min(this.tileSize, dx));
            } else {
                dx = 0;
                dy = Math.max(-this.tileSize, Math.min(this.tileSize, dy));
            }

            this.dragData.offsetX = dx;
            this.dragData.offsetY = dy;

            // Determine target neighbor
            let tr = this.dragData.startRow;
            let tc = this.dragData.startCol;
            if (dx > this.tileSize * 0.5) tc++;
            else if (dx < -this.tileSize * 0.5) tc--;
            else if (dy > this.tileSize * 0.5) tr++;
            else if (dy < -this.tileSize * 0.5) tr--;

            if (tr >= 0 && tr < this.rows && tc >= 0 && tc < this.cols && (tr !== this.dragData.startRow || tc !== this.dragData.startCol)) {
                this.dragData.targetRow = tr;
                this.dragData.targetCol = tc;
            } else {
                this.dragData.targetRow = this.dragData.startRow;
                this.dragData.targetCol = this.dragData.startCol;
            }

            this.draw();
        };

        const handleEnd = () => {
            if (!this.dragData) return;
            const { startRow, startCol, targetRow, targetCol } = this.dragData;
            const dData = this.dragData;
            this.dragData = null;

            if (targetRow !== startRow || targetCol !== startCol) {
                this.swapTiles(startRow, startCol, targetRow, targetCol);
            } else {
                this.draw();
            }
        };

        this.canvas.addEventListener('mousedown', handleStart);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleStart(e); }, { passive: false });
        window.addEventListener('touchmove', (e) => { handleMove(e); });
        window.addEventListener('touchend', handleEnd);

        document.getElementById('start-game-btn').onclick = () => {
            document.getElementById('instructions-modal').style.display = 'none';
        };
        document.getElementById('restart-btn').onclick = () => {
            this.resetGame();
            document.getElementById('game-over-modal').style.display = 'none';
        };
        document.getElementById('back-btn').onclick = () => { window.location.href = '../../index.html'; };
        document.getElementById('hint-btn').onclick = () => { this.showHint(); };
    }

    async swapTiles(r1, c1, r2, c2) {
        this.isAnimating = true;
        const temp = this.grid[r1][c1];
        this.grid[r1][c1] = this.grid[r2][c2];
        this.grid[r2][c2] = temp;
        this.draw();
        await this.delay(150);

        const m1 = this.findMatch(r1, c1);
        const m2 = this.findMatch(r2, c2);
        if (m1.length >= 3 || m2.length >= 3) {
            this.combo = 1;
            const fullMatch = [...new Set([...m1, ...m2].map(p => JSON.stringify(p)))].map(s => JSON.parse(s));
            this.processMatch(fullMatch);
        } else {
            const tempBack = this.grid[r1][c1];
            this.grid[r1][c1] = this.grid[r2][c2];
            this.grid[r2][c2] = tempBack;
            this.draw();
            this.isAnimating = false;
        }
    }

    async triggerItem(r, c) {
        this.isAnimating = true;
        const tile = this.grid[r][c];
        let toPop = [];

        if (tile.type === 'row') {
            for (let i = 0; i < this.cols; i++) toPop.push([r, i]);
        } else if (tile.type === 'col') {
            for (let i = 0; i < this.rows; i++) toPop.push([i, c]);
        } else if (tile.type === 'color') {
            this.showColorSelector(tile.colorIndex, r, c);
            return;
        }
        
        this.playSpecialSound();
        this.processMatch(toPop);
    }

    showColorSelector(defaultColorIndex, r, c) {
        // Create a temporary overlay for color selection
        const container = document.getElementById('board-container');
        const overlay = document.createElement('div');
        overlay.id = 'color-selector-overlay';
        overlay.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; display:flex; flex-wrap:wrap; justify-content:center; align-items:center; background:rgba(0,0,0,0.7); z-index:50; border-radius:10px; padding:20px; gap:15px;';
        
        const title = document.createElement('div');
        title.innerText = "選擇要消除的顏色";
        title.style.cssText = 'width:100%; text-align:center; font-family:Orbitron; color:white; font-size:1.2rem; margin-bottom:10px;';
        overlay.appendChild(title);

        this.colors.forEach((color, index) => {
            const btn = document.createElement('div');
            btn.style.cssText = `width:60px; height:60px; background:${color}; border-radius:50%; cursor:pointer; box-shadow:0 0 15px ${color}; border:3px solid white; transition:transform 0.2s;`;
            btn.onclick = () => {
                const toPop = [];
                for (let row = 0; row < this.rows; row++) {
                    for (let col = 0; col < this.cols; col++) {
                        if (this.grid[row][col] && this.grid[row][col].colorIndex === index) toPop.push([row, col]);
                    }
                }
                // Also pop the item itself
                toPop.push([r, c]);
                
                this.playSpecialSound();
                this.processMatch(toPop);
                overlay.remove();
            };
            btn.onmouseenter = () => btn.style.transform = 'scale(1.1)';
            btn.onmouseleave = () => btn.style.transform = 'scale(1)';
            overlay.appendChild(btn);
        });

        container.appendChild(overlay);
    }

    findMatch(row, col) {
        if (!this.grid[row][col]) return [];
        const colorIndex = this.grid[row][col].colorIndex;
        let h = [[row, col]], v = [[row, col]];
        for (let c = col - 1; c >= 0; c--) { if (this.grid[row][c] && this.grid[row][c].colorIndex === colorIndex) h.push([row, c]); else break; }
        for (let c = col + 1; c < this.cols; c++) { if (this.grid[row][c] && this.grid[row][c].colorIndex === colorIndex) h.push([row, c]); else break; }
        for (let r = row - 1; r >= 0; r--) { if (this.grid[r][col] && this.grid[r][col].colorIndex === colorIndex) v.push([r, col]); else break; }
        for (let r = row + 1; r < this.rows; r++) { if (this.grid[r][col] && this.grid[r][col].colorIndex === colorIndex) v.push([r, col]); else break; }
        let res = [];
        if (h.length >= 3) res = res.concat(h);
        if (v.length >= 3) res = res.concat(v);
        return [...new Set(res.map(p => JSON.stringify(p)))].map(s => JSON.parse(s));
    }

    async processMatch(match) {
        this.isAnimating = true;
        let createdItem = null;
        
        // 1. Identify match center (most likely the moved tile or central tile)
        // For simplicity, we use the first coordinate as the creation point
        if (this.combo === 1) {
            if (match.length === 4) {
                const [r, c] = match[0];
                createdItem = { r, c, type: Math.random() > 0.5 ? 'row' : 'col', colorIndex: this.grid[r][c].colorIndex };
            } else if (match.length >= 5) {
                const [r, c] = match[0];
                createdItem = { r, c, type: 'color', colorIndex: this.grid[r][c].colorIndex };
            }
        }

        match.forEach(([r, c]) => { 
            if (this.grid[r][c]) {
                this.grid[r][c].isPopping = true; 
                // Don't pop the tile that will become an item
                if (createdItem && r === createdItem.r && c === createdItem.c) {
                    this.grid[r][c].isPopping = false;
                }
            }
        });

        this.score += match.length * match.length * 10 * (this.combo || 1);
        this.playPopSound(0.5 + (this.combo * 0.2));
        this.updateUI();
        await this.delay(200);

        for (let c = 0; c < this.cols; c++) {
            let empty = 0;
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.grid[r][c] && this.grid[r][c].isPopping) {
                    empty++;
                    this.grid[r][c] = null;
                } else if (this.grid[r][c]) {
                    if (empty > 0) {
                        this.grid[r + empty][c] = this.grid[r][c];
                        this.grid[r + empty][c].yOffset = -empty * (this.tileSize + this.margin);
                        this.grid[r][c] = null;
                    }
                }
            }
            for (let r = 0; r < empty; r++) {
                this.grid[r][c] = { colorIndex: Math.floor(Math.random() * this.colors.length), isPopping: false, scale: 1, yOffset: -empty * (this.tileSize + this.margin), type: 'normal' };
            }
        }

        if (createdItem) {
            const { r, c, type, colorIndex } = createdItem;
            // Find where the non-popped tile landed after physics
            // Or just place it at the top if it was destroyed (logic safety)
            for (let row = this.rows - 1; row >= 0; row--) {
                if (this.grid[row][c] && !this.grid[row][c].isPopping && this.grid[row][c].colorIndex === colorIndex) {
                    this.grid[row][c].type = type;
                    break;
                }
            }
        }

        this.animateFall();
    }

    animateFall() {
        const step = () => {
            let finished = true;
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    const t = this.grid[r][c];
                    if (t && t.yOffset < 0) { t.yOffset += 15; if (t.yOffset > 0) t.yOffset = 0; finished = false; }
                }
            }
            this.draw();
            if (!finished) requestAnimationFrame(step);
            else this.checkAutoMatch();
        };
        requestAnimationFrame(step);
    }

    async checkAutoMatch() {
        let hasMatch = false;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.grid[r][c] || this.grid[r][c].type !== 'normal') continue;
                const m = this.findMatch(r, c);
                if (m.length >= 3) { this.combo++; await this.processMatch(m); hasMatch = true; return; }
            }
        }
        if (!hasMatch) {
            this.isAnimating = false;
            this.combo = 0;
            this.updateUI();
            this.checkLevelUp();
            if (!this.hasValidMove()) this.reshuffle();
        }
    }

    reshuffle() {
        this.createGrid(); this.draw();
        const el = document.getElementById('combo-display');
        el.innerText = "REFRESHING!"; el.style.opacity = '1';
        setTimeout(() => el.style.opacity = '0', 1000);
    }

    hasValidMove() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (c < this.cols - 1 && this.testSwap(r, c, r, c + 1)) return true;
                if (r < this.rows - 1 && this.testSwap(r, c, r + 1, c)) return true;
            }
        }
        return false;
    }

    testSwap(r1, c1, r2, c2) {
        const temp = this.grid[r1][c1]; this.grid[r1][c1] = this.grid[r2][c2]; this.grid[r2][c2] = temp;
        const res = this.findMatch(r1, c1).length >= 3 || this.findMatch(r2, c2).length >= 3;
        const tempB = this.grid[r1][c1]; this.grid[r1][c1] = this.grid[r2][c2]; this.grid[r2][c2] = tempB;
        return res;
    }

    checkLevelUp() { if (this.score >= this.target) { this.level++; this.target += 2000 + (this.level * 1000); this.updateUI(); } }
    gameOver() { document.getElementById('final-score').innerText = this.score; document.getElementById('final-level').innerText = this.level; document.getElementById('game-over-modal').style.display = 'flex'; }
    resetGame() { this.score = 0; this.level = 1; this.target = 1000; this.createGrid(); this.updateUI(); this.draw(); }

    showHint() {
        if (this.isAnimating) return;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (c < this.cols - 1 && this.testSwap(r, c, r, c + 1)) { this.flash(r, c, r, c + 1); return; }
                if (r < this.rows - 1 && this.testSwap(r, c, r + 1, c)) { this.flash(r, c, r + 1, c); return; }
            }
        }
    }

    flash(r1, c1, r2, c2) {
        this.grid[r1][c1].scale = 1.2; this.grid[r2][c2].scale = 1.2; this.draw();
        setTimeout(() => { if (this.grid[r1][c1]) this.grid[r1][c1].scale = 1; if (this.grid[r2][c2]) this.grid[r2][c2].scale = 1; this.draw(); }, 500);
    }

    updateUI() {
        this.scoreDisplay.innerText = this.score;
        this.levelDisplay.innerText = this.level;
        this.targetDisplay.innerText = this.target;
        const el = document.getElementById('combo-display');
        if (this.combo > 1) { el.innerText = `${this.combo} COMBO!`; el.style.opacity = '1'; }
        else el.style.opacity = '0';
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const t = this.grid[r][c];
                if (!t || (this.dragData && this.dragData.startRow === r && this.dragData.startCol === c)) continue;
                
                // If it's the target of a swap, shift it
                let ox = 0, oy = 0;
                if (this.dragData && this.dragData.targetRow === r && this.dragData.targetCol === c) {
                    ox = -this.dragData.offsetX;
                    oy = -this.dragData.offsetY;
                }

                this.drawTile(c * (this.tileSize + this.margin) + this.margin + ox, r * (this.tileSize + this.margin) + this.margin + t.yOffset + oy, t);
            }
        }
        // Draw dragging tile last
        if (this.dragData) {
            const t = this.grid[this.dragData.startRow][this.dragData.startCol];
            this.drawTile(this.dragData.startCol * (this.tileSize + this.margin) + this.margin + this.dragData.offsetX, this.dragData.startRow * (this.tileSize + this.margin) + this.margin + this.dragData.offsetY, t);
        }
    }

    drawTile(x, y, tile) {
        const size = this.tileSize * tile.scale;
        const color = this.colors[tile.colorIndex];
        this.ctx.save();
        this.ctx.translate(x + (this.tileSize - size) / 2, y + (this.tileSize - size) / 2);
        this.ctx.fillStyle = color;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = color;
        
        // Draw Hexagon
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i;
            const px = (size / 2) + (size / 2) * Math.cos(a);
            const py = (size / 2) + (size / 2) * Math.sin(a);
            if (i === 0) this.ctx.moveTo(px, py); else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        this.ctx.fill();

        // Icon for special items
        if (tile.type !== 'normal') {
            this.ctx.fillStyle = 'white';
            this.ctx.font = `bold ${size * 0.5}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            let icon = '';
            if (tile.type === 'row') icon = '↔';
            else if (tile.type === 'col') icon = '↕';
            else if (tile.type === 'color') icon = '★';
            this.ctx.fillText(icon, size / 2, size / 2);
        }

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.beginPath();
        this.ctx.moveTo(size * 0.2, size * 0.3);
        this.ctx.lineTo(size * 0.5, size * 0.2);
        this.ctx.lineTo(size * 0.3, size * 0.5);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
    }

    delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}

window.onload = () => { new PrismPulse(); };
