// Space Invaders Game Implementation
function initSpaceInvaders(canvas, scoreDisplay) {
  const ctx = canvas.getContext('2d');
  canvas.width = 800;
  canvas.height = 600;
  
  let score = 0;
  let gameOver = false;
  
  const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 60,
    width: 40,
    height: 20,
    speed: 5
  };
  
  const bullets = [];
  const enemies = [];
  const enemyBullets = [];
  
  // Create enemies
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 8; col++) {
      enemies.push({
        x: col * 80 + 50,
        y: row * 60 + 50,
        width: 40,
        height: 30,
        alive: true
      });
    }
  }
  
  let enemyDirection = 1;
  let enemySpeed = 1;
  
  const keys = {};
  
  function handleKeyDown(e) {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key === ' ' && !gameOver) {
      bullets.push({
        x: player.x + player.width / 2 - 2,
        y: player.y,
        width: 4,
        height: 10,
        speed: 7
      });
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
  
  function update() {
    if (gameOver) return;
    
    // Move player
    if ((keys['arrowleft'] || keys['a']) && player.x > 0) {
      player.x -= player.speed;
    }
    if ((keys['arrowright'] || keys['d']) && player.x < canvas.width - player.width) {
      player.x += player.speed;
    }
    
    // Move bullets
    bullets.forEach((bullet, i) => {
      bullet.y -= bullet.speed;
      if (bullet.y < 0) {
        bullets.splice(i, 1);
      }
    });
    
    // Move enemy bullets
    enemyBullets.forEach((bullet, i) => {
      bullet.y += bullet.speed;
      if (bullet.y > canvas.height) {
        enemyBullets.splice(i, 1);
      }
      
      // Check collision with player
      if (bullet.x < player.x + player.width &&
          bullet.x + bullet.width > player.x &&
          bullet.y < player.y + player.height &&
          bullet.y + bullet.height > player.y) {
        gameOver = true;
        if (scoreDisplay) scoreDisplay.textContent = `GAME OVER - ${score}`;
      }
    });
    
    // Move enemies
    let changeDirection = false;
    enemies.forEach(enemy => {
      if (!enemy.alive) return;
      
      enemy.x += enemySpeed * enemyDirection;
      
      if (enemy.x <= 0 || enemy.x >= canvas.width - enemy.width) {
        changeDirection = true;
      }
      
      // Random enemy shooting
      if (Math.random() < 0.001) {
        enemyBullets.push({
          x: enemy.x + enemy.width / 2 - 2,
          y: enemy.y + enemy.height,
          width: 4,
          height: 10,
          speed: 3
        });
      }
    });
    
    if (changeDirection) {
      enemyDirection *= -1;
      enemies.forEach(enemy => {
        enemy.y += 20;
        if (enemy.y > canvas.height - 100 && enemy.alive) {
          gameOver = true;
          if (scoreDisplay) scoreDisplay.textContent = `INVADED! - ${score}`;
        }
      });
    }
    
    // Check bullet collisions
    bullets.forEach((bullet, bi) => {
      enemies.forEach(enemy => {
        if (!enemy.alive) return;
        
        if (bullet.x < enemy.x + enemy.width &&
            bullet.x + bullet.width > enemy.x &&
            bullet.y < enemy.y + enemy.height &&
            bullet.y + bullet.height > enemy.y) {
          enemy.alive = false;
          bullets.splice(bi, 1);
          score += 10;
          if (scoreDisplay) scoreDisplay.textContent = score;
        }
      });
    });
    
    // Check if all enemies dead
    if (enemies.every(e => !e.alive)) {
      if (scoreDisplay) scoreDisplay.textContent = `YOU WIN! - ${score}`;
      gameOver = true;
    }
  }
  
  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw player
    ctx.fillStyle = '#0f0';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw bullets
    ctx.fillStyle = '#ff0';
    bullets.forEach(bullet => {
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    // Draw enemy bullets
    ctx.fillStyle = '#f00';
    enemyBullets.forEach(bullet => {
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    // Draw enemies
    ctx.fillStyle = '#fff';
    enemies.forEach(enemy => {
      if (enemy.alive) {
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
    });
  }
  
  function gameLoop() {
    if (!document.getElementById('spaceinvaders-block-overlay')) {
      document.removeEventListener('keydown', handleKeyDown, {capture: true});
      document.removeEventListener('keyup', handleKeyUp, {capture: true});
      return;
    }
    
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }
  
  gameLoop();
}