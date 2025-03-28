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

// Configure Socket.IO with explicit CORS settings
const io = socketIO(server, {
  cors: {
    origin: "*", // Allow all origins in development
    methods: ["GET", "POST"],
    credentials: true
  }
});

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

// Debug endpoint to check if server is running
app.get('/debug', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    socketio: 'enabled',
    version: require('./package.json').version
  });
});

// Use PORT from environment (Heroku sets this) or default to 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
