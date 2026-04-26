const mineflayer = require('mineflayer');
const { io } = require('./server');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

let bot = null;
let isManualStop = true;
let keys = [];
let currentKeyIndex = 0;

// --- LOGIC ĐỌC VÀ XOAY KEY ---
function loadKeys() {
    try {
        const data = fs.readFileSync('key.txt', 'utf8');
        keys = data.split(/\r?\n/).filter(k => k.trim() !== "");
        console.log(`Đã nạp ${keys.length} API Keys.`);
    } catch (err) {
        console.log("Không tìm thấy file key.txt hoặc file trống!");
    }
}
loadKeys();

async function getGeminiResponse(prompt) {
    if (keys.length === 0) return "Không có API Key.";

    try {
        const genAI = new GoogleGenerativeAI(keys[currentKeyIndex]);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        // Nếu lỗi 429 (Hết hạn mức) hoặc lỗi quyền
        if (error.message.includes("429") || error.message.includes("quota")) {
            console.log(`Key thứ ${currentKeyIndex + 1} hết hạn mức. Đang đổi key...`);
            currentKeyIndex++;
            if (currentKeyIndex >= keys.length) {
                currentKeyIndex = 0; // Quay lại key đầu tiên hoặc báo hết
                return "Tất cả API keys đều đã hết hạn mức.";
            }
            return getGeminiResponse(prompt); // Thử lại với key mới
        }
        return "Lỗi AI: " + error.message;
    }
}

// --- LOGIC BOT CHÍNH ---
function sendLog(text, type = 'info') {
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
        physicsEnabled: true
    });

    bot.on('spawn', () => {
        io.emit('status', true);
        sendLog('Bot đã online với Gemini AI!', 'success');
        setTimeout(() => {
            bot.chat('/login 11111111');
            runAntiAFK();
        }, 2000);
    });

    // Chat với AI khi có người nhắn tên bot
    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;
        if (message.includes(bot.username)) {
            const reply = await getGeminiResponse(message);
            bot.chat(reply.substring(0, 255)); // Minecraft giới hạn 255 ký tự
        }
    });

    bot.on('move', () => {
        if (bot.physics && bot.physics.gravity === 0) bot.physics.gravity = 1.6;
    });

    bot.on('end', () => {
        io.emit('status', false);
        bot = null;
        if (!isManualStop) setTimeout(createBot, 5000);
    });
}

// Giữ nguyên hàm runAntiAFK() từ bản trước của bạn ở đây...
function runAntiAFK() {
    setInterval(() => {
        if (!bot || !bot.entity) return;
        const yaw = Math.random() * Math.PI * 2;
        bot.look(yaw, (Math.random() - 0.5) * 0.5, true);

        const targetPos = bot.entity.position.offset(-Math.sin(yaw) * 2, 0, -Math.cos(yaw) * 2);
        const blockFront = bot.blockAt(targetPos);
        const blockDown = bot.blockAt(targetPos.offset(0, -1, 0));

        if (blockFront && blockFront.name !== 'water' && blockDown && blockDown.name !== 'air') {
            bot.setControlState('forward', true);
            bot.setControlState('jump', true);
            setTimeout(() => {
                if (bot) {
                    bot.setControlState('forward', false);
                    bot.setControlState('jump', false);
                }
            }, 1000);
        }
    }, 15000);
}

io.on('connection', (socket) => {
    socket.emit('status', bot !== null);
    socket.on('start-bot', () => createBot());
    socket.on('stop-bot', () => { isManualStop = true; if (bot) bot.quit(); });
});
