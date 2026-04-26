const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Giao diện Web Panel tối ưu cho iPhone 7
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Bot Control Panel</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #121212; color: #e0e0e0; padding: 15px; margin: 0; }
            #status { padding: 12px; border-radius: 8px; text-align: center; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; }
            .online { background: #1b5e20; color: #81c784; border: 1px solid #2e7d32; }
            .offline { background: #b71c1c; color: #ef9a9a; border: 1px solid #c62828; }
            #log { height: 350px; background: #000; overflow-y: auto; padding: 10px; font-family: "SF Mono", "Fira Code", monospace; font-size: 11px; border-radius: 8px; border: 1px solid #333; line-height: 1.5; }
            button { width: 100%; padding: 16px; border: none; border-radius: 8px; font-weight: bold; margin-top: 12px; font-size: 14px; transition: 0.2s; }
            .btn-start { background: #4caf50; color: white; }
            .btn-stop { background: #f44336; color: white; }
            .log-success { color: #4caf50; } .log-err { color: #f44336; } .log-info { color: #2196f3; } .log-move { color: #ffeb3b; }
            .log-ai { color: #e91e63; font-style: italic; } /* Log riêng cho Gemini */
        </style>
    </head>
    <body>
        <div id="status" class="offline">TRẠNG THÁI: OFFLINE</div>
        <div id="log"></div>
        <button id="ctrlBtn" class="btn-start">KHỞI ĐỘNG BOT</button>

        <script src="/socket.io/socket.io.js"></script>
        <script>
            const socket = io();
            const btn = document.getElementById('ctrlBtn');
            const logBox = document.getElementById('log');
            const statusBox = document.getElementById('status');
            let isRunning = false;

            btn.onclick = () => {
                socket.emit(isRunning ? 'stop-bot' : 'start-bot');
                btn.disabled = true; // Chống spam nút trên cảm ứng iPhone 7
                setTimeout(() => btn.disabled = false, 1000);
            };

            socket.on('status', (online) => {
                isRunning = online;
                statusBox.innerText = 'TRẠNG THÁI: ' + (online ? 'ONLINE' : 'OFFLINE');
                statusBox.className = online ? 'online' : 'offline';
                btn.innerText = online ? 'DỪNG BOT' : 'KHỞI ĐỘNG BOT';
                btn.className = online ? 'btn-stop' : 'btn-start';
            });

            socket.on('log', (data) => {
                const p = document.createElement('div');
                p.className = 'log-' + data.type;
                // Tự động cuộn xuống khi có log mới
                const time = new Date().toLocaleTimeString('vi-VN', {hour12: false});
                p.innerText = \`[\${time}] \${data.text}\`;
                logBox.appendChild(p);
                logBox.scrollTop = logBox.scrollHeight;
                
                // Giới hạn log để không làm treo RAM iPhone 7 (giữ 100 dòng mới nhất)
                if (logBox.childNodes.length > 100) logBox.removeChild(logBox.firstChild);
            });
        </script>
    </body>
    </html>
    `);
});

// Xuất io để index.js có thể gửi log về Web
module.exports = { server, io };

// QUAN TRỌNG: Nạp file logic bot sau khi đã xuất module
require('./index.js');

// Render yêu cầu lắng nghe cổng qua process.env.PORT
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('--- HỆ THỐNG ĐÃ SẴN SÀNG ---');
    console.log('Cổng Web: ' + PORT);
});
