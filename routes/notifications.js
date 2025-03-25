const express = require("express");
const admin = require("../config/firebase");
const router = express.Router();

let clients = []; // Store WebSocket-connected clients

// Send push notification
router.post("/send-notification", async (req, res) => {
  const { token, title, body, image, link, time, author } = req.body;

  if (!token || !title || !body) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const message = {
    notification: { title, body, image: image || "" },
    data: { link: link || "", time: time || "", author: author || "" },
    token: token,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Push notification sent successfully:", response);

    // WebSocket broadcast
    clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ title, body, image, link, time, author }));
      }
    });

    res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    console.error("Failed to send notification:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = { router, clients };
