const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { addLog, getLogs } = require('../utils/logger');

const app = express();
app.use(express.json());

// Initialize Telegram Bot without polling (Webhook mode)
const bot = new TelegramBot(config.botToken);

// Global state for photo sessions
global.photoSessions = {};

// LOAD ALL PLUGINS DYNAMICALLY
const pluginsPath = path.join(__dirname, '../plugins');
fs.readdirSync(pluginsPath).forEach(file => {
    if (file.endsWith('.js')) {
        try {
            require(`../plugins/${file}`)(bot);
            addLog('SYSTEM', `Plugin load success: ${file}`);
        } catch (error) {
            addLog('ERROR', `Gagal meload plugin ${file}: ${error.message}`);
        }
    }
});

// DASHBOARD UI (Matching user screenshot)
app.get('/', (req, res) => {
    const logs = getLogs();
    const logsHtml = logs.map(l => `<div>${l}</div>`).join('');

    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BARIK TELEGRAM PANEL</title>
        <style>
            body {
                background-color: #0d1117;
                color: #c9d1d9;
                font-family: 'Courier New', Courier, monospace;
                padding: 20px;
                margin: 0;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                background: #161b22;
                border: 1px dashed #30363d;
                padding: 20px;
                border-radius: 6px;
            }
            h2 {
                text-align: center;
                color: #58a6ff;
                letter-spacing: 2px;
            }
            .status-bar {
                display: flex;
                justify-content: space-between;
                border-bottom: 1px dashed #30363d;
                padding-bottom: 10px;
                margin-bottom: 15px;
                font-size: 14px;
            }
            .online {
                color: #3fb950;
            }
            .terminal {
                background: #0d1117;
                border: 1px solid #30363d;
                padding: 15px;
                height: 350px;
                overflow-y: auto;
                font-size: 13px;
                line-height: 1.5;
                border-radius: 4px;
            }
            .terminal div {
                margin-bottom: 4px;
            }
        </style>
        <meta http-equiv="refresh" content="5">
    </head>
    <body>
        <div class="container">
            <h2>┌ BARIK TELEGRAM PANEL ┐</h2>
            <div class="status-bar">
                <span>Server: Vercel (Serverless)</span>
                <span class="online">● ONLINE</span>
            </div>
            <div><strong>LIVE LOGS :</strong></div>
            <div class="terminal">
                ${logsHtml || '<div>[INFO] Menunggu aktivitas bot...</div>'}
            </div>
        </div>
    </body>
    </html>
    `;
    res.send(html);
});

// TELEGRAM WEBHOOK ENDPOINT
app.post('/api/index', async (req, res) => {
    try {
        if (req.body && (req.body.message || req.body.callback_query)) {
            bot.processUpdate(req.body);
        }
        res.status(200).send('OK');
    } catch (e) {
        addLog('ERROR', `Webhook error: ${e.message}`);
        res.status(500).send('Error');
    }
});

// Helper for local testing or catch-all webhook route
app.post('*', (req, res) => {
    try {
        if (req.body) {
            bot.processUpdate(req.body);
        }
        res.status(200).send('OK');
    } catch (e) {
        res.status(500).send('Error');
    }
});

module.exports = app;
