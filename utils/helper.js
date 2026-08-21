const config = require('../config');

async function checkMustJoin(bot, chatId, userId) {
    if (userId.toString() === config.ownerId.toString()) return true;
    
    try {
        const member = await bot.getChatMember(config.channelUsername, userId);
        if (['creator', 'administrator', 'member'].includes(member.status)) {
            return true;
        }
    } catch (error) {}
    
    const joinMsg = `⚠️ *AKSES DITOLAK!*\n\nUntuk menggunakan bot ini, Anda **WAJIB** bergabung dengan channel resmi kami terlebih dahulu.\n\nSilakan klik tombol di bawah ini untuk bergabung, lalu coba kembali.`;
    bot.sendMessage(chatId, joinMsg, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '📢 Gabung Channel', url: config.channelLink }]
            ]
        }
    });
    return false;
}

module.exports = { checkMustJoin };
