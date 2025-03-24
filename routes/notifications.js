const express = require("express");
const admin = require("../config/firebase");
const { Pool } = require("pg");
const router = express.Router();

// 创建 PostgreSQL 连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // 请确保此环境变量已设置为数据库连接字符串
});

let clients = []; // 存储 WebSocket 连接的客户端

// 获取所有设备 token
const getAllDeviceTokens = async () => {
  try {
    const result = await pool.query("SELECT token FROM device_tokens");
    return result.rows.map(row => row.token); // 返回所有的设备 token
  } catch (error) {
    console.error("获取设备 token 失败:", error);
    throw new Error("Failed to get device tokens");
  }
};

// 发送推送通知
router.post("/send-notification", async (req, res) => {
  const { title, body, image, link, time, author } = req.body;

  if (!title || !body) {
    return res.status(400).json({ success: false, message: "缺少必要的字段" });
  }

  // 获取所有设备 token
  let deviceTokens;
  try {
    deviceTokens = await getAllDeviceTokens();
  } catch (error) {
    return res.status(500).json({ success: false, message: "获取设备 token 失败" });
  }

  // 构建通知消息
  const message = {
    notification: { title, body, image: image || "" },
    data: { link: link || "", time: time || "", author: author || "" },
  };

  // 推送通知到每个设备 token
  try {
    const responses = await Promise.all(
      deviceTokens.map((token) => {
        return admin.messaging().send({
          ...message,
          token: token, // 为每个设备发送推送通知
        });
      })
    );

    console.log("✅ 推送通知发送成功:", responses);

    // WebSocket 广播
    clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ title, body, image, link, time, author }));
      }
    });

    res.status(200).json({ success: true, message: "通知已成功发送" });
  } catch (error) {
    console.error("❌ 发送通知失败:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = { router, clients };
