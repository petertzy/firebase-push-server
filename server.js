const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const WebSocket = require('ws');  // 导入 WebSocket 库
require('dotenv').config();  // 加载 .env 文件中的环境变量

const app = express();
const PORT = 3000;

// Firebase 配置信息，从环境变量读取
const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // 处理换行符
    client_email: process.env.FIREBASE_CLIENT_EMAIL
};

// 初始化 Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// 使用中间件
app.use(cors());
app.use(express.json());

// WebSocket 服务端配置
const wss = new WebSocket.Server({ noServer: true });

// 存储所有连接的 WebSocket 客户端
let clients = [];

// 处理 WebSocket 连接
wss.on('connection', (ws) => {
    clients.push(ws);  // 将连接的客户端添加到列表
    console.log('WebSocket: 客户端连接');

    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);  // 客户端断开时从列表中移除
        console.log('WebSocket: 客户端断开');
    });
});

// 模拟的通知数据
const notifications = [
    { title: 'Notification 1', body: 'This is the first notification' },
    { title: 'Notification 2', body: 'This is the second notification' },
    { title: 'Notification 3', body: 'This is the third notification' }
];

// API 端点：获取通知列表
app.get('/api/notifications', (req, res) => {
    res.status(200).json({ notifications });
});

// API 端点：发送推送通知
app.post('/send-notification', async (req, res) => {
    const { token, title, body, image } = req.body;

    // 构造通知消息
    const message = {
        notification: {
            title: title,
            body: body,
            image: image || '',  // 如果有图片 URL，添加到通知中
        },
        token: token // 这里必须是设备的 FCM 令牌
    };

    try {
        // 发送 Firebase 推送通知
        const response = await admin.messaging().send(message);
        console.log('🔥 推送通知发送成功:', response);

        // 通过 WebSocket 向所有客户端广播通知
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ title, body, image }));
            }
        });

        res.status(200).json({ success: true, messageId: response });
    } catch (error) {
        console.error('❌ 推送通知发送失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 启动 HTTP 服务器
const server = app.listen(PORT, () => {
    console.log(`HTTP 服务器正在端口 ${PORT} 上运行`);
});

// WebSocket 升级
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
