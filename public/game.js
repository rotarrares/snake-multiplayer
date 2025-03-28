// Client-side game logic
document.addEventListener('DOMContentLoaded', () => {
  // Create a debug element
  const debugElement = document.createElement('div');
  debugElement.style.position = 'fixed';
  debugElement.style.bottom = '10px';
  debugElement.style.left = '10px';
  debugElement.style.padding = '10px';
  debugElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  debugElement.style.color = 'white';
  debugElement.style.fontFamily = 'monospace';
  debugElement.style.fontSize = '12px';
  debugElement.style.zIndex = 1000;
  document.body.appendChild(debugElement);

  function logDebug(message) {
    console.log(message);
    debugElement.innerHTML += message + '<br>';
    // Keep only the last 5 messages
    const messages = debugElement.innerHTML.split('<br>');
    if (messages.length > 6) {
      debugElement.innerHTML = messages.slice(messages.length - 6).join('<br>');
    }
  }

  logDebug('Game initializing...');

  try {
    // DOM Elements
    const startScreen = document.getElementById('startScreen');
    if (!startScreen) logDebug('Warning: startScreen element not found');
    
    const gameScreen = document.getElementById('gameScreen');
    if (!gameScreen) logDebug('Warning: gameScreen element not found');
    
    const playerNameInput = document.getElementById('playerName');
    if (!playerNameInput) logDebug('Warning: playerNameInput element not found');
    
    const playButton = document.getElementById('playButton');
    if (!playButton) logDebug('Warning: playButton element not found');
    
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) logDebug('Warning: gameCanvas element not found');
    
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) logDebug('Warning: Unable to get 2D context from gameCanvas');
    
    // Check if minimap exists
    const minimapCanvas = document.getElementById('minimap');
    if (!minimapCanvas) {
      logDebug('Error: minimap element not found');
      // Create a fallback canvas element for minimap
      const fallbackMinimap = document.createElement('canvas');
      fallbackMinimap.id = 'minimap';
      fallbackMinimap.width = 200;
      fallbackMinimap.height = 200;
      if (document.getElementById('uiOverlay')) {
        document.getElementById('uiOverlay').prepend(fallbackMinimap);
        logDebug('Created fallback minimap element');
      } else {
        document.body.appendChild(fallbackMinimap);
        logDebug('Created fallback minimap and appended to body');
      }
    } else {
      logDebug('Found minimap element: ' + minimapCanvas.tagName);
    }
    
    // Get minimap again (might be the original or our fallback)
    const minimapCtx = document.getElementById('minimap').getContext('2d');
    if (!minimapCtx) logDebug('Warning: Unable to get 2D context from minimap');
    
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) logDebug('Warning: leaderboardList element not found');
    
    const scoreValue = document.getElementById('scoreValue');
    if (!scoreValue) logDebug('Warning: scoreValue element not found');
    
    const lengthValue = document.getElementById('lengthValue');
    if (!lengthValue) logDebug('Warning: lengthValue element not found');
    
    const respawnOverlay = document.getElementById('respawnOverlay');
    if (!respawnOverlay) logDebug('Warning: respawnOverlay element not found');
    
    const respawnTimer = document.getElementById('respawnTimer');
    if (!respawnTimer) logDebug('Warning: respawnTimer element not found');
    
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
    
    // Server URL - For Heroku, connect to the same host
    // This approach automatically works in both development and production
    const SERVER_URL = window.location.origin;
    logDebug(`Server URL: ${SERVER_URL}`);
    
    // Initialize game
    function init() {
      try {
        // Set up canvas
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Event listeners
        if (playButton) {
          playButton.addEventListener('click', startGame);
          logDebug('Play button click event listener added');
        }
        
        if (playerNameInput) {
          playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') startGame();
          });
          logDebug('Player name input keypress event listener added');
        }
        
        // Input handling
        document.addEventListener('keydown', handleKeyDown);
        logDebug('Keydown event listener added to document');
        
        logDebug('Game initialized successfully. Ready to start.');
      } catch (error) {
        logDebug(`Error in init: ${error.message}`);
      }
    }
    
    // Resize canvas to fit window
    function resizeCanvas() {
      try {
        if (canvas) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          logDebug(`Canvas resized to ${canvas.width}x${canvas.height}`);
        }
        
        // Also setup minimap
        const minimapElement = document.getElementById('minimap');
        if (minimapElement) {
          minimapElement.width = 200;
          minimapElement.height = 200;
          logDebug('Minimap canvas sized to 200x200');
        }
      } catch (error) {
        logDebug(`Error in resizeCanvas: ${error.message}`);
      }
    }
    
    // Start the game
    function startGame() {
      try {
        const playerName = playerNameInput ? (playerNameInput.value.trim() || `Player${Math.floor(Math.random() * 1000)}`) : `Player${Math.floor(Math.random() * 1000)}`;
        logDebug(`Starting game with name: ${playerName}`);
        
        // Disable the play button and show loading state
        if (playButton) {
          playButton.disabled = true;
          playButton.textContent = 'Connecting...';
        }
        
        try {
          // Check if Socket.IO is available
          if (typeof io === 'undefined') {
            logDebug('Error: Socket.IO not loaded. Check your internet connection.');
            if (playButton) {
              playButton.disabled = false;
              playButton.textContent = 'Play';
            }
            alert('Error: Could not connect to game server. Please check your internet connection and try again.');
            return;
          }
          
          // Connect to server with explicit options
          socket = io(SERVER_URL, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
          });
          
          logDebug('Socket.IO connection initiated');
          
          // Socket event handlers
          socket.on('connect', () => {
            logDebug(`Connected to server with ID: ${socket.id}`);
            socket.emit('playerJoin', { name: playerName });
          });
          
          socket.on('connect_error', (error) => {
            logDebug(`Connection error: ${error.message}`);
            if (playButton) {
              playButton.disabled = false;
              playButton.textContent = 'Play';
            }
            alert('Error connecting to the game server. Please try again.');
          });
          
          socket.on('gameInit', (data) => {
            logDebug(`Game initialized with ${Object.keys(data.players).length} players`);
            playerId = data.id;
            players = data.players;
            food = data.food;
            gameWidth = data.gameWidth;
            gameHeight = data.gameHeight;
            
            // Switch to game screen
            if (startScreen) startScreen.classList.add('hidden');
            if (gameScreen) gameScreen.classList.remove('hidden');
            
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
              if (scoreValue) scoreValue.textContent = players[playerId].score;
              if (lengthValue) lengthValue.textContent = players[playerId].segments.length;
              
              // Show/hide respawn overlay
              if (!players[playerId].alive && respawnOverlay && respawnOverlay.classList.contains('hidden')) {
                respawnOverlay.classList.remove('hidden');
                let countdown = 3;
                if (respawnTimer) respawnTimer.textContent = countdown;
                
                const timerInterval = setInterval(() => {
                  countdown--;
                  if (respawnTimer) respawnTimer.textContent = countdown;
                  
                  if (countdown <= 0) {
                    clearInterval(timerInterval);
                    
                    // Check if player is now alive (server may have respawned)
                    if (players[playerId] && players[playerId].alive && respawnOverlay) {
                      respawnOverlay.classList.add('hidden');
                    }
                  }
                }, 1000);
              } else if (players[playerId].alive && respawnOverlay && !respawnOverlay.classList.contains('hidden')) {
                respawnOverlay.classList.add('hidden');
              }
            }
          });
          
          socket.on('disconnect', () => {
            logDebug('Disconnected from server');
            gameRunning = false;
            
            // Handle disconnection - show message and reset UI
            if (startScreen) startScreen.classList.remove('hidden');
            if (gameScreen) gameScreen.classList.add('hidden');
            if (playButton) {
              playButton.disabled = false;
              playButton.textContent = 'Play';
            }
            
            alert('Disconnected from the game server. Please refresh the page to reconnect.');
          });
        } catch (error) {
          logDebug(`Error setting up Socket.IO: ${error.message}`);
          if (playButton) {
            playButton.disabled = false;
            playButton.textContent = 'Play';
          }
          alert(`Failed to start game: ${error.message}`);
        }
      } catch (error) {
        logDebug(`Error in startGame: ${error.message}`);
        if (playButton) {
          playButton.disabled = false;
          playButton.textContent = 'Play';
        }
        alert(`Failed to start game: ${error.message}`);
      }
    }
    
    // Game loop
    function gameLoop(timestamp) {
      if (!gameRunning) return;
      
      const deltaTime = timestamp - lastFrameTime;
      lastFrameTime = timestamp;
      
      // Update camera position to follow player
      updateCamera();
      
      // Clear canvas
      if (ctx) {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw world boundary
        drawWorldBoundary();
        
        // Draw food
        drawFood();
        
        // Draw players
        drawPlayers();
      }
      
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
        camera.x = head.x - (canvas ? canvas.width / 2 : 0);
        camera.y = head.y - (canvas ? canvas.height / 2 : 0);
        
        // Keep camera within game bounds
        camera.x = Math.max(0, Math.min(camera.x, gameWidth - (canvas ? canvas.width : 0)));
        camera.y = Math.max(0, Math.min(camera.y, gameHeight - (canvas ? canvas.height : 0)));
      }
    }
    
    // Draw world boundary
    function drawWorldBoundary() {
      if (!ctx) return;
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 2;
      ctx.strokeRect(-camera.x, -camera.y, gameWidth, gameHeight);
    }
    
    // Draw food items
    function drawFood() {
      if (!ctx) return;
      food.forEach(foodItem => {
        // Only draw food that's visible on screen (optimization)
        if (
          foodItem.x + 10 >= camera.x &&
          foodItem.x - 10 <= camera.x + (canvas ? canvas.width : 0) &&
          foodItem.y + 10 >= camera.y &&
          foodItem.y - 10 <= camera.y + (canvas ? canvas.height : 0)
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
      if (!ctx) return;
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
            segment.x - 15 <= camera.x + (canvas ? canvas.width : 0) &&
            segment.y + 15 >= camera.y &&
            segment.y - 15 <= camera.y + (canvas ? canvas.height : 0)
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
            head.x <= camera.x + (canvas ? canvas.width : 0) &&
            head.y >= camera.y &&
            head.y <= camera.y + (canvas ? canvas.height : 0)
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
      try {
        const minimapElem = document.getElementById('minimap');
        if (!minimapElem) {
          logDebug("Minimap element not found in drawMinimap");
          return;
        }
        
        const minimapCtx = minimapElem.getContext('2d');
        if (!minimapCtx) {
          logDebug("Could not get 2d context for minimap");
          return;
        }
        
        // Clear minimap
        minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        minimapCtx.fillRect(0, 0, minimapElem.width, minimapElem.height);
        
        // Draw world boundary
        minimapCtx.strokeStyle = '#444';
        minimapCtx.lineWidth = 1;
        minimapCtx.strokeRect(0, 0, minimapElem.width, minimapElem.height);
        
        // Calculate the scale factor
        const scaleX = minimapElem.width / gameWidth;
        const scaleY = minimapElem.height / gameHeight;
        
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
          (canvas ? canvas.width : 0) * scaleX,
          (canvas ? canvas.height : 0) * scaleY
        );
      } catch (error) {
        logDebug(`Error in drawMinimap: ${error.message}`);
      }
    }
    
    // Update leaderboard
    function updateLeaderboard() {
      if (!leaderboardList) return;
      
      try {
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
      } catch (error) {
        logDebug(`Error in updateLeaderboard: ${error.message}`);
      }
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
    logDebug('Game initialized and waiting for player to start');
  
  } catch (error) {
    logDebug(`Critical error in game initialization: ${error.message}`);
    console.error('Critical error in game initialization:', error);
    alert('There was a problem initializing the game. Please refresh the page and try again.');
  }
});
