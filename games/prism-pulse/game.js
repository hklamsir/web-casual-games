/**
 * Prism Pulse - Match-3 Collapse Game
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
        this.colors = ['#00f2ff', '#bc13fe', '#ff00ff', '#39ff14', '#fff200', '#ff4d4d'];
        this.tileSize = 0;
        this.margin = 4;
        
        // Game State
        this.grid = [];
        this.score = 0;
        this.level = 1;
        this.target = 1000;
        this.isAnimating = false;
        this.hintTimeout = null;
        this.combo = 0;
        this.comboTimeout = null;
        this.selectedTile = null;
        
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
                    yOffset: 0
                };
            }
        }
        // Ensure there's at least one move
        if (!this.hasValidMove()) {
            this.createGrid();
        }
    }

    setupEventListeners() {
        const handleInteraction = (e) => {
            if (this.isAnimating) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
            const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
            
            const col = Math.floor(x / (this.tileSize + this.margin));
            const row = Math.floor(y / (this.tileSize + this.margin));
            
            if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
                this.handleClick(row, col);
            }
        };

        this.canvas.addEventListener('mousedown', handleInteraction);
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleInteraction(e);
        }, { passive: false });

        document.getElementById('start-game-btn').onclick = () => {
            document.getElementById('instructions-modal').style.display = 'none';
        };

        document.getElementById('restart-btn').onclick = () => {
            this.resetGame();
            document.getElementById('game-over-modal').style.display = 'none';
        };

        document.getElementById('back-btn').onclick = () => {
            window.location.href = '../../index.html';
        };

        document.getElementById('hint-btn').onclick = () => {
            this.showHint();
        };
    }

    handleClick(row, col) {
        if (!this.grid[row][col]) return;

        if (!this.selectedTile) {
            this.selectedTile = { row, col };
            this.grid[row][col].scale = 1.2;
            this.draw();
        } else {
            const r1 = this.selectedTile.row;
            const c1 = this.selectedTile.col;
            const r2 = row;
            const c2 = col;

            // Check if adjacent
            const isAdjacent = (Math.abs(r1 - r2) === 1 && c1 === c2) || (Math.abs(c1 - c2) === 1 && r1 === r2);

            if (isAdjacent) {
                this.swapTiles(r1, c1, r2, c2);
            } else {
                // Deselect or select new tile
                this.grid[r1][c1].scale = 1;
                this.selectedTile = { row, col };
                this.grid[row][col].scale = 1.2;
                this.draw();
            }
        }
    }

    async swapTiles(r1, c1, r2, c2) {
        this.isAnimating = true;
        
        // Visual swap (simplified for now, just swap data and redraw)
        const temp = this.grid[r1][c1];
        this.grid[r1][c1] = this.grid[r2][c2];
        this.grid[r2][c2] = temp;
        
        this.grid[r1][c1].scale = 1;
        this.grid[r2][c2].scale = 1;
        this.selectedTile = null;
        this.draw();

        await this.delay(200);

        const match1 = this.findMatch(r1, c1);
        const match2 = this.findMatch(r2, c2);
        
        if (match1.length >= 3 || match2.length >= 3) {
            this.combo = 1;
            const fullMatch = [...new Set([...match1, ...match2].map(p => JSON.stringify(p)))].map(s => JSON.parse(s));
            this.processMatch(fullMatch);
        } else {
            // Swap back if no match
            await this.delay(100);
            const tempBack = this.grid[r1][c1];
            this.grid[r1][c1] = this.grid[r2][c2];
            this.grid[r2][c2] = tempBack;
            this.draw();
            this.isAnimating = false;
        }
    }

    findMatch(row, col) {
        if (!this.grid[row][col]) return [];
        const colorIndex = this.grid[row][col].colorIndex;
        
        // Match-3 Style: Vertical and Horizontal check
        let horizontalMatch = [[row, col]];
        let verticalMatch = [[row, col]];

        // Check horizontal
        for (let c = col - 1; c >= 0; c--) {
            if (this.grid[row][c] && this.grid[row][c].colorIndex === colorIndex) horizontalMatch.push([row, c]);
            else break;
        }
        for (let c = col + 1; c < this.cols; c++) {
            if (this.grid[row][c] && this.grid[row][c].colorIndex === colorIndex) horizontalMatch.push([row, c]);
            else break;
        }

        // Check vertical
        for (let r = row - 1; r >= 0; r--) {
            if (this.grid[r][col] && this.grid[r][col].colorIndex === colorIndex) verticalMatch.push([r, col]);
            else break;
        }
        for (let r = row + 1; r < this.rows; r++) {
            if (this.grid[r][col] && this.grid[r][col].colorIndex === colorIndex) verticalMatch.push([r, col]);
            else break;
        }

        let finalMatch = [];
        if (horizontalMatch.length >= 3) finalMatch = finalMatch.concat(horizontalMatch);
        if (verticalMatch.length >= 3) finalMatch = finalMatch.concat(verticalMatch);

        // Remove duplicates if cross match
        return [...new Set(finalMatch.map(p => JSON.stringify(p)))].map(s => JSON.parse(s));
    }

    async processMatch(match) {
        this.isAnimating = true;
        
        // 1. Pop animation
        match.forEach(([r, c]) => {
            this.grid[r][c].isPopping = true;
        });
        
        const matchSize = match.length;
        const comboBonus = this.combo > 1 ? this.combo : 1;
        this.score += matchSize * matchSize * 10 * comboBonus;
        
        this.playPopSound(0.5 + (this.combo * 0.2));
        this.updateUI();

        await this.delay(200);

        // 2. Remove items and let others fall
        for (let c = 0; c < this.cols; c++) {
            let emptySpaces = 0;
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.grid[r][c] && this.grid[r][c].isPopping) {
                    emptySpaces++;
                    this.grid[r][c] = null;
                } else if (emptySpaces > 0 && this.grid[r][c]) {
                    const tile = this.grid[r][c];
                    this.grid[r + emptySpaces][c] = tile;
                    tile.yOffset = -emptySpaces * (this.tileSize + this.margin);
                    this.grid[r][c] = null;
                }
            }
            
            // Fill new tiles
            for (let r = 0; r < emptySpaces; r++) {
                this.grid[r][c] = {
                    colorIndex: Math.floor(Math.random() * this.colors.length),
                    isPopping: false,
                    scale: 1,
                    yOffset: -emptySpaces * (this.tileSize + this.margin)
                };
            }
        }

        this.animateFall();
    }

    animateFall() {
        const step = () => {
            let finished = true;
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    const tile = this.grid[r][c];
                    if (tile && tile.yOffset < 0) {
                        tile.yOffset += 15;
                        if (tile.yOffset > 0) tile.yOffset = 0;
                        finished = false;
                    }
                }
            }
            this.draw();
            if (!finished) {
                requestAnimationFrame(step);
            } else {
                this.checkAutoMatch();
            }
        };
        requestAnimationFrame(step);
    }

    async checkAutoMatch() {
        let hasMatch = false;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.grid[r][c]) continue;
                const match = this.findMatch(r, c);
                if (match.length >= 3) {
                    this.combo++;
                    await this.processMatch(match);
                    hasMatch = true;
                    return; 
                }
            }
        }

        if (!hasMatch) {
            this.isAnimating = false;
            this.combo = 0;
            this.updateUI();
            this.checkLevelUp();
            if (!this.hasValidMove()) {
                this.reshuffle();
            }
        }
    }

    reshuffle() {
        // Simple reshuffle by recreating grid until a move exists
        this.createGrid();
        this.draw();
        // Show a brief message
        const comboEl = document.getElementById('combo-display');
        comboEl.innerText = "REFRESHING!";
        comboEl.style.opacity = '1';
        setTimeout(() => comboEl.style.opacity = '0', 1000);
    }

    hasValidMove() {
        // For Match-3 Swap: Check if any swap results in a match
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                // Try swap right
                if (c < this.cols - 1) {
                    if (this.testSwap(r, c, r, c + 1)) return true;
                }
                // Try swap down
                if (r < this.rows - 1) {
                    if (this.testSwap(r, c, r + 1, c)) return true;
                }
            }
        }
        return false;
    }

    testSwap(r1, c1, r2, c2) {
        // Temporary swap
        const temp = this.grid[r1][c1];
        this.grid[r1][c1] = this.grid[r2][c2];
        this.grid[r2][c2] = temp;

        const isMatch = this.findMatch(r1, c1).length >= 3 || this.findMatch(r2, c2).length >= 3;

        // Swap back
        const tempBack = this.grid[r1][c1];
        this.grid[r1][c1] = this.grid[r2][c2];
        this.grid[r2][c2] = tempBack;

        return isMatch;
    }

    checkLevelUp() {
        if (this.score >= this.target) {
            this.level++;
            this.target += 2000 + (this.level * 1000);
            this.updateUI();
            // Optional: level up animation
        }
    }

    gameOver() {
        document.getElementById('final-score').innerText = this.score;
        document.getElementById('final-level').innerText = this.level;
        document.getElementById('game-over-modal').style.display = 'flex';
    }

    resetGame() {
        this.score = 0;
        this.level = 1;
        this.target = 1000;
        this.createGrid();
        this.updateUI();
        this.draw();
    }

    showHint() {
        if (this.isAnimating) return;
        
        let bestMatch = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const match = this.findMatch(r, c);
                if (match.length > bestMatch.length) {
                    bestMatch = match;
                }
            }
        }

        if (bestMatch.length >= 3) {
            bestMatch.forEach(([r, c]) => {
                this.grid[r][c].scale = 1.1;
            });
            this.draw();
            setTimeout(() => {
                bestMatch.forEach(([r, c]) => {
                    if (this.grid[r][c]) this.grid[r][c].scale = 1;
                });
                this.draw();
            }, 500);
        }
    }

    updateUI() {
        this.scoreDisplay.innerText = this.score;
        this.levelDisplay.innerText = this.level;
        this.targetDisplay.innerText = this.target;
        
        const comboEl = document.getElementById('combo-display');
        if (this.combo > 1) {
            comboEl.innerText = `${this.combo} COMBO!`;
            comboEl.style.opacity = '1';
        } else {
            comboEl.style.opacity = '0';
        }
    }

    draw() {
        if (!this.grid || this.grid.length === 0) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.grid[r][c];
                if (!tile) continue;

                const x = c * (this.tileSize + this.margin) + this.margin;
                const y = r * (this.tileSize + this.margin) + this.margin + tile.yOffset;
                
                if (tile.isPopping) {
                    tile.scale -= 0.1;
                    if (tile.scale < 0) tile.scale = 0;
                }

                this.drawTile(x, y, tile.colorIndex, tile.scale);
            }
        }
    }

    drawTile(x, y, colorIndex, scale) {
        const size = this.tileSize * scale;
        const offset = (this.tileSize - size) / 2;
        
        const color = this.colors[colorIndex];
        
        this.ctx.save();
        this.ctx.translate(x + offset, y + offset);
        
        // Draw main body
        this.ctx.fillStyle = color;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = color;
        
        // Hexagon shape
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const px = (size / 2) + (size / 2) * Math.cos(angle);
            const py = (size / 2) + (size / 2) * Math.sin(angle);
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        this.ctx.fill();
        
        // Shine effect
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.moveTo(size * 0.2, size * 0.3);
        this.ctx.lineTo(size * 0.5, size * 0.2);
        this.ctx.lineTo(size * 0.3, size * 0.5);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Start game
window.onload = () => {
    new PrismPulse();
};
