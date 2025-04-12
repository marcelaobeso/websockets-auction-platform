const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const auctionItemsFile = require("./auctionItems");
const { type } = require("os");

// initialize express app
const app = express();
const PORT = 3000;

//global bid history storage
const bidHistory = [];

// Middleware
app.use(cors());
app.use(express.json());


//Create a HTTP Server by using the same express instance
const server = http.createServer(app); //receives a parameter that is the event listener, this app is already has a listener event attached to it

// Create a WebSocket server and attacho it to the HTTP server
const wss = new WebSocket.Server({ server }); //the 'server' creates the initial pipe, ant the wss is to upgrade it to be a websocket server

/**
 * ==========================Rest API==========================
 */
app.get("/", (req, res) => {
  res.status(200).send("MLH GHW API Week!");
});

/**
 * returns all items in the auction
 */
app.get("/api/items", (req, res) => {
  res.status(200).json(auctionItemsFile);
});

/**
 * retrieves items by id
 * @param {number} id - id of the item
 */
app.get("/api/items/:id", (req, res) => {
  const reqId = parseInt(req.params.id);
  const item = auctionItemsFile.auctionItems.find((item) => item.id === reqId);
  if (!item) {
    return res.status(404).json({
      error: "Item not found",
    });
  }
  res.status(200).json(item);
});

app.post("/api/bids", (req, res) => {
  const { itemId, bidAmount, bidder } = req.body;

  if (!itemId || !bidAmount || !bidder) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const foundItem = auctionItemsFile.auctionItems.find(
    (item) => item.id === parseInt(itemId)
  );

  if (!foundItem) {
    return res.status(404).json({ error: "Item not found" });
  }

  if (parseInt(bidAmount) <= foundItem.currentBid) {
    return res
      .status(400)
      .json({ error: "Bid must be higher than current bid" });
  }

  foundItem.currentBid = parseInt(bidAmount); // Update the item with new bid
  const newBid = {
    id: bidHistory.length + 1,
    itemId: parseInt(itemId),
    bidder,
    amount: parseInt(bidAmount),
    timeStamp: new Date().toISOString(),
  };

  foundItem.bids.push(newBid);
  bidHistory.push(newBid);

  res.status(201).json(newBid);
  console.log(bidHistory);
});
/**
 * GET /api/history
 * Retrieves the bid history
 */
app.get("/api/history", (req, res) => {
  res.status(200).json(bidHistory);
}
);

/** =========================== web socket connection handler ==========================
 * Thse roites demosnrate realtime bi-directional communication between the server and the client
 * **/
// Handle WebSocket connections
wss.on("connection", (ws) => {
  console.log("Client Connected")
  ws.send(JSON.stringify({
    type: "INITIAL_DATA",
    auctionItems: auctionItemsFile.auctionItems,
  })); 

  // incoming message from the client

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);
      if(data.type === "NEW_BID"){
        const { itemId, bidAmount, bidder } = data;
        if (!itemId || !bidAmount || !bidder) {
          return ws.send(JSON.stringify({ type: "ERROR", message: "Missing required fields" }));
        }
        const foundItem = auctionItemsFile.auctionItems.find(
          (item) => item.id === parseInt(itemId)
        );
        if (!foundItem) {
          return ws.send(JSON.stringify({ type: "ERROR", message: "Item not found" }));
        }
        if (parseInt(bidAmount) <= foundItem.currentBid) {
          return ws.send(JSON.stringify({ type: "ERROR", message: "Bid must be higher than current bid" }));
        }
        foundItem.currentBid = parseInt(bidAmount); // Update the item with new bid
        const newBid = {
          id: bidHistory.length + 1,
          itemId: parseInt(itemId),
          bidder,
          amount: parseInt(bidAmount),
          timeStamp: new Date().toISOString(),
        };
        foundItem.bids.push(newBid);
        bidHistory.push(newBid);
        ws.send(JSON.stringify({ type: "BID_UPDATE", newBid }));
         // Broadcast the new bid to all connected clients
         broadcastBidUpdated(foundItem, newBid);
         console.log(bidHistory);
      }
      
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(JSON.stringify({ type: "ERROR", message: "invalid message format" }));
    }
  })

  // Handle client disconnection
  ws.on("close", () => {
    console.log("Client Disconnected");
  }
  );
})

// BROADCAST FUNCTION TO ALL CONNECTED CLIENTS
/**
 * Broadcasts the new bid to all connected clients
 * @param {object} item - The auction item that was updated
 * @param {object} bid - The new bid object
 * This is used to keep all connected clients updated
 */
function broadcastBidUpdated(item, bid){
  // Broadcast the new bid to all connected clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: "BID_UPDATE",
        item,
        bid
      }));
    }
  }
  );
}


// Start the server - it listens to the port
server.listen(PORT, () => {
  console.log(`Server UP & RUNNING on Port ${PORT}`);
  console.log(`REST API: http://localhost:${PORT}/api/items`);
  console.log(`WebSocket API: ws://localhost:${PORT}`);
});
