const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
require('dotenv').config();

// 获取连接字符串
const connectionString = process.env.DATABASE_URL;

// 创建 PostgreSQL 连接池
const pool = new Pool({
  connectionString: connectionString,
});

// 注册设备，存储 token
router.post('/register-device', async (req, res) => {
  const { deviceId, token } = req.body;

  if (!deviceId || !token) {
    return res.status(400).json({ success: false, message: 'deviceId 和 token 不能为空' });
  }

  try {
    // 使用 ON CONFLICT 来处理插入和更新操作
    const result = await pool.query(
      `INSERT INTO device_tokens (device_id, token) 
      VALUES ($1, $2)
      ON CONFLICT (device_id) 
      DO UPDATE SET token = $2 
      RETURNING *`,
      [deviceId, token]
    );

    console.log('📲 设备注册成功:', { deviceId, token });
    res.status(200).json({ success: true, message: '设备 token 已存储' });
  } catch (error) {
    console.error('Error storing device token:', error);
    res.status(500).json({ success: false, message: '存储设备 token 失败' });
  }
});

module.exports = router;
