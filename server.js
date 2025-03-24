const express = require("express");
const cors = require("cors");
const http = require("http");
const dotenv = require("dotenv");
const setupWebSocket = require("./websocket/websocket");
const { router: notificationRoutes } = require("./routes/notifications");

dotenv.config();
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 挂载 API 路由
app.use("/api", notificationRoutes);

// 创建 HTTP 服务器
const server = http.createServer(app);
setupWebSocket(server); // 启动 WebSocket 服务器

server.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
});
