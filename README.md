# Snake Multiplayer Game

A real-time multiplayer Snake game built with Node.js, Express, Socket.IO, and HTML5 Canvas.

## Features

* **Multiplayer gameplay** - Multiple players can connect and play simultaneously
* **Real-time interaction** - Using Socket.IO for instant updates
* **Smooth snake movement** - With proper segment following behavior
* **Food collection** - Eating food makes your snake grow
* **Collision detection** - Die when hitting walls, other players, or yourself
* **Respawn system** - Automatically respawn after death
* **Leaderboard** - Shows top players ranked by score
* **Minimap** - Helps navigate the large game world
* **Custom player names** - Players can choose their name
* **Visual effects** - Snakes have eyes that follow their direction of movement

## How to Play

1. Enter your name and click "Play"
2. Use WASD or arrow keys to change direction
3. Eat food to grow longer and increase your score
4. Avoid hitting walls, other players, or yourself
5. Try to become the longest snake on the leaderboard

## Project Structure

* **server.js** - Main server file (Express + Socket.IO)
* **/src** - Server-side game logic
  * **game.js** - Game state management, player handling, collision detection
* **/public** - Client-side files
  * **index.html** - Game interface
  * **style.css** - Game styling
  * **game.js** - Client-side game logic and rendering

## Technical Implementation

* **Backend**: Node.js with Express and Socket.IO
* **Frontend**: HTML5 Canvas for rendering
* **Game Loop**: Server-side updates at fixed intervals
* **State Management**: Central game state on server with client prediction

## Deployment on Heroku

This project is configured for easy deployment on Heroku, where both the frontend and backend are served from the same application.

### Deployment Instructions

1. Create a free Heroku account at [heroku.com](https://heroku.com) if you don't have one
2. Install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
3. Login to Heroku CLI:
   ```
   heroku login
   ```
4. Create a new Heroku app:
   ```
   heroku create snake-multiplayer-game
   ```
   Note: Replace `snake-multiplayer-game` with your preferred name (must be unique on Heroku)
5. Deploy your code to Heroku:
   ```
   git push heroku main
   ```
6. Open your deployed application:
   ```
   heroku open
   ```

### Environment Variables

No additional environment variables are required for basic deployment.

## Local Development

1. Clone the repository: `git clone https://github.com/rotarrares/snake-multiplayer.git`
2. Navigate to the project directory: `cd snake-multiplayer`
3. Install dependencies: `npm install`
4. Start the server: `npm start`
5. Open a web browser and go to: `http://localhost:3000`

## License

MIT
