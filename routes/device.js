const express = require("express");
const { Pool } = require("pg"); // Import PostgreSQL connection pool
const router = express.Router();

// Use the external connection URL from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Load from environment variables
  ssl: {
    rejectUnauthorized: false, // Required for Render's SSL configuration
  },
});

/**
 * Store Device Token
 * @route POST /device-tokens
 */
router.post("/device-tokens", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token cannot be empty" });
    }

    // Check if the token already exists to prevent duplicates
    const existingToken = await pool.query("SELECT * FROM device_tokens WHERE token = $1", [token]);

    if (existingToken.rows.length > 0) {
      return res.status(200).json({ message: "Token already exists, no need to store again" });
    }

    // Insert token into the database
    await pool.query("INSERT INTO device_tokens (token) VALUES ($1)", [token]);

    res.status(201).json({ message: "Token stored successfully" });
  } catch (error) {
    console.error("Failed to store device token:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Retrieve a Device Token
 * @route GET /get-device-token
 */
router.get("/get-device-token", async (req, res) => {
  try {
    // Query to fetch all tokens from the device_tokens table
    const result = await pool.query("SELECT token FROM device_tokens");

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "No device tokens found" });
    }

    const tokens = result.rows.map(row => row.token); // Extract all tokens
    res.status(200).json({ tokens }); // Return the tokens
  } catch (error) {
    console.error("Failed to retrieve device tokens:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Delete a Specific Device Token
 * @route DELETE /device-tokens/:token
 */
/*
router.delete("/device-tokens/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // Ensure a token is provided
    if (!token) {
      return res.status(400).json({ error: "Token parameter cannot be empty" });
    }

    // Delete the token
    const result = await pool.query("DELETE FROM device_tokens WHERE token = $1", [token]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Token not found" });
    }

    res.json({ message: "Token deleted successfully" });
  } catch (error) {
    console.error("Failed to delete device token:", error);
    res.status(500).json({ error: "Server error" });
  }
});
*/

module.exports = router;
