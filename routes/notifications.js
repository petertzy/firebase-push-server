const express = require("express");
const admin = require("../config/firebase");
const { Pool } = require("pg"); // PostgreSQL connection
const router = express.Router();

let clients = []; // WebSocket connected clients list

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Load connection info from environment
  ssl: { rejectUnauthorized: false }, // Required for platforms like Render
});

// **Remove invalid FCM tokens**
async function removeInvalidFCMToken(token) {
  const client = await pool.connect();
  try {
    await client.query("DELETE FROM device_tokens WHERE token = $1", [token]);
    console.log(`FCM token ${token} has been deleted.`);
  } catch (error) {
    console.error(`Failed to delete invalid FCM token (${token}):`, error);
  } finally {
    client.release();
  }
}

// **Send push notification**
router.post("/send-notification", async (req, res) => {
  const { tokens, title, body, image, link, time, author } = req.body;

  // **Parameter validation**
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return res.status(400).json({ success: false, message: "Tokens array cannot be empty" });
  }

  if (!title || !body) {
    return res.status(400).json({ success: false, message: "Missing required fields: title or body" });
  }

  try {
    // **Construct push message**
    const message = {
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
    };

    // **Recommend using `sendEachForMulticast` for sending to multiple devices**
    const response = await admin.messaging().sendEachForMulticast({
      tokens: tokens, // Target device tokens
      notification: message.notification,
      data: message.data,
    });

    console.log("Successfully sent multicast push notification:", JSON.stringify(response, null, 2));

    // **WebSocket broadcast notification**
    clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ title, body, image, link, time, author }));
      }
    });

    // **Handle invalid FCM tokens**
    if (response.failureCount > 0) {
      const failedTokens = response.responses
        .map((result, index) => (result.error ? tokens[index] : null))
        .filter(Boolean); // Filter out invalid tokens

      console.log(`Found ${failedTokens.length} invalid FCM tokens, deleting...`);
      for (let failedToken of failedTokens) {
        await removeInvalidFCMToken(failedToken);
      }
    }

    return res.status(200).json({ success: true, results: response });

  } catch (error) {
    console.error("Failed to send push notification:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = { router, clients };
