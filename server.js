const express = require("express");
const cors = require("cors");
const http = require("http");
const dotenv = require("dotenv");
const setupWebSocket = require("./websocket/websocket");
const deviceRoutes = require("./routes/device");
const { router: notificationRoutes } = require("./routes/notifications");

dotenv.config();
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Mount API routes
app.use("/api", deviceRoutes);
app.use("/api", notificationRoutes);

// Create an HTTP server
const server = http.createServer(app);
setupWebSocket(server); // Start the WebSocket server

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
