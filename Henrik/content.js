// Check if current site is blocked
browser.runtime.sendMessage({
    action: 'checkIfBlocked',
    url: window.location.href
}).then(response => {
    if (response.blocked) {
        showBlockOverlay();
    }
});

function showBlockOverlay() {
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'pong-block-overlay';
    overlay.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
            
            #pong-block-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #000;
                z-index: 2147483647;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: 'Press Start 2P', 'Courier New', monospace;
            }
            
            #pong-canvas {
                border: 8px solid #333;
                background: #000;
                image-rendering: pixelated;
                image-rendering: crisp-edges;
                image-rendering: -moz-crisp-edges;
            }
            
            #pong-title {
                position: absolute;
                top: 80px;
                width: 100%;
                text-align: center;
                color: #fff;
                font-size: 12px;
                opacity: 0.8;
            }
            
            #pong-score {
                position: absolute;
                top: 30px;
                width: 100%;
                text-align: center;
                color: #fff;
                font-size: 24px;
                letter-spacing: 8px;
            }
            
            #pong-instructions {
                position: absolute;
                bottom: 30px;
                width: 100%;
                text-align: center;
                color: #fff;
                font-size: 10px;
                opacity: 0.7;
            }
        </style>
        <div id="pong-title">SITE BLOCKED</div>
        <div id="pong-score">0 : 0</div>
        <canvas id="pong-canvas" width="800" height="600"></canvas>
        <div id="pong-instructions">◄ W/S KEYS TO MOVE ►</div>
    `;
    
    document.documentElement.appendChild(overlay);
    
    // Initialize Pong game
    initPong();
}

function initPong() {
    const canvas = document.getElementById('pong-canvas');
    const ctx = canvas.getContext('2d');
    const scoreDisplay = document.getElementById('pong-score');
    
    // Game objects
    const ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 8,
        dx: 4,
        dy: 4,
        speed: 4
    };
    
    const paddleWidth = 12;
    const paddleHeight = 100;
    
    const player = {
        x: 20,
        y: canvas.height / 2 - paddleHeight / 2,
        width: paddleWidth,
        height: paddleHeight,
        dy: 0,
        speed: 6,
        score: 0
    };
    
    const ai = {
        x: canvas.width - 20 - paddleWidth,
        y: canvas.height / 2 - paddleHeight / 2,
        width: paddleWidth,
        height: paddleHeight,
        speed: 3.5,
        score: 0
    };
    
    // Keyboard controls
    const keys = {};
    
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
    
    // Draw functions
    function drawRect(x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
    }
    
    function drawCircle(x, y, r, color) {
        // Draw pixelated square instead of circle for retro look
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x - r), Math.floor(y - r), Math.floor(r * 2), Math.floor(r * 2));
    }
    
    function drawNet() {
        for (let i = 0; i < canvas.height; i += 16) {
            drawRect(canvas.width / 2 - 4, i, 8, 10, '#fff');
        }
    }
    
    // Update game state
    function update() {
        // Player movement
        if (keys['w'] && player.y > 0) {
            player.y -= player.speed;
        }
        if (keys['s'] && player.y < canvas.height - player.height) {
            player.y += player.speed;
        }
        
        // AI movement
        const aiCenter = ai.y + ai.height / 2;
        if (ball.x > canvas.width / 2) {
            if (aiCenter < ball.y - 20) {
                ai.y += ai.speed;
            } else if (aiCenter > ball.y + 20) {
                ai.y -= ai.speed;
            }
        }
        
        // Keep AI paddle in bounds
        if (ai.y < 0) ai.y = 0;
        if (ai.y > canvas.height - ai.height) ai.y = canvas.height - ai.height;
        
        // Ball movement
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        // Ball collision with top/bottom
        if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
            ball.dy = -ball.dy;
        }
        
        // Ball collision with paddles
        if (ball.x - ball.radius < player.x + player.width &&
            ball.y > player.y && ball.y < player.y + player.height) {
            ball.dx = Math.abs(ball.dx);
            ball.dy += (Math.random() - 0.5) * 2;
        }
        
        if (ball.x + ball.radius > ai.x &&
            ball.y > ai.y && ball.y < ai.y + ai.height) {
            ball.dx = -Math.abs(ball.dx);
            ball.dy += (Math.random() - 0.5) * 2;
        }
        
        // Scoring
        if (ball.x - ball.radius < 0) {
            ai.score++;
            resetBall();
        }
        if (ball.x + ball.radius > canvas.width) {
            player.score++;
            resetBall();
        }
        
        // Update score display
        scoreDisplay.textContent = `${player.score} : ${ai.score}`;
        
        // Check win condition
        if (player.score >= 10 || ai.score >= 10) {
            const winner = player.score >= 10 ? 'YOU WIN!' : 'AI WINS!';
            scoreDisplay.textContent = winner;
            setTimeout(() => {
                player.score = 0;
                ai.score = 0;
                resetBall();
            }, 2000);
        }
    }
    
    function resetBall() {
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.dx = (Math.random() > 0.5 ? 1 : -1) * ball.speed;
        ball.dy = (Math.random() - 0.5) * ball.speed;
    }
    
    // Render
    function draw() {
        // Clear canvas - solid black
        drawRect(0, 0, canvas.width, canvas.height, '#000');
        
        // Draw net
        drawNet();
        
        // Draw paddles
        drawRect(player.x, player.y, player.width, player.height, '#fff');
        drawRect(ai.x, ai.y, ai.width, ai.height, '#fff');
        
        // Draw ball
        drawCircle(ball.x, ball.y, ball.radius, '#fff');
    }
    
    // Game loop
    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    // Start game
    gameLoop();
}