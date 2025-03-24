const express = require("express");
const router = express.Router();

let deviceTokens = []; // 临时存储设备 token（建议使用数据库）

// 注册设备，存储 token
router.post("/register-device", (req, res) => {
  const { deviceId, token } = req.body;

  if (!deviceId || !token) {
    return res.status(400).json({ success: false, message: "deviceId 和 token 不能为空" });
  }

  // 避免重复存储 token
  const existingIndex = deviceTokens.findIndex((d) => d.deviceId === deviceId);
  if (existingIndex !== -1) {
    deviceTokens[existingIndex].token = token; // 更新 token
  } else {
    deviceTokens.push({ deviceId, token });
  }

  console.log("📲 设备注册成功:", { deviceId, token });
  res.status(200).json({ success: true, message: "设备 token 已存储" });
});

module.exports = router;
