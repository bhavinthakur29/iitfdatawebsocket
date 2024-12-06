const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

// Initialize Express app
const app = express();

// Enable CORS to allow connections from all origins (You can restrict this to specific domains for production)
app.use(cors({ origin: '*' }));

// Set up a simple Express route (Optional, if you want to serve something via HTTP as well)
app.get('/', (req, res) => {
  res.send('Taekwondo WebSocket Server is running!');
});

// Start HTTP server on port 8080
const server = app.listen(process.env.PORT || 8080, () => {
  console.log('Server running on port 8080');
});

// Set up WebSocket server using the Express server
const wss = new WebSocket.Server({ server });

// Match data that will be shared across all WebSocket connections
let matchData = {
  fighter1: '',
  fighter2: '',
  timer: 60,
  isRunning: false,
  isPaused: false,
};

// Handle new WebSocket connections
wss.on('connection', (ws) => {
  console.log('A new WebSocket client connected');

  // Send initial match data to the newly connected client
  ws.send(JSON.stringify({ type: 'MATCH_DATA', data: matchData }));

  // Handle incoming messages from clients
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('Received:', data);

    // Handle start match message
    if (data.type === 'START') {
      matchData = {
        ...data.data,        // Update match data from the client
        isRunning: true,
        isPaused: false,
        timer: 60,           // Reset timer to 60 seconds
      };
      startTimer();
    }

    // Handle update match message (pause, resume, etc.)
    if (data.type === 'UPDATE') {
      matchData = { ...matchData, ...data.data };
    }

    // Broadcast the updated match data to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'MATCH_DATA', data: matchData }));
      }
    });
  });

  // Handle WebSocket connection close
  ws.on('close', () => {
    console.log('A WebSocket client disconnected');
  });
});

// Timer handling logic
let timerInterval = null;

// Start the countdown timer for the match
function startTimer() {
  if (timerInterval) clearInterval(timerInterval); // Clear any existing timer interval
  timerInterval = setInterval(() => {
    if (matchData.isRunning && !matchData.isPaused) {
      matchData.timer -= 1;

      if (matchData.timer <= 0) {
        matchData.timer = 0;
        matchData.isRunning = false; // Stop the match when the timer hits 0
        clearInterval(timerInterval);
      }

      // Broadcast updated match data to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'MATCH_DATA', data: matchData }));
        }
      });
    }
  }, 1000); // Update every second
}

// Stop the match and reset all states
function stopMatch() {
  if (timerInterval) clearInterval(timerInterval); // Stop the timer
  matchData = {
    fighter1: '',
    fighter2: '',
    timer: 60,
    isRunning: false,
    isPaused: false,
  };

  // Broadcast reset match data to all connected clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'MATCH_DATA', data: matchData }));
    }
  });
}

// Expose a stop match route (optional, for manual stopping)
app.post('/stop', (req, res) => {
  stopMatch();
  res.send('Match stopped and reset.');
});

console.log('WebSocket server running on wss://taekwondo-websocket-server.onrender.com');
