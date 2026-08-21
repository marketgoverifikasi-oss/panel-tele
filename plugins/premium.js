const axios = require('axios');
const config = require('../config');
const { db, getUser, saveDb } = require('../database/db');
const { checkMustJoin } = require('../utils/helper');
const { addLog } = require('../utils/logger');

module.exports = (bot) => {
    bot.onText(new RegExp(`^${config.prefix}premium$`), async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        addLog('CMD', `/premium dieksekusi oleh ${msg.from.first_name || userId}`);

        if (!(await checkMustJoin(bot, chatId, userId))) return;
        
        const priceMsg = 
            `💎 *PILIHAN PAKET PREMIUM MEMBER* 💎\n\n` +
            `Pilih paket langganan yang paling pas buat kamu. Pembayaran otomatis menggunakan QRIS, proses instan hitungan detik!\n\n` +
            `🌟 *Keuntungan Menjadi Premium Member:*\n` +
            `• ♾️ *Tanpa Batas (Unlimited)* Akses fitur Alight Motion tanpa batas limit harian.\n` +
            `• ✨ *Akses Fitur HD Foto Sepuasnya* Perbaiki kualitas foto buram tanpa hambatan kuota.\n` +
            `• ⚡ *Proses Instan & Otomatis* Paket langsung aktif begitu pembayaran QRIS terkonfirmasi.\n\n` +
            `Silakan pilih paket langganan di bawah ini: 👇`;
        
        const priceButtons = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔹 1 Minggu - Rp 1.000', callback_data: 'buy_1000_7' }],
                    [{ text: '🔹 2 Minggu - Rp 2.000', callback_data: 'buy_2000_14' }],
                    [{ text: '🔹 3 Minggu - Rp 3.000', callback_data: 'buy_3000_21' }],
                    [{ text: '🔹 1 Bulan - Rp 5.000', callback_data: 'buy_5000_30' }],
                    [{ text: '🔹 Perpanjang 1 Hari - Rp 500', callback_data: 'buy_500_1' }]
                ]
            }
        };
        bot.sendMessage(chatId, priceMsg, { parse_mode: 'Markdown', ...priceButtons });
    });

    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        const userId = query.from.id.toString();
        const data = query.data;

        if (!(await checkMustJoin(bot, chatId, userId))) {
            return bot.answerCallbackQuery(query.id);
        }

        if (data === 'harga_premium') {
            const priceMsg = 
                `💎 *PILIHAN PAKET PREMIUM MEMBER* 💎\n\n` +
                `Pilih paket langganan yang paling pas buat kamu. Pembayaran otomatis menggunakan QRIS, proses instan hitungan detik!\n\n` +
                `🌟 *Keuntungan Menjadi Premium Member:*\n` +
                `• ♾️ *Tanpa Batas (Unlimited)* Akses fitur Alight Motion tanpa batas limit harian.\n` +
                `• ✨ *Akses Fitur HD Foto Sepuasnya* Perbaiki kualitas foto buram tanpa hambatan kuota.\n` +
                `• ⚡ *Proses Instan & Otomatis* Paket langsung aktif begitu pembayaran QRIS terkonfirmasi.\n\n` +
                `Silakan pilih paket langganan di bawah ini: 👇`;
            
            const priceButtons = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔹 1 Minggu - Rp 1.000', callback_data: 'buy_1000_7' }],
                        [{ text: '🔹 2 Minggu - Rp 2.000', callback_data: 'buy_2000_14' }],
                        [{ text: '🔹 3 Minggu - Rp 3.000', callback_data: 'buy_3000_21' }],
                        [{ text: '🔹 1 Bulan - Rp 5.000', callback_data: 'buy_5000_30' }],
                        [{ text: '🔹 Perpanjang 1 Hari - Rp 500', callback_data: 'buy_500_1' }]
                    ]
                }
            };
            
            bot.editMessageText(priceMsg, {
                chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: priceButtons
            }).catch(()=>{}); 
            bot.answerCallbackQuery(query.id);
        }

        if (data.startsWith('buy_')) {
            const parts = data.split('_');
            const amount = parseInt(parts[1]);
            const days = parts[2];
            const orderId = `INV${userId}${Date.now()}`;
            addLog('PAYMENT', `Membuat QRIS ${days} Hari seharga Rp${amount} (ID: ${orderId})`);

            bot.editMessageText("⏳ *Mempersiapkan QRIS Pembayaran...*\nMohon tunggu sebentar.", {
                chat_id: chatId, message_id: messageId, parse_mode: 'Markdown'
            }).catch(()=>{});

            try {
                const res = await axios.post(`https://app.pakasir.com/api/transactioncreate/qris`, {
                    project: config.pakasirProject,
                    order_id: orderId,
                    amount: amount,
                    api_key: config.pakasirApiKey
                }, { headers: { 'Content-Type': 'application/json' } });

                if (res.data && res.data.payment) {
                    const qrString = res.data.payment.payment_number;
                    const totalPay = res.data.payment.total_payment;
                    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(qrString)}`;

                    const payCaption = 
                        `🧾 *INVOICE PEMBAYARAN QRIS*\n\n` +
                        `📦 *Paket:* ${days} Hari\n` +
                        `💰 *Total Bayar:* Rp ${totalPay}\n` +
                        `🔖 *Order ID:* \`${orderId}\`\n` +
                        `⏳ *Kedaluwarsa:* 5 Menit\n\n` +
                        `Silakan **SCAN QRIS** pada gambar di atas menggunakan aplikasi e-Wallet/M-Banking Anda.\n\n` +
                        `⚠️ *Penting:* Jika sudah sukses membayar, wajib klik tombol **🔄 Cek Pembayaran** agar paket langsung aktif!`;

                    const payButtons = {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔄 Cek Pembayaran', callback_data: `check_${amount}_${days}_${orderId}` }],
                                [{ text: '❌ Batal Pembayaran', callback_data: `cancel_${amount}_${orderId}` }]
                            ]
                        }
                    };

                    await bot.deleteMessage(chatId, messageId).catch(()=>{});
                    const sentPhoto = await bot.sendPhoto(chatId, qrImageUrl, {
                        caption: payCaption, parse_mode: 'Markdown', ...payButtons
                    });

                    setTimeout(() => {
                        bot.deleteMessage(chatId, sentPhoto.message_id).catch(()=>{});
                        axios.post(`https://app.pakasir.com/api/transactioncancel`, {
                            project: config.pakasirProject, order_id: orderId, amount: amount, api_key: config.pakasirApiKey
                        }).catch(()=>{});
                    }, 300000);

                } else {
                    bot.editMessageText("❌ Gagal men-generate QRIS.", { chat_id: chatId, message_id: messageId });
                }
            } catch (err) {
                bot.editMessageText(`❌ Terjadi kesalahan pada server pembayaran.`, { chat_id: chatId, message_id: messageId });
            }
            bot.answerCallbackQuery(query.id);
        }

        if (data.startsWith('cancel_')) {
            const parts = data.split('_');
            const amount = parseInt(parts[1]);
            const orderId = parts[2];
            addLog('PAYMENT', `Pembayaran ${orderId} dibatalkan oleh user.`);

            bot.deleteMessage(chatId, messageId).catch(()=>{});
            axios.post(`https://app.pakasir.com/api/transactioncancel`, {
                project: config.pakasirProject, order_id: orderId, amount: amount, api_key: config.pakasirApiKey
            }).catch(()=>{});

            bot.answerCallbackQuery(query.id, { text: "🚫 Pembayaran berhasil dibatalkan.", show_alert: true });
        }

        if (data.startsWith('check_')) {
            const parts = data.split('_');
            const amount = parseInt(parts[1]);
            const days = parseInt(parts[2]);
            const orderId = parts[3];

            if (db.orders[orderId]) {
                return bot.answerCallbackQuery(query.id, { text: "⚠️ Transaksi ini sudah berhasil diklaim sebelumnya!", show_alert: true });
            }

            try {
                const checkUrl = `https://app.pakasir.com/api/transactiondetail?project=${config.pakasirProject}&amount=${amount}&order_id=${orderId}&api_key=${config.pakasirApiKey}`;
                const res = await axios.get(checkUrl);

                if (res.data && res.data.transaction && res.data.transaction.status === "completed") {
                    let user = getUser(userId);
                    const addedTime = days * 24 * 60 * 60 * 1000;
                    if (user.isPremium && user.premiumExpired > Date.now()) {
                        user.premiumExpired += addedTime; 
                    } else {
                        user.isPremium = true;
                        user.premiumExpired = Date.now() + addedTime;
                    }

                    db.orders[orderId] = { userId: userId, amount: amount, days: days, completedAt: Date.now() };
                    saveDb();
                    addLog('SUCCESS', `User ${userId} sukses upgrade ke Premium (${days} Hari)!`);

                    bot.answerCallbackQuery(query.id, { text: "✅ Pembayaran Berhasil! Akun Premium telah aktif.", show_alert: true });
                    const expiredDate = new Date(user.premiumExpired).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
                    
                    await bot.deleteMessage(chatId, messageId).catch(()=>{});
                    bot.sendMessage(chatId, `🎉 *PEMBAYARAN BERHASIL DIVERIFIKASI!* 🎉\n\nTerima kasih, sistem mendeteksi pembayaran sebesar Rp${amount}.\nAkun Anda kini resmi **Premium Member** hingga:\n📅 ${expiredDate}`, { parse_mode: 'Markdown' });

                } else {
                    bot.answerCallbackQuery(query.id, { text: "⏳ Pembayaran belum terdeteksi. Pastikan tidak ada pending lalu klik Cek lagi.", show_alert: true });
                }
            } catch (err) {
                bot.answerCallbackQuery(query.id, { text: "❌ Sistem gagal mengecek status.", show_alert: true });
            }
        }
    });
};