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

// Send push notification to all devices
router.post("/send-notification", async (req, res) => {
  const { tokens, title, body, image, link, time, author } = req.body;

  // Ensure tokens is not undefined or an empty array
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return res.status(400).json({ success: false, message: "Tokens array is required and cannot be empty" });
  }

  if (!title || !body) {
    return res.status(400).json({ success: false, message: "Missing required fields: title, body" });
  }

  try {
    const message = {
      notification: { title, body, image: image || "" },
      data: { link: link || "", time: time || "", author: author || "" },
    };

    // Send push notification
    const response = await admin.messaging().send({
      token: tokens[0],
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
    });

    console.log("Push notification sent successfully:", response);

    // WebSocket broadcast message
    clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ title, body, image, link, time, author }));
      }
    });

    // Check and remove invalid FCM tokens
    if (response.failureCount > 0 && Array.isArray(response.results)) {
      const failedTokens = response.results
        .map((result, index) => (result.error ? tokens[index] : null))
        .filter(Boolean); // Filter out invalid tokens

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
