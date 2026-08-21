let logs = [];

function addLog(type, text) {
    const time = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });
    const logEntry = `[${time}] [${type}] ${text}`;
    logs.unshift(logEntry);
    if (logs.length > 50) logs.pop();
}

function getLogs() {
    return logs;
}

module.exports = { addLog, getLogs };
