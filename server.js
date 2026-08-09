const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());
app.use(cors());

// البيانات الحساسة مخفية في السيرفر فقط
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "mra359rt";
const JSONBIN_KEY = process.env.JSONBIN_KEY || "$2a$10$MoDxxOV9R4GgMSmNuVovC.K9uapoJVJlqFE2XrVrq26RVYrNhkWJW";
const BIN_ID = process.env.BIN_ID || "6a7771aeda38895dfecaa3a9";

// تحقق من دخول الأدمن
app.post('/api/admin-login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        return res.json({ success: true, token: "SECURE_ADMIN_SESSION_99182" });
    }
    return res.status(401).json({ success: false, message: "كلمة المرور غير صحيحة" });
});

// معالجة الشراء بأمان من السيرفر
app.post('/api/buy-key', async (req, res) => {
    const { userId, product, duration, price, qty } = req.body;

    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { 'X-Master-Key': JSONBIN_KEY }
        });
        const data = await response.json();
        let db = data.record || {};
        if (!db.usersDb) db.usersDb = {};

        let user = db.usersDb[userId];
        if (!user) return res.status(400).json({ success: false, message: "المستخدم غير موجود" });

        const totalPrice = price * qty;
        if ((parseFloat(user.balance) || 0) < totalPrice) {
            return res.status(400).json({ success: false, message: "الرصيد غير كافي" });
        }

        // خصم الرصيد
        user.balance -= totalPrice;

        await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_KEY
            },
            body: JSON.stringify(db)
        });

        return res.json({ success: true, newBalance: user.balance });
    } catch (err) {
        return res.status(500).json({ success: false, message: "خطأ في السيرفر" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
