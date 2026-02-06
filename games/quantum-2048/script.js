document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.querySelector('.grid-container');
    const tileContainer = document.querySelector('.tile-container');
    const scoreElement = document.getElementById('score');
    const bestScoreElement = document.getElementById('best-score');
    const messageContainer = document.getElementById('game-message');
    const messageText = document.getElementById('message-text');
    const restartBtn = document.getElementById('restart-btn');
    const retryBtn = document.getElementById('retry-button');
    const guideBtn = document.getElementById('guide-btn');
    const guideModal = document.getElementById('guide-modal');
    const closeGuideBtn = document.getElementById('close-guide-btn');

    let grid = [];
    let score = 0;
    let bestScore = localStorage.getItem('quantum2048-best') || 0;
    bestScoreElement.textContent = bestScore;

    const gridSize = 4;
    let startX, startY, endX, endY;

    function initGame() {
        grid = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
        score = 0;
        updateScore(0);
        tileContainer.innerHTML = '';
        messageContainer.classList.remove('game-over');
        
        addRandomTile();
        addRandomTile();
        renderGrid();
    }

    function addRandomTile() {
        const availableCells = [];
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (!grid[r][c]) availableCells.push({ r, c });
            }
        }

        if (availableCells.length > 0) {
            const randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
            const value = Math.random() < 0.9 ? 2 : 4;
            const tile = {
                id: Date.now() + Math.random(),
                val: value,
                r: randomCell.r,
                c: randomCell.c,
                mergedFrom: null
            };
            grid[randomCell.r][randomCell.c] = tile;
            return tile;
        }
        return null;
    }

    function getTileClass(val) {
        return val <= 2048 ? `tile-${val}` : 'tile-super';
    }

    function renderGrid() {
        // We render entirely from scratch each time? 
        // No, for animations to work, we should keep DOM elements if ID matches.
        // But for simplicity in this version, we will clear and redraw.
        // Wait, clear and redraw kills animations.
        // Let's try to reuse elements.
        
        const existingTiles = Array.from(tileContainer.children);
        const activeIds = new Set();

        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const tile = grid[r][c];
                if (tile) {
                    activeIds.add(tile.id);
                    let tileEl = document.getElementById(`tile-${tile.id}`);
                    
                    if (!tileEl) {
                        tileEl = document.createElement('div');
                        tileEl.id = `tile-${tile.id}`;
                        tileEl.classList.add('tile');
                        tileEl.textContent = tile.val;
                        tileContainer.appendChild(tileEl);
                    }

                    // Update class for position
                    tileEl.className = `tile position-${r + 1}-${c + 1} ${getTileClass(tile.val)}`;
                    tileEl.textContent = tile.val;

                    if (tile.mergedFrom) {
                        // Handle merged animation if we were tracking it detailedly
                        // For now, simpler approach
                        tile.mergedFrom.forEach(merged => {
                             activeIds.add(merged.id);
                             const mergedEl = document.getElementById(`tile-${merged.id}`);
                             if (mergedEl) {
                                 mergedEl.className = `tile position-${r + 1}-${c + 1} ${getTileClass(merged.val)}`;
                                 // It will be removed at the end of loop because it's not in grid, 
                                 // but we added it to activeIds so it persists for this frame?
                                 // Actually, we want to remove it after animation.
                                 // Let's just remove logic for complex merge animations for now to ensure stability.
                                 // Clean up merged refs
                             }
                        });
                        tile.mergedFrom = null; // Clear
                    }
                }
            }
        }

        // Remove old tiles
        existingTiles.forEach(el => {
            const id = parseFloat(el.id.replace('tile-', ''));
            if (!activeIds.has(id)) {
                // If it was just merged, it might need a delay?
                // For this simple version, just remove.
                el.remove();
            }
        });
    }

    // Input Handling
    document.addEventListener('keydown', handleInput);
    
    // Touch Handling
    document.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: false });

    document.addEventListener('touchend', e => {
        if (!startX || !startY) return;
        endX = e.changedTouches[0].clientX;
        endY = e.changedTouches[0].clientY;

        const dx = endX - startX;
        const dy = endY - startY;

        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal
            if (Math.abs(dx) > 30) {
                if (dx > 0) move('right');
                else move('left');
            }
        } else {
            // Vertical
            if (Math.abs(dy) > 30) {
                if (dy > 0) move('down');
                else move('up');
            }
        }
        startX = null;
        startY = null;
    }, { passive: false });

    // Prevent scrolling when touching game container
    document.getElementById('game-container').addEventListener('touchmove', function(e) {
        e.preventDefault();
    }, { passive: false });

    function handleInput(e) {
        switch(e.key) {
            case 'ArrowUp': move('up'); break;
            case 'ArrowDown': move('down'); break;
            case 'ArrowLeft': move('left'); break;
            case 'ArrowRight': move('right'); break;
            default: return;
        }
        e.preventDefault();
    }

    function move(direction) {
        let moved = false;
        
        // Reset merged flags for this turn (simulated)
        // We need a way to prevent double merge in one slide
        const mergedMap = Array(gridSize).fill().map(() => Array(gridSize).fill(false));

        const traverse = (callback) => {
            if (direction === 'left' || direction === 'up') {
                for (let r = 0; r < gridSize; r++) {
                    for (let c = 0; c < gridSize; c++) {
                        callback(r, c);
                    }
                }
            } else {
                for (let r = gridSize - 1; r >= 0; r--) {
                    for (let c = gridSize - 1; c >= 0; c--) {
                        callback(r, c);
                    }
                }
            }
        };

        const getVector = () => {
            switch(direction) {
                case 'up': return { r: -1, c: 0 };
                case 'down': return { r: 1, c: 0 };
                case 'left': return { r: 0, c: -1 };
                case 'right': return { r: 0, c: 1 };
            }
        };

        const vector = getVector();

        traverse((r, c) => {
            if (!grid[r][c]) return;

            let tile = grid[r][c];
            let nextR = r;
            let nextC = c;

            // Find furthest position
            while (true) {
                let checkR = nextR + vector.r;
                let checkC = nextC + vector.c;

                if (checkR < 0 || checkR >= gridSize || checkC < 0 || checkC >= gridSize) break;
                
                let nextCell = grid[checkR][checkC];
                
                if (nextCell && !mergedMap[checkR][checkC] && nextCell.val === tile.val) {
                    // Merge
                    let mergedTile = {
                        id: nextCell.id, // Keep ID of target for stability, or update?
                        // Better: Create new ID or keep one. 
                        // Visual trick: Move current tile to target, then upgrade target.
                        val: tile.val * 2,
                        r: checkR,
                        c: checkC,
                        mergedFrom: [tile, nextCell] // Store for anim
                    };
                    
                    grid[checkR][checkC] = mergedTile;
                    grid[r][c] = null;
                    mergedMap[checkR][checkC] = true;
                    
                    updateScore(score + mergedTile.val);
                    moved = true;
                    return; // Done with this tile
                } else if (!nextCell) {
                    // Move into empty
                    nextR = checkR;
                    nextC = checkC;
                } else {
                    // Hit different tile or already merged
                    break;
                }
            }

            if (nextR !== r || nextC !== c) {
                grid[nextR][nextC] = tile;
                grid[r][c] = null;
                tile.r = nextR;
                tile.c = nextC;
                moved = true;
            }
        });

        if (moved) {
            renderGrid();
            setTimeout(() => {
                addRandomTile();
                renderGrid();
                if (checkGameOver()) {
                    messageText.textContent = 'Game Over!';
                    messageContainer.classList.add('game-over');
                }
            }, 150);
        }
    }

    function updateScore(newScore) {
        score = newScore;
        scoreElement.textContent = score;
        if (score > bestScore) {
            bestScore = score;
            bestScoreElement.textContent = bestScore;
            localStorage.setItem('quantum2048-best', bestScore);
        }
    }

    function checkGameOver() {
        // Check for empty cells
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (!grid[r][c]) return false;
            }
        }
        
        // Check for possible merges
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                let tile = grid[r][c];
                // Check right
                if (c < gridSize - 1 && grid[r][c+1].val === tile.val) return false;
                // Check down
                if (r < gridSize - 1 && grid[r+1][c].val === tile.val) return false;
            }
        }
        
        return true;
    }

    restartBtn.addEventListener('click', initGame);
    retryBtn.addEventListener('click', initGame);
    
    guideBtn.addEventListener('click', () => {
        guideModal.classList.remove('hidden');
    });
    
    closeGuideBtn.addEventListener('click', () => {
        guideModal.classList.add('hidden');
    });

    initGame();
});
