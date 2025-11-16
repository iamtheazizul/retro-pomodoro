// Check if current site is blocked
browser.runtime.sendMessage({
    action: 'checkIfBlocked',
    url: window.location.href
}).then(response => {
    console.log("response")
    if (response.blocked) {
        showOverlay();
    }
});


browser.runtime.onMessage.addListener((message, sender) => {
    console.log("content script got runtime message:", message);

    if (message.action === "showOverlay") {
        showOverlay();
    }
});



// call showOverlay() to open the Tetris overlay
function showOverlay() {
    // Prevent duplicate overlays
    if (document.getElementById('tetris-block-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'tetris-block-overlay';
    overlay.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

            #tetris-block-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(180deg,#061426 0%, #000 100%);
                z-index: 2147483647;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: 'Press Start 2P', 'Courier New', monospace;
                color: #fff;
            }

            #tetris-container {
                position: relative;
                width: 960px;
                max-width: 95%;
                display: grid;
                grid-template-columns: 500px 1fr;
                gap: 24px;
                align-items: start;
            }

            #tetris-canvas {
                width: 500px;
                height: 900px;
                background: #050814;
                border: 8px solid #222;
                image-rendering: pixelated;
                image-rendering: crisp-edges;
                image-rendering: -moz-crisp-edges;
            }

            #tetris-ui {
                color: #fff;
                min-width: 300px;
            }

            #tetris-title {
                text-align: center;
                font-size: 18px;
                margin-bottom: 12px;
            }

            .tetris-panel {
                background: rgba(255,255,255,0.03);
                border: 2px solid rgba(255,255,255,0.04);
                padding: 12px;
                margin-bottom: 12px;
                border-radius: 8px;
            }

            #tetris-next {
                display:flex;
                justify-content:center;
            }
            #tetris-next canvas {
                width: 160px;
                height: 160px;
                image-rendering: pixelated;
                image-rendering: crisp-edges;
                image-rendering: -moz-crisp-edges;
                background: transparent;
            }

            #tetris-score {
                font-size: 18px;
                text-align: center;
                margin-bottom: 6px;
            }

            #tetris-instructions {
                font-size: 18px;
                opacity: 0.9;
                line-height: 1.6;
            }

            #tetris-footer {
                margin-top: 10px;
                text-align:center;
                opacity:0.7;
                font-size:18px;
            }

            .ghost {
                opacity: 0.25;
            }
        </style>

        <div id="tetris-container">
            <div>
                <div id="tetris-title">TAKE A BREAK - PLAY SOME TETRIS</div>
                <canvas id="tetris-canvas" width="250" height="500" tabindex="0"></canvas>
            </div>

            <div id="tetris-ui">
                <div class="tetris-panel">
                    <div id="tetris-score">SCORE: 0</div>
                    <div id="tetris-level">LEVEL: 1</div>
                    <div id="tetris-lines">LINES: 0</div>
                </div>

                <div class="tetris-panel">
                    <div style="text-align:center; margin-bottom:6px;">NEXT</div>
                    <div id="tetris-next"><canvas id="tetris-next-canvas" width="80" height="80"></canvas></div>
                </div>

                <div class="tetris-panel">
                    <div style="text-align:center; margin-bottom:6px;">CONTROLS</div>
                    <div id="tetris-instructions">
                        ← → : Move<br>
                        ↑ / X / Z : Rotate<br>
                        ↓ : Soft drop<br>
                        Space : Hard drop<br>
                        C : Hold (swap)
                    </div>
                </div>

                <div id="tetris-footer"></div>
            </div>
        </div>
    `;

    document.documentElement.appendChild(overlay);
    initTetris();
}

function initTetris() {
    // Canvas and scale
    const canvas = document.getElementById('tetris-canvas');
    const ctx = canvas.getContext('2d');
    // we'll treat each block as 10x10 canvas pixels for a clean retro look
    const COLS = 10;
    const ROWS = 20;
    const BLOCK = Math.floor(canvas.width / COLS); // auto-scale by canvas width
    canvas.width = COLS * BLOCK;
    canvas.height = ROWS * BLOCK;

    // Next preview canvas
    const nextCanvas = document.getElementById('tetris-next-canvas');
    const nctx = nextCanvas.getContext('2d');
    const NEXT_SCALE = Math.floor(nextCanvas.width / 4); // next grid 4x4
    nextCanvas.width = NEXT_SCALE * 4;
    nextCanvas.height = NEXT_SCALE * 4;

    // Colors for pieces (use more colors)
    const COLORS = {
        I: '#00f0f0', // cyan
        J: '#0000f0', // blue
        L: '#f0a000', // orange
        O: '#f0f000', // yellow
        S: '#00f000', // green
        T: '#a000f0', // purple
        Z: '#f00000', // red
        GHOST: 'rgba(255,255,255,0.12)',
        BORDER: '#0b0b0b'
    };

    // Tetromino shapes in rotation states (4x4 matrices)
    const SHAPES = {
        I: [
            [[0,0,0,0],
             [1,1,1,1],
             [0,0,0,0],
             [0,0,0,0]],
            [[0,0,1,0],
             [0,0,1,0],
             [0,0,1,0],
             [0,0,1,0]]
        ],
        J: [
            [[1,0,0],
             [1,1,1],
             [0,0,0]],
            [[0,1,1],
             [0,1,0],
             [0,1,0]],
            [[0,0,0],
             [1,1,1],
             [0,0,1]],
            [[0,1,0],
             [0,1,0],
             [1,1,0]]
        ],
        L: [
            [[0,0,1],
             [1,1,1],
             [0,0,0]],
            [[0,1,0],
             [0,1,0],
             [0,1,1]],
            [[0,0,0],
             [1,1,1],
             [1,0,0]],
            [[1,1,0],
             [0,1,0],
             [0,1,0]]
        ],
        O: [
            [[1,1],
             [1,1]]
        ],
        S: [
            [[0,1,1],
             [1,1,0],
             [0,0,0]],
            [[0,1,0],
             [0,1,1],
             [0,0,1]]
        ],
        T: [
            [[0,1,0],
             [1,1,1],
             [0,0,0]],
            [[0,1,0],
             [0,1,1],
             [0,1,0]],
            [[0,0,0],
             [1,1,1],
             [0,1,0]],
            [[0,1,0],
             [1,1,0],
             [0,1,0]]
        ],
        Z: [
            [[1,1,0],
             [0,1,1],
             [0,0,0]],
            [[0,0,1],
             [0,1,1],
             [0,1,0]]
        ]
    };

    // Convert shapes to normalized rotation arrays (fill missing rotations by rotating)
    function rotationsFor(shapeArr) {
        const res = [];
        let current = shapeArr[0].map(r => r.slice());
        const rotate90 = (m) => {
            const h = m.length, w = m[0].length;
            const out = Array.from({length: w}, () => Array(h).fill(0));
            for (let y=0;y<h;y++) for (let x=0;x<w;x++) out[x][h-1-y] = m[y][x];
            return out;
        };
        // produce up to 4 rotations
        for (let i=0;i<4;i++) {
            // normalize to smallest bounding box (trim empty rows/cols)
            const trim = (m) => {
                let minR=m.length, maxR=0, minC=m[0].length, maxC=0;
                for (let r=0;r<m.length;r++) for (let c=0;c<m[0].length;c++) if (m[r][c]) {
                    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
                    minC = Math.min(minC, c); maxC = Math.max(maxC, c);
                }
                if (maxR < minR) return [[0]]; // empty
                const out = [];
                for (let r=minR;r<=maxR;r++) {
                    out.push(m[r].slice(minC, maxC+1));
                }
                return out;
            };
            res.push(trim(current));
            current = rotate90(current);
        }
        // deduplicate by stringification
        const uniq = [];
        const seen = new Set();
        for (const r of res) {
            const k = JSON.stringify(r);
            if (!seen.has(k)) { seen.add(k); uniq.push(r); }
        }
        return uniq;
    }

    const PIECES = {};
    for (const p in SHAPES) PIECES[p] = rotationsFor(SHAPES[p]);

    // Game state
    let grid = createEmptyGrid();
    let current = null;
    let next = randomPiece();
    let hold = null;
    let canHold = true;
    let dropCounter = 0;
    let dropInterval = 1000; // ms (will speed up with level)
    let lastTime = 0;
    let score = 0;
    let lines = 0;
    let level = 1;
    let gameOver = false;

    // Controls
    const keys = {};
    const KEY_BINDINGS = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowDown: 'soft',
        ArrowUp: 'rotate',
        x: 'rotate',
        z: 'rotate',
        ' ': 'hard',
        c: 'hold'
    };

    // Initialize event listeners
    function setupListeners() {
        // focus canvas so it gets keyboard events
        canvas.setAttribute('tabindex', '0');
        canvas.focus();

        // Keydown
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        // Prevent page scroll on arrow keys while overlay is open
        window.addEventListener('keydown', preventPageScroll, { passive: false });

        // Close overlay on Esc
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                destroyOverlay();
            }
        });
    }

    function preventPageScroll(e) {
        const keysToBlock = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '];
        if (keysToBlock.includes(e.key)) {
            if (document.getElementById('tetris-block-overlay')) {
                e.preventDefault();
            }
        }
    }

    function onKeyDown(e) {
        const k = e.key.toLowerCase();
        const action = KEY_BINDINGS[e.key] || KEY_BINDINGS[k];
        if (!action) return;

        if (action === 'left' || action === 'right') {
            if (!keys[action]) {
                keys[action] = true;
                move(action === 'left' ? -1 : 1);
            }
        } else if (action === 'soft') {
            keys.soft = true;
            softDrop();
        } else if (action === 'rotate') {
            rotateCurrent();
        } else if (action === 'hard') {
            hardDrop();
        } else if (action === 'hold') {
            holdPiece();
        }
    }

    function onKeyUp(e) {
        const k = e.key.toLowerCase();
        const action = KEY_BINDINGS[e.key] || KEY_BINDINGS[k];
        if (!action) return;
        keys[action] = false;
    }

    // Grid helpers
    function createEmptyGrid() {
        return Array.from({length: ROWS}, () => Array(COLS).fill(0));
    }

    // Piece factory
    function randomPiece() {
        const types = Object.keys(PIECES);
        const t = types[Math.floor(Math.random() * types.length)];
        return createPiece(t);
    }

    function createPiece(type) {
        const rot = 0;
        const shape = PIECES[type];
        const matrix = shape[rot];
        const w = matrix[0].length;
        const x = Math.floor((COLS - w) / 2);
        const y = -matrix.length; // start above grid
        return { type, rot, x, y, matrix };
    }

    // Collision detection
    function collide(grid, piece, offsetX = 0, offsetY = 0, rot = null) {
        const mat = rot === null ? PIECES[piece.type][piece.rot] : PIECES[piece.type][rot];
        for (let r=0;r<mat.length;r++) {
            for (let c=0;c<mat[0].length;c++) {
                if (!mat[r][c]) continue;
                const gx = piece.x + c + offsetX;
                const gy = piece.y + r + offsetY;
                if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
                if (gy >= 0 && grid[gy][gx]) return true;
            }
        }
        return false;
    }

    function mergePiece(grid, piece) {
        const mat = PIECES[piece.type][piece.rot];
        for (let r=0;r<mat.length;r++) {
            for (let c=0;c<mat[0].length;c++) {
                if (!mat[r][c]) continue;
                const gx = piece.x + c;
                const gy = piece.y + r;
                if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
                    grid[gy][gx] = piece.type;
                } else if (gy < 0) {
                    // piece occupies above grid -> game over
                    gameOver = true;
                }
            }
        }
    }

    function clearLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (grid[r].every(cell => cell !== 0)) {
                grid.splice(r, 1);
                grid.unshift(Array(COLS).fill(0));
                cleared++;
                r++; // recheck same row index after splice
            }
        }
        if (cleared > 0) {
            // scoring: classic 40,100,300,1200 * (level)
            const lineScores = [0, 40, 100, 300, 1200];
            score += (lineScores[cleared] || cleared * 1200) * level;
            lines += cleared;
            level = Math.floor(lines / 10) + 1;
            // speed up
            dropInterval = Math.max(100, 1000 - (level - 1) * 75);
            updateUI();
        }
    }

    function updateUI() {
        document.getElementById('tetris-score').textContent = `SCORE: ${score}`;
        document.getElementById('tetris-level').textContent = `LEVEL: ${level}`;
        document.getElementById('tetris-lines').textContent = `LINES: ${lines}`;
    }

    // Move, rotate, drop
    function move(dir) {
        if (!current || gameOver) return;
        const nx = current.x + dir;
        if (!collide(grid, current, dir, 0)) {
            current.x = nx;
        }
    }

    function rotateCurrent() {
        if (!current || gameOver) return;
        const len = PIECES[current.type].length;
        const newRot = (current.rot + 1) % len;
        // try wall kicks (basic)
        const kicks = [0, -1, 1, -2, 2];
        for (const k of kicks) {
            if (!collide(grid, current, k, 0, newRot)) {
                current.rot = newRot;
                return;
            }
        }
    }

    function softDrop() {
        if (!current || gameOver) return;
        if (!collide(grid, current, 0, 1)) {
            current.y += 1;
        } else {
            lockPiece();
        }
    }

    function hardDrop() {
        if (!current || gameOver) return;
        while (!collide(grid, current, 0, 1)) {
            current.y += 1;
            score += 2; // reward small points for hard drop distance
        }
        lockPiece();
    }

    function holdPiece() {
        if (!current || gameOver || !canHold) return;
        if (!hold) {
            hold = { type: current.type, rot: current.rot };
            current = next;
            next = randomPiece();
        } else {
            const temp = hold.type;
            hold.type = current.type;
            current = createPiece(temp);
        }
        canHold = false;
        drawNext();
    }

    // When piece can't go down we lock it and create new piece
    function lockPiece() {
        mergePiece(grid, current);
        clearLines();
        current = next;
        next = randomPiece();
        canHold = true;
        drawNext();
        if (collide(grid, current, 0, 0)) {
            gameOver = true;
        }
    }

    // Draw helpers
    function drawCell(x, y, color, alpha = 1) {
        ctx.fillStyle = color;
        ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
        // block border for retro look
        ctx.strokeStyle = COLORS.BORDER;
        ctx.lineWidth = Math.max(1, Math.floor(BLOCK * 0.06));
        ctx.strokeRect(x * BLOCK + 0.5, y * BLOCK + 0.5, BLOCK - 1, BLOCK - 1);
    }

    function drawGrid() {
        // background
        ctx.fillStyle = '#050814';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // draw cells
        for (let r=0;r<ROWS;r++) {
            for (let c=0;c<COLS;c++) {
                const cell = grid[r][c];
                if (cell) {
                    drawCell(c, r, COLORS[cell]);
                } else {
                    // subtle grid lines
                    ctx.fillStyle = 'rgba(255,255,255,0.02)';
                    ctx.fillRect(c*BLOCK + 0.5, r*BLOCK + 0.5, BLOCK - 1, BLOCK - 1);
                }
            }
        }
    }

    function drawPieceGhost(piece) {
        let ghostY = piece.y;
        while (!collide(grid, piece, 0, ghostY - piece.y + 1)) {
            ghostY++;
        }
        // draw ghost at ghostY
        const mat = PIECES[piece.type][piece.rot];
        for (let r=0;r<mat.length;r++) {
            for (let c=0;c<mat[0].length;c++) {
                if (!mat[r][c]) continue;
                const gx = piece.x + c;
                const gy = ghostY + r;
                if (gy >= 0) {
                    ctx.fillStyle = COLORS.GHOST;
                    ctx.fillRect(gx * BLOCK, gy * BLOCK, BLOCK, BLOCK);
                }
            }
        }
    }

    function drawCurrent(piece) {
        const mat = PIECES[piece.type][piece.rot];
        for (let r=0;r<mat.length;r++) {
            for (let c=0;c<mat[0].length;c++) {
                if (!mat[r][c]) continue;
                const gx = piece.x + c;
                const gy = piece.y + r;
                if (gy >= 0) {
                    drawCell(gx, gy, COLORS[piece.type]);
                }
            }
        }
    }

    function drawNext() {
        // clear next canvas
        nctx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
        // center 4x4 block
        const mat = PIECES[next.type][0];
        const cellSize = NEXT_SCALE;
        const offsetX = Math.floor((nextCanvas.width - mat[0].length * cellSize) / 2);
        const offsetY = Math.floor((nextCanvas.height - mat.length * cellSize) / 2);

        for (let r=0;r<mat.length;r++) {
            for (let c=0;c<mat[0].length;c++) {
                if (!mat[r][c]) continue;
                nctx.fillStyle = COLORS[next.type];
                nctx.fillRect(offsetX + c*cellSize, offsetY + r*cellSize, cellSize, cellSize);
                nctx.strokeStyle = COLORS.BORDER;
                nctx.lineWidth = Math.max(1, Math.floor(cellSize * 0.06));
                nctx.strokeRect(offsetX + c*cellSize + 0.5, offsetY + r*cellSize + 0.5, cellSize - 1, cellSize - 1);
            }
        }
    }

    function draw() {
        drawGrid();
        if (current) {
            drawPieceGhost(current);
            drawCurrent(current);
        }
    }

    // Game loop
    function update(time = 0) {
        if (!lastTime) lastTime = time;
        const delta = time - lastTime;
        lastTime = time;

        dropCounter += delta;
        if (dropCounter > dropInterval) {
            dropCounter = 0;
            if (!gameOver) {
                if (!collide(grid, current, 0, 1)) {
                    current.y += 1;
                } else {
                    lockPiece();
                }
            }
        }

        // handle continuous horizontal movement if key held
        if (keys.left) {
            // small interval movement
            if (!this._leftTimer) this._leftTimer = 0;
            this._leftTimer += delta;
            if (this._leftTimer > 120) { move(-1); this._leftTimer = 0; }
        } else {
            this._leftTimer = 0;
        }
        if (keys.right) {
            if (!this._rightTimer) this._rightTimer = 0;
            this._rightTimer += delta;
            if (this._rightTimer > 120) { move(1); this._rightTimer = 0; }
        } else {
            this._rightTimer = 0;
        }

        draw();
        if (!gameOver) requestAnimationFrame(update);
        else {
            // game over splash
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);
            ctx.fillStyle = '#fff';
            ctx.font = `${Math.max(14, BLOCK * 1.2)}px "Press Start 2P", monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 + 6);
        }
    }

    // Start / Restart
    function startGame() {
        grid = createEmptyGrid();
        current = randomPiece();
        next = randomPiece();
        hold = null;
        canHold = true;
        score = 0;
        lines = 0;
        level = 1;
        dropInterval = 1000;
        gameOver = false;
        updateUI();
        drawNext();
        lastTime = 0;
        dropCounter = 0;
        requestAnimationFrame(update);
    }

    // Lock piece if cannot move down
    function lockPiece() {
        mergePiece(grid, current);
        clearLines();
        current = next;
        next = randomPiece();
        canHold = true;
        drawNext();
        if (collide(grid, current, 0, 0)) {
            gameOver = true;
        }
    }

    // Clean up overlay
    function destroyOverlay() {
        // remove overlay element and listeners
        const el = document.getElementById('tetris-block-overlay');
        if (el) el.remove();
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('keydown', preventPageScroll, { passive: false });
    }

    // Initialize everything
    setupListeners();
    startGame();

    // Expose a small API for developer convenience (optional)
    window.__extensionTetris = {
        restart: startGame,
        stop: destroyOverlay
    };
}
