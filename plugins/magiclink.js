const axios = require('axios');
const config = require('../config');
const { getUser, saveDb } = require('../database/db');
const { checkMustJoin } = require('../utils/helper');
const { addLog } = require('../utils/logger');

const userSessions = {}; 

module.exports = (bot) => {
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const text = msg.text;

        if (!text || text.startsWith(config.prefix)) return;
        if (!(await checkMustJoin(bot, chatId, userId))) return;

        const headersConfig = { "Content-Type": "application/json", "Accept": "application/json" };
        const userDb = getUser(userId);
        const isOwner = (userId === config.ownerId.toString());
        const isUnlimited = isOwner || userDb.isPremium;

        const premiumButton = {
            reply_markup: {
                inline_keyboard: [[{ text: '💳 Lihat Harga & Beli Premium', callback_data: 'harga_premium' }]]
            }
        };

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(text.trim())) {
            const email = text.trim();
            addLog('EMAIL', `Menerima email ${email} untuk Magic Link`);
            
            if (!isUnlimited && userDb.usageCount >= 10) {
                 return bot.sendMessage(chatId, "❌ *Limit Harian Habis!*\n\nBeli Premium sekarang juga!", { parse_mode: "Markdown", ...premiumButton });
            }
            
            userSessions[chatId] = email;
            bot.sendMessage(chatId, `⏳ Memproses pengiriman Magic Link ke \`${email}\`...`, { parse_mode: 'Markdown' });

            try {
                const res = await axios.post("https://api.betabotz.eu.org/api/tools/am-magicLink", {
                    aksesKey: config.askey, email: email
                }, { headers: headersConfig });

                if (res.data && res.data.status) {
                    if (!isUnlimited) {
                        userDb.usageCount += 1;
                        saveDb();
                    }
                    const sisaLimit = isUnlimited ? "Unlimited ♾️" : `${10 - userDb.usageCount} Kali`;
                    const successMsg = `✅ *Berhasil Terkirim!*

${res.data.result.message}

📊 *Sisa Limit Anda:* ${sisaLimit}
*Selanjutnya:* Forward/Paste link ke bot ini.`;
                    bot.sendMessage(chatId, successMsg, { parse_mode: "Markdown" });
                    addLog('SUCCESS', `Magic Link terkirim ke ${email}`);
                } else {
                    bot.sendMessage(chatId, "❌ Gagal mengirim Magic Link.");
                }
            } catch (error) {
                bot.sendMessage(chatId, "❌ Terjadi kesalahan server.");
            }
            return; 
        }

        const urlRegex = /(https?:\/\/[^\s]+)/;
        const urlMatch = text.match(urlRegex);

        if (urlMatch) {
            const rawUrl = urlMatch[0];
            if (!rawUrl.includes("alightcreative.com") && !rawUrl.includes("firebaseapp.com")) return; 

            const emailSession = userSessions[chatId];
            if (!emailSession) {
                return bot.sendMessage(chatId, "⚠️ *Sesi tidak ditemukan!*\nKirimkan Email Anda dulu.", { parse_mode: 'Markdown' });
            }

            bot.sendMessage(chatId, "⏳ Memverifikasi link dan mengaktifkan Premium...");
            addLog('VERIFY', `Memverifikasi link Alight Motion untuk ${emailSession}`);

            try {
                const verifyRes = await axios.post("https://api.betabotz.eu.org/api/tools/am-verifyMagicLink", {
                    aksesKey: config.askey, email: emailSession, rawUrl: rawUrl
                }, { headers: headersConfig });

                if (verifyRes.data && verifyRes.data.status) {
                    const token = verifyRes.data.result.token;
                    const purchaseRes = await axios.post("https://api.betabotz.eu.org/api/tools/am-purchasePremium", {
                        aksesKey: config.askey, email: emailSession, token: token
                    }, { headers: headersConfig });

                    if (purchaseRes.data && purchaseRes.data.status) {
                        const finalMsg = `🎉 *Aktivasi Berhasil!* 🎉\n\n👤 *Email:* \`${emailSession}\`\n✨ *Status:* Premium Aktif`;
                        bot.sendMessage(chatId, finalMsg, { parse_mode: "Markdown" });
                        delete userSessions[chatId];
                        addLog('SUCCESS', `Akun Alight Motion ${emailSession} sukses di-upgrade otomatis!`);
                    } else {
                        bot.sendMessage(chatId, "❌ Gagal mengaktifkan premium.");
                    }
                } else {
                    bot.sendMessage(chatId, "❌ Link tidak valid/kedaluwarsa.");
                }
            } catch (error) {
                bot.sendMessage(chatId, "❌ Terjadi kesalahan pada server.");
            }
        }
    });
};