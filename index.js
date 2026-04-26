const mineflayer = require('mineflayer');
const { server, io } = require('./server');

let bot = null;
let autoReconnect = true;
let isStarted = false;

function log(msg, type = 'success') {
    console.log(msg);
    io.emit('log', { msg, type });
}

function createBot() {
    if (bot) return;

    bot = mineflayer.createBot({
        host: 'IP_CUA_BAN', // Thay IP vào đây
        port: 25565,
        username: 'bot123',
        version: '1.20.1',
        viewDistance: 'tiny'
    });

    log('Đang kết nối đến server...', 'move');

    bot.on('spawn', () => {
        isStarted = true;
        io.emit('updateStatus', true);
        log('Bot đã vào server thành công!', 'success');
        bot.chat('/login 11111111');
        startAntiAFK();
    });

    bot.on('death', () => {
        log('Bot đã hy sinh, tự động hồi sinh...', 'err');
    });

    bot.on('error', (err) => log('Lỗi: ' + err.message, 'err'));

    bot.on('end', () => {
        bot = null;
        io.emit('updateStatus', false);
        log('Mất kết nối với server.', 'err');
        if (autoReconnect) {
            log('Sẽ thử kết nối lại sau 5 giây...', 'move');
            setTimeout(createBot, 5000);
        }
    });
}

function startAntiAFK() {
    if (!bot) return;

    // Cơ chế xoay đầu và đi bộ ngẫu nhiên
    setInterval(() => {
        if (!bot || !bot.entity) return;

        // Xoay đầu ngẫu nhiên
        const yaw = Math.random() * Math.PI * 2;
        bot.look(yaw, 0);

        // Kiểm tra block phía trước có phải nước không
        const posFront = bot.entity.position.offset(-Math.sin(yaw), 0, -Math.cos(yaw));
        const block = bot.blockAt(posFront);

        if (block && block.name !== 'water') {
            bot.setControlState('forward', true);
            log(`Di chuyển đến: ${posFront.x.toFixed(0)}, ${posFront.z.toFixed(0)}`, 'move');
            setTimeout(() => { if(bot) bot.setControlState('forward', false); }, 2000);
        } else {
            log('Phía trước là nước, đang tìm hướng khác...', 'err');
        }
    }, 15000); // Mỗi 15 giây thực hiện 1 lần
}

io.on('connection', (socket) => {
    socket.emit('updateStatus', !!bot);
    socket.on('startBot', () => {
        autoReconnect = true;
        createBot();
    });
    socket.on('stopBot', () => {
        autoReconnect = false;
        if (bot) bot.quit();
        log('Đã dừng bot thủ công.', 'err');
    });
});

const PORT = process.env.PORT || 7860;
server.listen(PORT, () => {
    console.log('Server Web chạy trên port ' + PORT);
});
