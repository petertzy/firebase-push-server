const WebSocket = require("ws");
const { clients } = require("../routes/notifications");

const setupWebSocket = (server) => {
  const wss = new WebSocket.Server({ noServer: true });

  wss.on("connection", (ws) => {
    clients.push(ws);
    console.log("WebSocket: Client connected");

    ws.on("close", () => {
      const index = clients.indexOf(ws);
      if (index !== -1) clients.splice(index, 1);
      console.log("WebSocket: Client disconnected");
    });
  });

  server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });
};

module.exports = setupWebSocket;
