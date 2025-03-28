// Client-side game logic
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const startScreen = document.getElementById('startScreen');
  const gameScreen = document.getElementById('gameScreen');
  const playerNameInput = document.getElementById('playerName');
  const playButton = document.getElementById('playButton');
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const minimapCanvas = document.getElementById('minimap');
  const minimapCtx = minimapCanvas.getContext('2d');
  const leaderboardList = document.getElementById('leaderboardList');
  const scoreValue = document.getElementById('scoreValue');
  const lengthValue = document.getElementById('lengthValue');
  const respawnOverlay = document.getElementById('respawnOverlay');
  const respawnTimer = document.getElementById('respawnTimer');
  
  // Game state variables
  let socket;
  let playerId;
  let players = {};
  let food = [];
  let gameWidth = 2000;
  let gameHeight = 2000;
  let camera = { x: 0, y: 0 };
  let lastFrameTime = 0;
  let gameRunning = false;
  
  // Server URL - Change this to your deployed backend URL in production
  const SERVER_URL = 'https://snake-multiplayer-backend.onrender.com';
  
  // Initialize game
  function init() {
    // Set up canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Event listeners
    playButton.addEventListener('click', startGame);
    playerNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') startGame();
    });
    
    // Input handling
    document.addEventListener('keydown', handleKeyDown);
  }
  
  // Resize canvas to fit window
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Also setup minimap
    minimapCanvas.width = 200;
    minimapCanvas.height = 200;
  }
  
  // Start the game
  function startGame() {
    const playerName = playerNameInput.value.trim() || `Player${Math.floor(Math.random() * 1000)}`;
    
    // Connect to server
    socket = io(SERVER_URL);
    
    // Socket event handlers
    socket.on('connect', () => {
      console.log('Connected to server');
      socket.emit('playerJoin', { name: playerName });
    });
    
    socket.on('gameInit', (data) => {
      playerId = data.id;
      players = data.players;
      food = data.food;
      gameWidth = data.gameWidth;
      gameHeight = data.gameHeight;
      
      // Switch to game screen
      startScreen.classList.add('hidden');
      gameScreen.classList.remove('hidden');
      
      // Start game loop
      gameRunning = true;
      requestAnimationFrame(gameLoop);
    });
    
    socket.on('gameState', (data) => {
      players = data.players;
      food = data.food;
      
      // Update UI
      updateLeaderboard();
      
      // Update player stats if player exists
      if (players[playerId]) {
        scoreValue.textContent = players[playerId].score;
        lengthValue.textContent = players[playerId].segments.length;
        
        // Show/hide respawn overlay
        if (!players[playerId].alive && respawnOverlay.classList.contains('hidden')) {
          respawnOverlay.classList.remove('hidden');
          let countdown = 3;
          respawnTimer.textContent = countdown;
          
          const timerInterval = setInterval(() => {
            countdown--;
            respawnTimer.textContent = countdown;
            
            if (countdown <= 0) {
              clearInterval(timerInterval);
              
              // Check if player is now alive (server may have respawned)
              if (players[playerId] && players[playerId].alive) {
                respawnOverlay.classList.add('hidden');
              }
            }
          }, 1000);
        } else if (players[playerId].alive && !respawnOverlay.classList.contains('hidden')) {
          respawnOverlay.classList.add('hidden');
        }
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      // Handle disconnection (show message, etc.)
    });
  }
  
  // Game loop
  function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    
    // Update camera position to follow player
    updateCamera();
    
    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw world boundary
    drawWorldBoundary();
    
    // Draw food
    drawFood();
    
    // Draw players
    drawPlayers();
    
    // Draw minimap
    drawMinimap();
    
    // Next frame
    requestAnimationFrame(gameLoop);
  }
  
  // Update camera to follow player
  function updateCamera() {
    if (players[playerId] && players[playerId].segments.length > 0) {
      const head = players[playerId].segments[0];
      
      // Smoothly move the camera to follow the player
      camera.x = head.x - canvas.width / 2;
      camera.y = head.y - canvas.height / 2;
      
      // Keep camera within game bounds
      camera.x = Math.max(0, Math.min(camera.x, gameWidth - canvas.width));
      camera.y = Math.max(0, Math.min(camera.y, gameHeight - canvas.height));
    }
  }
  
  // Draw world boundary
  function drawWorldBoundary() {
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(-camera.x, -camera.y, gameWidth, gameHeight);
  }
  
  // Draw food items
  function drawFood() {
    food.forEach(foodItem => {
      // Only draw food that's visible on screen (optimization)
      if (
        foodItem.x + 10 >= camera.x &&
        foodItem.x - 10 <= camera.x + canvas.width &&
        foodItem.y + 10 >= camera.y &&
        foodItem.y - 10 <= camera.y + canvas.height
      ) {
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.arc(foodItem.x - camera.x, foodItem.y - camera.y, 7, 0, Math.PI * 2);
        ctx.fill();
        
        // Add a highlight
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(foodItem.x - camera.x - 2, foodItem.y - camera.y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
  
  // Draw all players
  function drawPlayers() {
    Object.values(players).forEach(player => {
      // Skip if player is not alive
      if (!player.alive) return;
      
      const segments = player.segments;
      const isCurrentPlayer = player.id === playerId;
      
      // Draw each segment of the snake
      segments.forEach((segment, index) => {
        // Only draw segments visible on screen (optimization)
        if (
          segment.x + 15 >= camera.x &&
          segment.x - 15 <= camera.x + canvas.width &&
          segment.y + 15 >= camera.y &&
          segment.y - 15 <= camera.y + canvas.height
        ) {
          // Draw segment
          ctx.fillStyle = player.color;
          ctx.beginPath();
          
          // Head is larger than body segments
          const radius = index === 0 ? 12 : 10;
          ctx.arc(segment.x - camera.x, segment.y - camera.y, radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw eyes on the head
          if (index === 0) {
            // Calculate eye positions based on direction
            const dir = player.direction;
            const eyeOffset = 5;
            
            // Left eye
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(
              segment.x - camera.x + dir.y * eyeOffset - dir.x * eyeOffset, 
              segment.y - camera.y + dir.x * eyeOffset - dir.y * eyeOffset, 
              3, 0, Math.PI * 2
            );
            ctx.fill();
            
            // Right eye
            ctx.beginPath();
            ctx.arc(
              segment.x - camera.x + dir.y * eyeOffset + dir.x * eyeOffset, 
              segment.y - camera.y + dir.x * eyeOffset + dir.y * eyeOffset, 
              3, 0, Math.PI * 2
            );
            ctx.fill();
            
            // Pupils (follow movement direction)
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(
              segment.x - camera.x + dir.y * eyeOffset - dir.x * eyeOffset + dir.x, 
              segment.y - camera.y + dir.x * eyeOffset - dir.y * eyeOffset + dir.y, 
              1.5, 0, Math.PI * 2
            );
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(
              segment.x - camera.x + dir.y * eyeOffset + dir.x * eyeOffset + dir.x, 
              segment.y - camera.y + dir.x * eyeOffset + dir.y * eyeOffset + dir.y, 
              1.5, 0, Math.PI * 2
            );
            ctx.fill();
          }
        }
      });
      
      // Draw player name above the snake
      if (segments.length > 0) {
        const head = segments[0];
        if (
          head.x >= camera.x &&
          head.x <= camera.x + canvas.width &&
          head.y >= camera.y &&
          head.y <= camera.y + canvas.height
        ) {
          ctx.font = '14px Arial';
          ctx.fillStyle = isCurrentPlayer ? '#FFFF00' : '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.fillText(player.name, head.x - camera.x, head.y - camera.y - 20);
        }
      }
    });
  }
  
  // Draw minimap
  function drawMinimap() {
    // Clear minimap
    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    
    // Draw world boundary
    minimapCtx.strokeStyle = '#444';
    minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    
    // Calculate the scale factor
    const scaleX = minimapCanvas.width / gameWidth;
    const scaleY = minimapCanvas.height / gameHeight;
    
    // Draw food (tiny dots)
    minimapCtx.fillStyle = '#FF6B6B';
    food.forEach(foodItem => {
      minimapCtx.fillRect(
        foodItem.x * scaleX - 1,
        foodItem.y * scaleY - 1,
        2, 2
      );
    });
    
    // Draw players
    Object.values(players).forEach(player => {
      if (!player.alive || player.segments.length === 0) return;
      
      const head = player.segments[0];
      
      // Draw as a dot
      minimapCtx.fillStyle = player.id === playerId ? '#FFFF00' : player.color;
      minimapCtx.beginPath();
      minimapCtx.arc(
        head.x * scaleX,
        head.y * scaleY,
        3, 0, Math.PI * 2
      );
      minimapCtx.fill();
    });
    
    // Draw viewport rectangle (showing what's visible on main canvas)
    minimapCtx.strokeStyle = '#FFFFFF';
    minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(
      camera.x * scaleX,
      camera.y * scaleY,
      canvas.width * scaleX,
      canvas.height * scaleY
    );
  }
  
  // Update leaderboard
  function updateLeaderboard() {
    // Sort players by score
    const sortedPlayers = Object.values(players)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10
    
    // Clear leaderboard
    leaderboardList.innerHTML = '';
    
    // Add players to leaderboard
    sortedPlayers.forEach(player => {
      const li = document.createElement('li');
      li.textContent = `${player.name}: ${player.score}`;
      
      // Highlight current player
      if (player.id === playerId) {
        li.style.color = '#FFFF00';
        li.style.fontWeight = 'bold';
      }
      
      leaderboardList.appendChild(li);
    });
  }
  
  // Handle keyboard input
  function handleKeyDown(e) {
    if (!gameRunning || !socket || !players[playerId] || !players[playerId].alive) return;
    
    let direction = null;
    
    // WASD or Arrow keys
    switch(e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        direction = { x: 0, y: -1 };
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        direction = { x: 0, y: 1 };
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        direction = { x: -1, y: 0 };
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        direction = { x: 1, y: 0 };
        break;
    }
    
    // Send direction change to server
    if (direction) {
      socket.emit('changeDirection', direction);
    }
  }
  
  // Initialize the game
  init();
});
