const mineflayer = require('mineflayer');
const { io } = require('./server');

let bot = null;
let reconnectTimer = null;
let isManualStop = true; // Mặc định là dừng cho đến khi nhấn nút

// Hàm gửi log về Web Panel với phân loại loại log
function sendLog(text, type = 'info') {
    // type: 'success', 'move', 'err', 'info'
    console.log(`[${type.toUpperCase()}] ${text}`);
    io.emit('log', { text, type });
}

function createBot() {
    // Kiểm tra nếu bot đang trong server thì không tạo thêm để tránh lỗi reconnect liên tục
    if (bot) {
        sendLog('Bot đang hoạt động, không thể khởi động thêm!', 'err');
        return;
    }

    isManualStop = false;
    
    bot = mineflayer.createBot({
        host: 'korules.mcsh.io',
        port: 25565,
        username: 'bot123',
        version: '1.20.1', // Dùng bản này cực mượt trên 0.1 vCPU
        viewDistance: 'tiny'
    });

    sendLog('Đang thực hiện kết nối đến server korules.mcsh.io...', 'info');

    bot.on('spawn', () => {
        io.emit('status', true);
        sendLog('Bot đã online thành công!', 'success');
        
        // Tự động Login AuthMe
        bot.chat('/login 11111111');
        
        // Kích hoạt chu kỳ Anti-AFK
        runAntiAFK();
    });

    // Xử lý tự động hồi sinh khi chết (Auto Respawn)
    bot.on('death', () => {
        sendLog('Bot đã bị hạ gục! Đang tự động hồi sinh...', 'err');
        bot.respawn();
    });

    // Xử lý lỗi kết nối
    bot.on('error', (err) => {
        sendLog('Lỗi hệ thống: ' + err.message, 'err');
    });

    // Xử lý khi bị Kick hoặc Disconnect
    bot.on('end', (reason) => {
        io.emit('status', false);
        bot = null;
        sendLog(`Bot đã ngắt kết nối. Lý do: ${reason}`, 'err');

        // Nếu không phải do người dùng chủ động dừng thì tự động reconnect sau 5s
        if (!isManualStop) {
            sendLog('Chế độ Auto-Reconnect: Đang thử lại sau 5 giây...', 'info');
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(createBot, 5000);
        }
    });
}

// Cơ chế Anti-AFK phong cách Wurst Client
function runAntiAFK() {
    const afkInterval = setInterval(() => {
        if (!bot || !bot.entity) {
            clearInterval(afkInterval);
            return;
        }

        // 1. Xoay màn hình ngẫu nhiên (Quay đầu)
        const yaw = (Math.random() * 360) * (Math.PI / 180);
        const pitch = ((Math.random() * 40) - 20) * (Math.PI / 180);
        bot.look(yaw, pitch);

        // 2. Tính toán vị trí phía trước để kiểm tra nước
        const forward = bot.entity.position.offset(
            -Math.sin(yaw) * 2, 
            -1, 
            -Math.cos(yaw) * 2
        );
        const block = bot.blockAt(forward);

        // 3. Di chuyển nếu an toàn (Không phải nước, không phải không khí/vực)
        if (block && block.name !== 'water' && block.name !== 'flow_water' && block.name !== 'air') {
            bot.setControlState('forward', true);
            sendLog(`Di chuyển đến tọa độ: ${forward.x.toFixed(0)}, ${forward.z.toFixed(0)}`, 'move');
            
            // Đi trong 2 giây rồi dừng
            setTimeout(() => {
                if (bot) bot.setControlState('forward', false);
            }, 2000);
        } else {
            sendLog('Phát hiện nước hoặc vực thẳm phía trước! Đang tìm hướng khác...', 'err');
        }
    }, 15000); // Lặp lại sau mỗi 15 giây
}

// Nhận lệnh từ giao diện Web (server.js)
io.on('connection', (socket) => {
    // Cập nhật trạng thái nút bấm cho người dùng mới vào web
    socket.emit('status', bot !== null);

    // Lệnh Khởi động
    socket.on('start-bot', () => {
        if (!bot) {
            sendLog('Lệnh khởi động được kích hoạt từ Web.', 'info');
            createBot();
        } else {
            sendLog('Bot đã ở trong server, không cần khởi động lại.', 'err');
        }
    });

    // Lệnh Dừng
    socket.on('stop-bot', () => {
        isManualStop = true;
        clearTimeout(reconnectTimer);
        if (bot) {
            bot.quit();
            bot = null;
        }
        io.emit('status', false);
        sendLog('Đã dừng bot thủ công và tắt Auto-Reconnect.', 'err');
    });
});
