const mineflayer = require('mineflayer');
const { io } = require('./server');

let bot = null;
let reconnectTimer = null;
let isManualStop = true;

function sendLog(text, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${text}`);
    io.emit('log', { text, type });
}

function createBot() {
    if (bot) return;
    isManualStop = false;
    
    bot = mineflayer.createBot({
        host: 'korules.mcsh.io',
        port: 25565,
        username: 'bot123',
        version: '1.20.1',
        viewDistance: 'tiny',
        // Thêm dòng này để xử lý vật lý tốt hơn trên máy yếu
        physicsEnabled: true 
    });

    sendLog('Đang kết nối...', 'info');

    bot.on('spawn', () => {
        io.emit('status', true);
        sendLog('Bot đã online!', 'success');
        
        // Đợi 2 giây để server gửi dữ liệu map rồi mới login và chạy
        setTimeout(() => {
            bot.chat('/login 11111111');
            sendLog('Đã gửi lệnh đăng nhập.', 'success');
            runAntiAFK();
        }, 2000);
    });

    // Sửa lỗi đứng lơ lửng: Cập nhật vật lý khi bot di chuyển
    bot.on('move', () => {
        if (bot.physics.gravity === 0) bot.physics.gravity = 1.6; // Đảm bảo trọng lực luôn bật
    });

    bot.on('death', () => {
        sendLog('Bot đã chết, đang hồi sinh...', 'err');
        bot.respawn();
    });

    bot.on('end', (reason) => {
        io.emit('status', false);
        bot = null;
        if (!isManualStop) {
            sendLog('Mất kết nối. Thử lại sau 5s...', 'info');
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(createBot, 5000);
        }
    });
}

function runAntiAFK() {
    const afkInterval = setInterval(() => {
        if (!bot || !bot.entity) {
            clearInterval(afkInterval);
            return;
        }

        // 1. Quay đầu ngẫu nhiên
        const yaw = Math.random() * Math.PI * 2;
        const pitch = (Math.random() - 0.5) * 0.5;
        bot.look(yaw, pitch, true); // true để quay đầu mượt hơn

        // 2. Kiểm tra block phía dưới và phía trước
        // Lấy block tại vị trí bot đang đứng để cập nhật trọng lực
        const currentBlock = bot.blockAt(bot.entity.position);
        
        // Tính toán vị trí di chuyển (Wurst Style)
        const moveX = -Math.sin(yaw) * 2;
        const moveZ = -Math.cos(yaw) * 2;
        const targetPos = bot.entity.position.offset(moveX, 0, moveZ);
        const blockFront = bot.blockAt(targetPos);
        const blockDown = bot.blockAt(targetPos.offset(0, -1, 0));

        // 3. Logic di chuyển: Chỉ đi nếu phía trước không phải nước và phía dưới có sàn
        if (blockFront && blockFront.name !== 'water' && blockDown && blockDown.name !== 'air') {
            bot.setControlState('forward', true);
            // Thêm nhảy nhẹ để kích hoạt vật lý
            bot.setControlState('jump', true); 
            
            sendLog(`Đang di chuyển & quay đầu (Yaw: ${yaw.toFixed(2)})`, 'move');
            
            setTimeout(() => {
                if (bot) {
                    bot.setControlState('forward', false);
                    bot.setControlState('jump', false);
                }
            }, 1000);
        } else {
            sendLog('Phát hiện vùng không an toàn, đang tính toán lại hướng...', 'info');
        }
    }, 10000); // Rút ngắn thời gian xuống 10s để bot linh hoạt hơn
}

io.on('connection', (socket) => {
    socket.emit('status', bot !== null);
    socket.on('start-bot', () => { if (!bot) createBot(); });
    socket.on('stop-bot', () => {
        isManualStop = true;
        if (bot) bot.quit();
    });
});
