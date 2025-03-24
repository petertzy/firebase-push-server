const express = require("express");
const admin = require("../config/firebase");
const { Pool } = require("pg");  // 使用 PostgreSQL 连接池
const router = express.Router();

// 数据库连接配置
const pool = new Pool({
  connectionString: "postgresql://serverdb_nlx8_user:A4F9D2CdMA61udAG7PVlWYRPiEBSmBlw@dpg-cvgk9c7noe9s73ce01i0-a.frankfurt-postgres.render.com/serverdb_nlx8",
  ssl: { rejectUnauthorized: false },  // Render 平台的 SSL 配置
});

// 存储 WebSocket 客户端连接
let clients = [];

// 发送推送通知
router.post("/send-notification", async (req, res) => {
  const { title, body, image, link, time, author } = req.body;

  if (!title || !body) {
    return res.status(400).json({ success: false, message: "缺少必要的字段" });
  }

  try {
    // 从数据库中获取所有设备令牌
    const result = await pool.query("SELECT * FROM device_tokens");
    const tokens = result.rows.map(row => row.token);  // 提取所有设备的 token

    if (tokens.length === 0) {
      return res.status(404).json({ success: false, message: "没有可用的设备 Token" });
    }

    // 构建推送通知消息
    const message = {
      notification: { title, body, image: image || "" },
      data: { link: link || "", time: time || "", author: author || "" },
    };

    // 推送通知到所有设备
    const promises = tokens.map(token => {
      return admin.messaging().send({ ...message, token });
    });

    const responses = await Promise.all(promises);  // 等待所有通知发送完成

    console.log("✅ 推送通知发送成功:", responses);

    // WebSocket 广播
    clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ title, body, image, link, time, author }));
      }
    });

    res.status(200).json({ success: true, message: "通知发送成功" });
  } catch (error) {
    console.error("❌ 发送通知失败:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = { router, clients };
