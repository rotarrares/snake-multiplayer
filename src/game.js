// Game state management, player handling, collision detection
const GAME_WIDTH = 2000;
const GAME_HEIGHT = 2000;
const FOOD_COUNT = 50;
const TICK_RATE = 50; // ms
const SNAKE_SPEED = 5; // Pixels per tick
const SEGMENT_SPACING = 15; // Distance between segments for collision detection

// Game state
let players = {};
let food = [];
let gameInterval;

function initGame(io) {
  console.log('Initializing game');
  
  // Initialize food
  generateFood();
  
  // Set up game loop
  gameInterval = setInterval(() => {
    updateGame();
    io.emit('gameState', { players, food });
  }, TICK_RATE);
  
  // Socket connection handlers
  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    // Player joins the game
    socket.on('playerJoin', (data) => {
      try {
        console.log(`Player ${socket.id} joining with name: ${data?.name || 'Unknown'}`);
        
        const playerName = data?.name || `Player${Object.keys(players).length + 1}`;
        const playerColor = getRandomColor();
        
        // Create new player with random position
        players[socket.id] = {
          id: socket.id,
          name: playerName,
          color: playerColor,
          segments: [{
            x: Math.floor(Math.random() * (GAME_WIDTH - 100) + 50),
            y: Math.floor(Math.random() * (GAME_HEIGHT - 100) + 50)
          }],
          direction: { x: 1, y: 0 },
          score: 0,
          alive: true,
          // Add a flag to track if the player just ate food
          justAteFood: false,
          // Track last direction change time to prevent rapid changes
          lastDirectionChange: Date.now()
        };
        
        // Send initial game state to the new player
        socket.emit('gameInit', {
          id: socket.id,
          gameWidth: GAME_WIDTH,
          gameHeight: GAME_HEIGHT,
          players,
          food
        });
        
        console.log(`Player ${socket.id} joined successfully. Total players: ${Object.keys(players).length}`);
      } catch (error) {
        console.error(`Error in playerJoin handler: ${error.message}`);
      }
    });
    
    // Player changes direction
    socket.on('changeDirection', (direction) => {
      try {
        if (!direction || typeof direction !== 'object') {
          console.warn(`Invalid direction from player ${socket.id}`);
          return;
        }
        
        if (players[socket.id] && players[socket.id].alive) {
          // Allow more freedom in direction changes
          // Only prevent 180-degree turns (exactly opposite direction)
          const currentDir = players[socket.id].direction;
          
          // Normalize direction vector (make sure it's either 0, 1, or -1 for each component)
          direction = {
            x: Math.sign(direction.x) || 0,
            y: Math.sign(direction.y) || 0
          };
          
          // Don't allow both x and y to be non-zero (diagonal movement)
          if (direction.x !== 0 && direction.y !== 0) {
            // Choose the stronger component
            if (Math.abs(direction.x) > Math.abs(direction.y)) {
              direction.y = 0;
            } else {
              direction.x = 0;
            }
          }
          
          // If both components are zero, keep the current direction
          if (direction.x === 0 && direction.y === 0) {
            return;
          }
          
          // Check if trying to go in the exact opposite direction
          if (direction.x === -currentDir.x && direction.y === -currentDir.y) {
            console.log(`Player ${socket.id} attempted 180-degree turn, ignoring`);
            return;
          }
          
          // Set a minimum time between direction changes (100ms to prevent rapid flipping)
          const now = Date.now();
          if (now - players[socket.id].lastDirectionChange < 100) {
            return;
          }
          
          // Update direction and timestamp
          players[socket.id].direction = direction;
          players[socket.id].lastDirectionChange = now;
        }
      } catch (error) {
        console.error(`Error in changeDirection handler: ${error.message}`);
      }
    });
    
    // Player disconnects
    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
      delete players[socket.id];
    });
  });
  
  console.log('Game initialized');
}

function updateGame() {
  try {
    // Update each player's position
    Object.keys(players).forEach(id => {
      const player = players[id];
      if (!player || !player.alive) return;
      
      // Move head in current direction
      const head = { ...player.segments[0] };
      head.x += player.direction.x * SNAKE_SPEED;
      head.y += player.direction.y * SNAKE_SPEED;
      
      // Boundary check
      if (head.x < 0 || head.x > GAME_WIDTH || head.y < 0 || head.y > GAME_HEIGHT) {
        player.alive = false;
        setTimeout(() => respawnPlayer(id), 3000);
        return;
      }
      
      // Self collision check (skip the first few segments for smoother movement)
      // This makes it harder to accidentally collide with your own snake
      for (let i = 3; i < player.segments.length; i++) {
        if (distance(head, player.segments[i]) < SEGMENT_SPACING) {
          player.alive = false;
          setTimeout(() => respawnPlayer(id), 3000);
          return;
        }
      }
      
      // Other players collision check
      Object.keys(players).forEach(otherId => {
        if (id === otherId) return;
        
        const otherPlayer = players[otherId];
        if (!otherPlayer) return;
        
        for (let segment of otherPlayer.segments) {
          if (distance(head, segment) < SEGMENT_SPACING) {
            player.alive = false;
            setTimeout(() => respawnPlayer(id), 3000);
            return;
          }
        }
      });
      
      // Reset justAteFood flag from previous tick
      player.justAteFood = false;
      
      // Food collision check
      food.forEach((foodItem, index) => {
        if (distance(head, foodItem) < 15) {
          // Eat food
          player.score += 10;
          player.justAteFood = true;
          
          // Add a new segment at the end of the snake
          // (We'll handle actual growth during the segment update)
          
          // Replace food
          food[index] = {
            x: Math.floor(Math.random() * GAME_WIDTH),
            y: Math.floor(Math.random() * GAME_HEIGHT)
          };
        }
      });
      
      // Update segments
      // Add the new head position
      player.segments.unshift(head);
      
      // Remove the last segment unless the player just ate food
      if (!player.justAteFood) {
        player.segments.pop();
      }
    });
  } catch (error) {
    console.error(`Error in updateGame: ${error.message}`);
  }
}

function respawnPlayer(id) {
  try {
    if (!players[id]) return;
    
    players[id] = {
      ...players[id],
      segments: [{
        x: Math.floor(Math.random() * (GAME_WIDTH - 100) + 50),
        y: Math.floor(Math.random() * (GAME_HEIGHT - 100) + 50)
      }],
      direction: { x: 1, y: 0 },
      alive: true,
      justAteFood: false,
      lastDirectionChange: Date.now()
    };
    
    console.log(`Player ${id} respawned`);
  } catch (error) {
    console.error(`Error in respawnPlayer: ${error.message}`);
  }
}

function generateFood() {
  try {
    food = [];
    for (let i = 0; i < FOOD_COUNT; i++) {
      food.push({
        x: Math.floor(Math.random() * GAME_WIDTH),
        y: Math.floor(Math.random() * GAME_HEIGHT)
      });
    }
    console.log(`Generated ${food.length} food items`);
  } catch (error) {
    console.error(`Error in generateFood: ${error.message}`);
  }
}

function distance(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function getRandomColor() {
  const colors = [
    '#FF5252', '#FF4081', '#E040FB', '#7C4DFF', 
    '#536DFE', '#448AFF', '#40C4FF', '#18FFFF',
    '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

module.exports = { initGame };
