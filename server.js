const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const WebSocket = require('ws');  // Import WebSocket library
require('dotenv').config();  // Load environment variables from .env file

const app = express();
const PORT = 3000;

// Firebase configuration, read from environment variables
const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle newline characters
    client_email: process.env.FIREBASE_CLIENT_EMAIL
};

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Middleware setup
app.use(cors());
app.use(express.json());

// WebSocket server configuration
const wss = new WebSocket.Server({ noServer: true });

// Store all connected WebSocket clients
let clients = [];

// Handle WebSocket connections
wss.on('connection', (ws) => {
    clients.push(ws);  // Add the connected client to the list
    console.log('WebSocket: Client connected');

    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);  // Remove client from list when disconnected
        console.log('WebSocket: Client disconnected');
    });
});

// Simulated notification data
const notifications = [
    { title: 'Notification 1', body: 'This is the first notification' },
    { title: 'Notification 2', body: 'This is the second notification' },
    { title: 'Notification 3', body: 'This is the third notification' }
];

// API endpoint: Get the list of notifications
app.get('/api/notifications', (req, res) => {
    res.status(200).json({ notifications });
});

// API endpoint: Send a push notification
app.post('/send-notification', async (req, res) => {
    // Destructure incoming data from the request body
    const { token, title, body, image, link, time, author } = req.body;

    // Construct the notification message
    const message = {
        notification: {
            title: title,
            body: body,
            image: image || '',  // Include image URL if provided
        },
        data: {
            link: link || '',  // Include link if provided
            time: time || '',  // Include time if provided
            author: author || '',  // Include author if provided
        },
        token: token // Must be the device's FCM token
    };

    try {
        // Send Firebase push notification
        const response = await admin.messaging().send(message);
        console.log('Push notification sent successfully:', response);

        // Broadcast the notification to all connected WebSocket clients
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ title, body, image, link, time, author }));
            }
        });

        res.status(200).json({ success: true, messageId: response });
    } catch (error) {
        console.error('Failed to send push notification:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start the HTTP server
const server = app.listen(PORT, () => {
    console.log(`HTTP server is running on port ${PORT}`);
});

// WebSocket upgrade handling
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
