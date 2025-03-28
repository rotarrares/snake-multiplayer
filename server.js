const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const cors = require('cors');
const { initGame } = require('./src/game');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Configure CORS for production
const allowedOrigins = [
  'http://localhost:3000',
  'https://rotarrares.github.io', // GitHub Pages URL
];

// Configure Socket.IO with CORS settings
const io = socketIO(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Serve static files
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize game
initGame(io);

// For local development, provide the index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint for the backend
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Snake Multiplayer backend is running' });
});

// Use PORT from environment or default to 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
