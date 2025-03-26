const express = require("express");
const admin = require("../config/firebase");
const { Pool } = require("pg"); // PostgreSQL 连接
const router = express.Router();

let clients = []; // WebSocket 连接的客户端列表

// PostgreSQL 连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // 从环境变量加载数据库连接信息
  ssl: { rejectUnauthorized: false }, // 适用于 Render 等平台
});

// **移除无效的 FCM 令牌**
async function removeInvalidFCMToken(token) {
  const client = await pool.connect();
  try {
    await client.query("DELETE FROM device_tokens WHERE token = $1", [token]);
    console.log(`FCM token ${token} 已被删除.`);
  } catch (error) {
    console.error(`删除无效 FCM token 失败 (${token}):`, error);
  } finally {
    client.release();
  }
}

// **发送推送通知**
router.post("/send-notification", async (req, res) => {
  const { tokens, title, body, image, link, time, author } = req.body;

  // **参数校验**
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return res.status(400).json({ success: false, message: "Tokens 数组不能为空" });
  }

  if (!title || !body) {
    return res.status(400).json({ success: false, message: "缺少必填字段: title 或 body" });
  }

  try {
    // **组装推送消息**
    const message = {
      notification: {
        title,
        body,
        image: image || "",
      },
      data: {
        link: link || "",
        time: time || "",
        author: author || "",
      },
    };

    // **改用 `sendMulticast` 进行群发**
    const response = await admin.messaging().sendMulticast({
      tokens,
      notification: message.notification,
      data: message.data,
    });

    console.log("🔔 群发推送成功:", JSON.stringify(response, null, 2));

    // **WebSocket 广播通知**
    clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ title, body, image, link, time, author }));
      }
    });

    // **处理无效的 FCM 令牌**
    if (response.failureCount > 0) {
      const failedTokens = response.responses
        .map((result, index) => (result.error ? tokens[index] : null))
        .filter(Boolean); // 过滤无效的 token

      console.log(`❌ 发现 ${failedTokens.length} 个无效 FCM token，正在删除...`);
      for (let failedToken of failedTokens) {
        await removeInvalidFCMToken(failedToken);
      }
    }

    return res.status(200).json({ success: true, results: response });

  } catch (error) {
    console.error("🚨 发送推送通知失败:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = { router, clients };
