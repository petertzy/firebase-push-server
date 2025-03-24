const express = require("express");
const admin = require("../config/firebase");
const router = express.Router();

let clients = []; // 存储 WebSocket 连接的客户端

// 发送推送通知
router.post("/send-notification", async (req, res) => {
  const { token, title, body, image, link, time, author } = req.body;

  if (!token || !title || !body) {
    return res.status(400).json({ success: false, message: "缺少必要的字段" });
  }

  const message = {
    notification: { title, body, image: image || "" },
    data: { link: link || "", time: time || "", author: author || "" },
    token: token,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("✅ 推送通知发送成功:", response);

    // WebSocket 广播
    clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ title, body, image, link, time, author }));
      }
    });

    res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    console.error("❌ 发送通知失败:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = { router, clients };
