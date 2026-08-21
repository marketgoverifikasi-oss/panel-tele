const axios = require('axios');
const FormData = require('form-data');
const config = require('../config');
const { getUser, saveDb } = require('../database/db');
const { checkMustJoin } = require('../utils/helper');
const { addLog } = require('../utils/logger');

module.exports = (bot) => {
    bot.onText(new RegExp(`^${config.prefix}hdfoto$`), async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        addLog('CMD', `/hdfoto dieksekusi oleh ${userId}`);

        if (!(await checkMustJoin(bot, chatId, userId))) return;

        const userDb = getUser(userId);
        const isOwner = (userId === config.ownerId.toString());
        const isUnlimited = isOwner || userDb.isPremium;

        if (!isUnlimited && userDb.usageCount >= 10) {
            return bot.sendMessage(chatId, "❌ *Limit Harian Habis!*\n\nBeli Premium untuk akses tanpa batas.", {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [[{ text: '💳 Lihat Harga & Beli Premium', callback_data: 'harga_premium' }]]
                }
            });
        }

        const promptMsg = await bot.sendMessage(chatId, "📸 *Kirimkan satu foto yang ingin dijadikan HD sekarang!*\n\n⏳ _Sesi akan berakhir otomatis dalam 1 menit jika Anda tidak mengirimkan foto._", { parse_mode: "Markdown" });

        if (global.photoSessions[chatId]) {
            clearTimeout(global.photoSessions[chatId].timeout);
        }

        global.photoSessions[chatId] = {
            messageId: promptMsg.message_id,
            timeout: setTimeout(() => {
                bot.editMessageText("❌ *Sesi HD Foto berakhir* karena tidak ada foto yang diterima dalam 1 menit.", {
                    chat_id: chatId, message_id: promptMsg.message_id, parse_mode: 'Markdown'
                }).catch(()=>{});
                delete global.photoSessions[chatId];
            }, 60000)
        };
    });

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        
        if (msg.photo && global.photoSessions && global.photoSessions[chatId]) {
            const userId = msg.from.id.toString();
            if (!(await checkMustJoin(bot, chatId, userId))) return;

            const userDb = getUser(userId);
            const isOwner = (userId === config.ownerId.toString());
            const isUnlimited = isOwner || userDb.isPremium;

            const session = global.photoSessions[chatId];
            
            clearTimeout(session.timeout);
            delete global.photoSessions[chatId];
            addLog('DOWNLOAD', `Mengunduh foto untuk peningkatan HD...`);

            bot.deleteMessage(chatId, msg.message_id).catch(()=>{});
            bot.editMessageText("⏳ *Menerima foto... Mengunduh dari Telegram...*", {
                chat_id: chatId, message_id: session.messageId, parse_mode: 'Markdown'
            }).catch(()=>{});

            try {
                const fileId = msg.photo[msg.photo.length - 1].file_id;
                const fileLink = await bot.getFileLink(fileId);

                const imgStreamRes = await axios.get(fileLink, { responseType: 'stream' });

                bot.editMessageText("⏳ *Mengunggah foto ke Uguu (Server Sementara)...*", {
                    chat_id: chatId, message_id: session.messageId, parse_mode: 'Markdown'
                }).catch(()=>{});

                const form = new FormData();
                form.append('files[]', imgStreamRes.data, 'image.jpg');

                const uguuRes = await axios.post('https://uguu.se/upload.php', form, {
                    headers: form.getHeaders()
                });

                if (!uguuRes.data || !uguuRes.data.files || !uguuRes.data.files[0].url) {
                    throw new Error("Gagal mengunggah gambar ke Uguu.");
                }
                const uguuUrl = uguuRes.data.files[0].url;
                addLog('SCRAPE', `Foto berhasil di-upload ke Uguu: ${uguuUrl}`);

                bot.editMessageText("🪄 *Meningkatkan kualitas (HD)... Ini mungkin memakan waktu beberapa detik.*", {
                    chat_id: chatId, message_id: session.messageId, parse_mode: 'Markdown'
                }).catch(()=>{});

                const nexrayApiUrl = `https://api.nexray.eu.cc/tools/v1/enhancer?url=${encodeURIComponent(uguuUrl)}`;
                const hdRes = await axios.get(nexrayApiUrl, { responseType: 'arraybuffer' });

                await bot.deleteMessage(chatId, session.messageId).catch(()=>{});
                
                await bot.sendPhoto(chatId, Buffer.from(hdRes.data), {
                    caption: "✨ *Ini dia hasil foto HD Anda!*", parse_mode: 'Markdown'
                });
                addLog('SUCCESS', `Foto HD berhasil diproses dan dikirim ke user ${userId}`);

                if (!isUnlimited) {
                    userDb.usageCount += 1;
                    saveDb();
                }

            } catch (e) {
                addLog('ERROR', `Gagal HD Foto: ${e.message}`);
                bot.editMessageText(`❌ *Gagal memproses HD Foto:*\n${e.message}\nSilakan coba lagi /hdfoto nanti.`, {
                    chat_id: chatId, message_id: session.messageId, parse_mode: 'Markdown'
                }).catch(()=>{});
            }
        }
    });
};