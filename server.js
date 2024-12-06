const WebSocket = require('ws');

// Listen on all network interfaces
const wss = new WebSocket.Server({ host: '0.0.0.0', port: process.env.PORT || 8080 });

wss.on('connection', (ws) => {
  console.log('A new client connected');
  
  // Send current match data to the new client
  ws.send(JSON.stringify(matchData));

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    // Update match data based on incoming messages
    if (data.type === 'START') {
      matchData = {
        ...data.data,
        isRunning: true,
        isPaused: false,
      };
    } else if (data.type === 'UPDATE') {
      matchData = { ...matchData, ...data.data };
    }

    // Broadcast the updated match data to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(matchData));
      }
    });
  });

  ws.on('close', () => {
    console.log('A client disconnected');
  });
});

console.log('WebSocket server running on wss://0.0.0.0:8080');
