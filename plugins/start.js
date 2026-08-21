const config = require('../config');
const { checkMustJoin } = require('../utils/helper');
const { addLog } = require('../utils/logger');

module.exports = (bot) => {
    bot.onText(new RegExp(`^${config.prefix}start$`), async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        addLog('CMD', `/start dieksekusi oleh ${msg.from.first_name || userId}`);

        if (!(await checkMustJoin(bot, chatId, userId))) return;
        
        const welcomeMessage = 
            `Halo ${msg.from.first_name}! 👋\n\n` +
            `Selamat datang di **${config.botName}**.\n\n` +
            `*Cara Penggunaan:*\n` +
            `1️⃣ Kirimkan **Alamat Email** Anda ke bot.\n` +
            `2️⃣ Cek Inbox/Spam email Anda, copy link dari Alight Motion.\n` +
            `3️⃣ Kirimkan (Paste) **Link** tersebut kembali ke bot ini.\n\n` +
            `Gunakan menu di kiri bawah untuk mengecek profil, membeli Premium, atau menggunakan fitur HD Foto.`;

        bot.sendPhoto(chatId, config.startImage, {
            caption: welcomeMessage,
            parse_mode: 'Markdown'
        });
        addLog('SUCCESS', `Menu utama dikirim ke ${msg.from.first_name || userId}`);
    });
};