const fs = require('fs');
const path = require('path');
const dbPath = path.join('/tmp', 'database.json');

let db = { users: {}, orders: {} };

if (fs.existsSync(dbPath)) {
    try {
        db = JSON.parse(fs.readFileSync(dbPath));
        if (!db.orders) db.orders = {};
    } catch(e) {}
} else {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    } catch(e) {}
}

const saveDb = () => {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    } catch(e) {}
};

function getUser(userId) {
    if (!db.users[userId]) {
        db.users[userId] = { 
            isPremium: false, 
            premiumExpired: 0,
            usageCount: 0, 
            lastReset: Date.now() 
        };
        saveDb();
    }
    
    let user = db.users[userId];
    
    if (user.isPremium && user.premiumExpired > 0 && Date.now() > user.premiumExpired) {
        user.isPremium = false;
        user.premiumExpired = 0;
        saveDb();
    }
    
    if (Date.now() - user.lastReset >= 86400000) {
        user.usageCount = 0;           
        user.lastReset = Date.now();   
        saveDb();
    }
    
    return user;
}

module.exports = { db, saveDb, getUser };
