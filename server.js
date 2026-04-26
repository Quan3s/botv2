const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Giao diện điều khiển cực nhẹ cho iPhone 7
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Bot Control</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: sans-serif; background: #1a1a1a; color: #eee; padding: 15px; margin: 0; }
            #status { padding: 10px; border-radius: 5px; text-align: center; font-weight: bold; margin-bottom: 10px; }
            .online { background: #2e7d32; } .offline { background: #c62828; }
            #log { height: 300px; background: #000; overflow-y: auto; padding: 10px; font-family: monospace; font-size: 11px; border: 1px solid #444; }
            button { width: 100%; padding: 15px; border: none; border-radius: 5px; font-weight: bold; margin-top: 10px; }
            .btn-start { background: #4caf50; color: white; }
            .btn-stop { background: #f44336; color: white; }
            .log-success { color: #4caf50; } .log-err { color: #f44336; } .log-info { color: #2196f3; }
        </style>
    </head>
    <body>
        <div id="status" class="offline">BOT: OFFLINE</div>
        <div id="log"></div>
        <button id="ctrlBtn" class="btn-start">KHỞI ĐỘNG BOT</button>

        <script src="/socket.io/socket.io.js"></script>
        <script>
            const socket = io();
            const btn = document.getElementById('ctrlBtn');
            const logBox = document.getElementById('log');
            const statusBox = document.getElementById('status');
            let isRunning = false;

            btn.onclick = () => socket.emit(isRunning ? 'stop-bot' : 'start-bot');

            socket.on('status', (online) => {
                isRunning = online;
                statusBox.innerText = online ? 'BOT: ONLINE' : 'BOT: OFFLINE';
                statusBox.className = online ? 'online' : 'offline';
                btn.innerText = online ? 'DỪNG BOT' : 'KHỞI ĐỘNG BOT';
                btn.className = online ? 'btn-stop' : 'btn-start';
            });

            socket.on('log', (data) => {
                const p = document.createElement('div');
                p.className = 'log-' + data.type;
                p.innerText = \`[\${new Date().toLocaleTimeString()}] \${data.text}\`;
                logBox.appendChild(p);
                logBox.scrollTop = logBox.scrollHeight;
            });
        </script>
    </body>
    </html>
    `);
});

// Xuất io để file index.js dùng chung
module.exports = { server, io };

// Khởi chạy logic bot
require('./index.js');

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log('Web Server ready on port ' + PORT);
});
