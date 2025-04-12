//WEB SOCKET EXPLANATION, NOT IN USE
const http = require("http");
const WebSocket = require("ws");


const PORT = 3001;

// Create a HTTP Server
const server = http.createServer((req, res) =>{
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end("WebSocket Server is running\n");
}); //receives a parameter that is the event listener, this app is already has a listener event attached to it

// Create a WebSocket server
const wss = new WebSocket.Server({ server }); //the 'server' creates the initial pipe, ant the wss is to upgrade it to be a websocket server
// Handle WebSocket connections
wss.on("connection", (ws) => {
  console.log("Client Connected")
  ws.send(JSON.stringify({message: 'HEllo from WS'})); // Send the current bid history to the newly connected client
  ws.on("close", () => {
    console.log("Client Disconnected");
  }
  );
})

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server is running on ws://localhost:${PORT}`);
}
);