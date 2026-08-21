const fs = require('fs');
const archiver = require('archiver');
const config = require('../config');
const { getUser, saveDb } = require('../database/db');
const { addLog } = require('../utils/logger');

module.exports = (bot) => {
    bot.onText(new RegExp(`^${config.prefix}addpremium(?:\s+(\d+))?$`), (msg, match) => {
        const chatId = msg.chat.id;
        const senderId = msg.from.id.toString();
        const targetId = match[1];

        if (senderId !== config.ownerId.toString()) return bot.sendMessage(chatId, "❌ Khusus Owner.");
        if (!targetId) return bot.sendMessage(chatId, "⚠️ Contoh: `/addpremium 123456789`", { parse_mode: "Markdown" });

        let user = getUser(targetId);
        user.isPremium = true;
        user.premiumExpired = Date.now() + (365 * 24 * 60 * 60 * 1000); 
        saveDb();
        addLog('OWNER', `Owner menambahkan premium ke ID ${targetId}`);

        bot.sendMessage(chatId, `✅ Berhasil add premium ID \`${targetId}\``, { parse_mode: "Markdown" });
    });

    bot.onText(new RegExp(`^${config.prefix}delpremium(?:\s+(\d+))?$`), (msg, match) => {
        const chatId = msg.chat.id;
        const senderId = msg.from.id.toString();
        const targetId = match[1];

        if (senderId !== config.ownerId.toString()) return bot.sendMessage(chatId, "❌ Khusus Owner.");
        if (!targetId) return bot.sendMessage(chatId, "⚠️ Contoh: `/delpremium 123456789`", { parse_mode: "Markdown" });

        let user = getUser(targetId);
        user.isPremium = false;
        user.premiumExpired = 0;
        saveDb();
        addLog('OWNER', `Owner menghapus premium ID ${targetId}`);

        bot.sendMessage(chatId, `✅ Berhasil hapus premium ID \`${targetId}\``, { parse_mode: "Markdown" });
    });

    bot.onText(new RegExp(`^${config.prefix}backup$`), (msg) => {
        const chatId = msg.chat.id;
        const senderId = msg.from.id.toString();

        if (senderId !== config.ownerId.toString()) return bot.sendMessage(chatId, "❌ Khusus Owner.");
        addLog('OWNER', `Meminta file backup script bot...`);

        bot.sendMessage(chatId, "⏳ *Menyiapkan backup...*", { parse_mode: "Markdown" }).then(sentMsg => {
            const backupName = `Backup_Bot_${Date.now()}.zip`;
            const output = fs.createWriteStream(backupName);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', async () => {
                try {
                    await bot.sendDocument(chatId, backupName, {
                        caption: `📦 *BACKUP BERHASIL*`, parse_mode: "Markdown"
                    });
                    bot.deleteMessage(chatId, sentMsg.message_id).catch(()=>{});
                    addLog('SUCCESS', `File backup berhasil dikirim ke Owner.`);
                } catch (err) {} finally {
                    if (fs.existsSync(backupName)) fs.unlinkSync(backupName);
                }
            });
            archive.pipe(output);
            archive.directory(process.cwd(), false, data => {
                if (data.name.startsWith('node_modules') || data.name.endsWith('.zip')) return false;
                return data;
            });
            archive.finalize();
        });
    });
};