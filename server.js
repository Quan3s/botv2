const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>MC Bot Control</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: sans-serif; background: #121212; color: white; padding: 20px; }
                #log { height: 250px; background: black; overflow-y: scroll; padding: 10px; font-size: 12px; border-radius: 5px; border: 1px solid #333; }
                .status { padding: 10px; border-radius: 5px; margin-bottom: 10px; font-weight: bold; }
                .online { background: #2e7d32; } .offline { background: #c62828; }
                button { width: 100%; padding: 15px; margin-top: 10px; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; }
                .start { background: #4caf50; color: white; } .stop { background: #f44336; color: white; }
                .msg-success { color: #4caf50; } .msg-move { color: #2196f3; } .msg-err { color: #f44336; }
            </style>
        </head>
        <body>
            <div id="statusBox" class="status offline">TRẠNG THÁI: OFFLINE</div>
            <div id="log"></div>
            <button id="btn" class="start">KHỞI ĐỘNG BOT</button>

            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                const btn = document.getElementById('btn');
                const log = document.getElementById('log');
                const statusBox = document.getElementById('statusBox');
                let isOnline = false;

                btn.onclick = () => {
                    socket.emit(isOnline ? 'stopBot' : 'startBot');
                };

                socket.on('updateStatus', (status) => {
                    isOnline = status;
                    statusBox.innerText = 'TRẠNG THÁI: ' + (status ? 'ONLINE' : 'OFFLINE');
                    statusBox.className = 'status ' + (status ? 'online' : 'offline');
                    btn.innerText = status ? 'DỪNG BOT' : 'KHỞI ĐỘNG BOT';
                    btn.className = status ? 'stop' : 'start';
                });

                socket.on('log', (data) => {
                    const div = document.createElement('div');
                    div.className = 'msg-' + data.type;
                    div.innerText = \`[\${new Date().toLocaleTimeString()}] \${data.msg}\`;
                    log.appendChild(div);
                    log.scrollTop = log.scrollHeight;
                });
            </script>
        </body>
        </html>
    `);
});

module.exports = { server, io };
