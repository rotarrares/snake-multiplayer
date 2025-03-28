const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const cors = require('cors');
const { initGame } = require('./src/game');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors());

// Configure Socket.IO
const io = socketIO(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize game
initGame(io);

// Send index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Snake Multiplayer is running' });
});

// Use PORT from environment (Heroku sets this) or default to 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
