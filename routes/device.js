const express = require("express");
const { Pool } = require("pg"); // 导入 PostgreSQL 连接池
const router = express.Router();

// 使用提供的外部连接地址
const pool = new Pool({
  connectionString: "postgresql://serverdb_nlx8_user:A4F9D2CdMA61udAG7PVlWYRPiEBSmBlw@dpg-cvgk9c7noe9s73ce01i0-a.frankfurt-postgres.render.com/serverdb_nlx8",
  ssl: {
    rejectUnauthorized: false, // 必须设置为 false 以适应 Render 上的 SSL 配置
  },
});

/**
 * 📌 存储设备 Token
 * @route POST /device-tokens
 */
router.post("/device-tokens", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token 不能为空" });
    }

    // 检查 Token 是否已存在，防止重复存储
    const existingToken = await pool.query("SELECT * FROM device_tokens WHERE token = $1", [token]);

    if (existingToken.rows.length > 0) {
      return res.status(200).json({ message: "Token 已存在，无需存储" });
    }

    // 插入 Token 到数据库
    await pool.query("INSERT INTO device_tokens (token) VALUES ($1)", [token]);

    res.status(201).json({ message: "Token 存储成功" });
  } catch (error) {
    console.error("❌ 存储设备 Token 失败:", error);
    res.status(500).json({ error: "服务器错误" });
  }
});

/**
 * 📌 获取所有设备 Token
 * @route GET /device-tokens
 */
router.get("/device-tokens", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM device_tokens");
    res.json(result.rows);
  } catch (error) {
    console.error("❌ 获取设备 Token 失败:", error);
    res.status(500).json({ error: "服务器错误" });
  }
});

/**
 * 📌 删除指定设备 Token
 * @route DELETE /device-tokens/:token
 */
router.delete("/device-tokens/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // 确保提供了 token
    if (!token) {
      return res.status(400).json({ error: "Token 参数不能为空" });
    }

    // 删除 Token
    const result = await pool.query("DELETE FROM device_tokens WHERE token = $1", [token]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Token 未找到" });
    }

    res.json({ message: "Token 删除成功" });
  } catch (error) {
    console.error("❌ 删除设备 Token 失败:", error);
    res.status(500).json({ error: "服务器错误" });
  }
});

module.exports = router;
