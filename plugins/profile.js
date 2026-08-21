const config = require('../config');
const { getUser } = require('../database/db');
const { checkMustJoin } = require('../utils/helper');
const { addLog } = require('../utils/logger');

module.exports = (bot) => {
    bot.onText(new RegExp(`^${config.prefix}profile$`), async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const userName = msg.from.first_name || "User";
        addLog('CMD', `/profile dieksekusi oleh ${userName}`);
        
        if (!(await checkMustJoin(bot, chatId, userId))) return;

        const userDb = getUser(userId);
        
        let roleText = "🆓 Member Gratis";
        let limitText = `${10 - userDb.usageCount} / 10 Kali`;

        if (userId === config.ownerId.toString()) {
            roleText = "👑 Owner";
            limitText = "Unlimited ♾️";
        } else if (userDb.isPremium) {
            roleText = "💎 Premium Member";
            limitText = "Unlimited ♾️";
            if (userDb.premiumExpired > 0) {
                const expDate = new Date(userDb.premiumExpired).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
                roleText += `\n⏳ Expired: ${expDate}`;
            }
        }

        const profileMsg = 
            `👤 *INFORMASI PROFIL*\n\n` +
            `📛 *Nama:* ${userName}\n` +
            `🆔 *ID Telegram:* \`${userId}\`\n` +
            `✨ *Status:* ${roleText}\n` +
            `📊 *Sisa Limit:* ${limitText}\n\n` +
            `_Catatan: Limit harian akan direset otomatis setiap 24 jam._`;

        bot.sendMessage(chatId, profileMsg, { parse_mode: 'Markdown' });
    });
};