const express = require('express');
const router = express.Router();
const { Client } = require('pg');
require('dotenv').config();

// 获取连接字符串
const connectionString = process.env.DATABASE_URL;

// 创建数据库客户端
const client = new Client({
  connectionString: connectionString,
});

// 连接到数据库
client.connect();

// 注册设备，存储 token
router.post('/register-device', async (req, res) => {
  const { deviceId, token } = req.body;

  if (!deviceId || !token) {
    return res.status(400).json({ success: false, message: 'deviceId 和 token 不能为空' });
  }

  try {
    // 查询是否已存在该设备
    const existingDevice = await client.query('SELECT * FROM device_tokens WHERE device_id = $1', [deviceId]);

    if (existingDevice.rows.length > 0) {
      // 更新现有设备的 token
      await client.query('UPDATE device_tokens SET token = $1 WHERE device_id = $2', [token, deviceId]);
    } else {
      // 插入新的设备记录
      await client.query('INSERT INTO device_tokens (device_id, token) VALUES ($1, $2)', [deviceId, token]);
    }

    console.log('📲 设备注册成功:', { deviceId, token });
    res.status(200).json({ success: true, message: '设备 token 已存储' });
  } catch (error) {
    console.error('Error storing device token:', error);
    res.status(500).json({ success: false, message: '存储设备 token 失败' });
  }
});

module.exports = router;
