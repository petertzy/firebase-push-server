const express = require("express");
const admin = require("../config/firebase");
const { Pool } = require("pg"); // Import PostgreSQL
const router = express.Router();

let clients = []; // Store WebSocket-connected clients

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Load database connection string from environment variables
  ssl: {
    rejectUnauthorized: false, // Required for Render's SSL configuration
  },
});

// Remove invalid FCM token
async function removeInvalidFCMToken(token) {
  const client = await pool.connect();
  try {
    await client.query("DELETE FROM device_tokens WHERE token = $1", [token]);
    console.log(`FCM token ${token} deleted successfully.`);
  } catch (error) {
    console.error(`Failed to delete token ${token}:`, error);
  } finally {
    client.release();
  }
}

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

    // Check and remove invalid FCM tokens
    if (response.failureCount > 0) {
      const failedTokens = response.results
        .map((result) => result.error ? token : null)
        .filter(Boolean); // Get failed tokens

      // For each invalid token, remove it
      for (let failedToken of failedTokens) {
        await removeInvalidFCMToken(failedToken);
      }
    }

    res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    console.error("Failed to send notification:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = { router, clients };
