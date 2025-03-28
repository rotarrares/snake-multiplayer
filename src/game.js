// Game state management, player handling, collision detection
const GAME_WIDTH = 2000;
const GAME_HEIGHT = 2000;
const FOOD_COUNT = 50;
const TICK_RATE = 50; // ms

// Game state
let players = {};
let food = [];
let gameInterval;

function initGame(io) {
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
      const playerName = data.name || `Player${Object.keys(players).length + 1}`;
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
        alive: true
      };
      
      // Send initial game state to the new player
      socket.emit('gameInit', {
        id: socket.id,
        gameWidth: GAME_WIDTH,
        gameHeight: GAME_HEIGHT,
        players,
        food
      });
    });
    
    // Player changes direction
    socket.on('changeDirection', (direction) => {
      if (players[socket.id] && players[socket.id].alive) {
        // Prevent 180-degree turns (cannot turn directly backwards)
        const currentDir = players[socket.id].direction;
        if (!(direction.x === -currentDir.x && direction.y === -currentDir.y)) {
          players[socket.id].direction = direction;
        }
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
  // Update each player's position
  Object.keys(players).forEach(id => {
    const player = players[id];
    if (!player.alive) return;
    
    // Move head in current direction
    const head = { ...player.segments[0] };
    head.x += player.direction.x * 5;
    head.y += player.direction.y * 5;
    
    // Boundary check
    if (head.x < 0 || head.x > GAME_WIDTH || head.y < 0 || head.y > GAME_HEIGHT) {
      player.alive = false;
      setTimeout(() => respawnPlayer(id), 3000);
      return;
    }
    
    // Self collision check
    for (let i = 1; i < player.segments.length; i++) {
      if (distance(head, player.segments[i]) < 10) {
        player.alive = false;
        setTimeout(() => respawnPlayer(id), 3000);
        return;
      }
    }
    
    // Other players collision check
    Object.keys(players).forEach(otherId => {
      if (id === otherId) return;
      
      const otherPlayer = players[otherId];
      for (let segment of otherPlayer.segments) {
        if (distance(head, segment) < 10) {
          player.alive = false;
          setTimeout(() => respawnPlayer(id), 3000);
          return;
        }
      }
    });
    
    // Food collision check
    food.forEach((foodItem, index) => {
      if (distance(head, foodItem) < 15) {
        // Eat food
        player.score += 10;
        player.segments.push({ ...player.segments[player.segments.length - 1] });
        
        // Replace food
        food[index] = {
          x: Math.floor(Math.random() * GAME_WIDTH),
          y: Math.floor(Math.random() * GAME_HEIGHT)
        };
      }
    });
    
    // Update segments (follow the leader)
    player.segments.unshift(head);
    player.segments.pop();
  });
}

function respawnPlayer(id) {
  if (!players[id]) return;
  
  players[id] = {
    ...players[id],
    segments: [{
      x: Math.floor(Math.random() * (GAME_WIDTH - 100) + 50),
      y: Math.floor(Math.random() * (GAME_HEIGHT - 100) + 50)
    }],
    direction: { x: 1, y: 0 },
    alive: true
  };
}

function generateFood() {
  food = [];
  for (let i = 0; i < FOOD_COUNT; i++) {
    food.push({
      x: Math.floor(Math.random() * GAME_WIDTH),
      y: Math.floor(Math.random() * GAME_HEIGHT)
    });
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
