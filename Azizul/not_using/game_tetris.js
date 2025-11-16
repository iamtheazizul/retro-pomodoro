// Tetris Game Implementation
function initTetris(canvas, scoreDisplay) {
  const ctx = canvas.getContext('2d');
  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 30;
  
  canvas.width = COLS * BLOCK_SIZE;
  canvas.height = ROWS * BLOCK_SIZE;
  
  const SHAPES = [
    [[1,1,1,1]], // I
    [[1,1],[1,1]], // O
    [[1,1,1],[0,1,0]], // T
    [[1,1,1],[1,0,0]], // L
    [[1,1,1],[0,0,1]], // J
    [[1,1,0],[0,1,1]], // S
    [[0,1,1],[1,1,0]]  // Z
  ];
  
  const COLORS = ['#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF', '#FF8E0D', '#FFE138', '#3877FF'];
  
  let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
  let score = 0;
  let currentPiece = null;
  let gameOver = false;
  
  function createPiece() {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length);
    return {
      shape: SHAPES[shapeIndex],
      color: COLORS[shapeIndex],
      x: Math.floor(COLS / 2) - 1,
      y: 0
    };
  }
  
  function collision(piece, offsetX = 0, offsetY = 0) {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.x + x + offsetX;
          const newY = piece.y + y + offsetY;
          
          if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
          if (newY >= 0 && board[newY][newX]) return true;
        }
      }
    }
    return false;
  }
  
  function merge() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
      for (let x = 0; x < currentPiece.shape[y].length; x++) {
        if (currentPiece.shape[y][x]) {
          const boardY = currentPiece.y + y;
          const boardX = currentPiece.x + x;
          if (boardY >= 0) {
            board[boardY][boardX] = currentPiece.color;
          }
        }
      }
    }
  }
  
  function clearLines() {
    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (board[y].every(cell => cell !== 0)) {
        board.splice(y, 1);
        board.unshift(Array(COLS).fill(0));
        linesCleared++;
        y++;
      }
    }
    if (linesCleared > 0) {
      score += linesCleared * 100;
      if (scoreDisplay) scoreDisplay.textContent = score;
    }
  }
  
  function rotate(piece) {
    const rotated = piece.shape[0].map((_, i) =>
      piece.shape.map(row => row[i]).reverse()
    );
    return { ...piece, shape: rotated };
  }
  
  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw board
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (board[y][x]) {
          ctx.fillStyle = board[y][x];
          ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
        }
      }
    }
    
    // Draw current piece
    if (currentPiece) {
      ctx.fillStyle = currentPiece.color;
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            ctx.fillRect(
              (currentPiece.x + x) * BLOCK_SIZE,
              (currentPiece.y + y) * BLOCK_SIZE,
              BLOCK_SIZE - 1,
              BLOCK_SIZE - 1
            );
          }
        }
      }
    }
    
    // Draw grid
    ctx.strokeStyle = '#222';
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * BLOCK_SIZE);
      ctx.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
      ctx.stroke();
    }
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * BLOCK_SIZE, 0);
      ctx.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
      ctx.stroke();
    }
  }
  
  const keys = {};
  
  function handleKeyDown(e) {
    keys[e.key.toLowerCase()] = true;
    
    if (!currentPiece || gameOver) return;
    
    if (e.key === 'ArrowLeft' && !collision(currentPiece, -1, 0)) {
      currentPiece.x--;
    } else if (e.key === 'ArrowRight' && !collision(currentPiece, 1, 0)) {
      currentPiece.x++;
    } else if (e.key === 'ArrowDown' && !collision(currentPiece, 0, 1)) {
      currentPiece.y++;
    } else if (e.key === 'ArrowUp' || e.key === ' ') {
      const rotated = rotate(currentPiece);
      if (!collision(rotated)) {
        currentPiece = rotated;
      }
    }
    
    e.stopPropagation();
    e.preventDefault();
  }
  
  function handleKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
    e.stopPropagation();
    e.preventDefault();
  }
  
  document.addEventListener('keydown', handleKeyDown, {capture: true});
  document.addEventListener('keyup', handleKeyUp, {capture: true});
  
  let dropCounter = 0;
  let dropInterval = 1000;
  let lastTime = 0;
  
  function update(time = 0) {
    if (gameOver) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    
    if (dropCounter > dropInterval) {
      if (currentPiece) {
        if (!collision(currentPiece, 0, 1)) {
          currentPiece.y++;
        } else {
          merge();
          clearLines();
          currentPiece = createPiece();
          if (collision(currentPiece)) {
            gameOver = true;
            if (scoreDisplay) scoreDisplay.textContent = `GAME OVER - ${score}`;
          }
        }
      } else {
        currentPiece = createPiece();
      }
      dropCounter = 0;
    }
    
    draw();
    
    if (!gameOver && document.getElementById('tetris-block-overlay')) {
      requestAnimationFrame(update);
    } else {
      document.removeEventListener('keydown', handleKeyDown, {capture: true});
      document.removeEventListener('keyup', handleKeyUp, {capture: true});
    }
  }
  
  currentPiece = createPiece();
  requestAnimationFrame(update);
}