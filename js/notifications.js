// سیستم اعلان‌های سیستمی (پوش نوتیفیکیشن) برای گوشی و ویندوز با سرور اختصاصی ntfy روی VPS
const NotificationManager = {
    // خواندن آدرس سرور پوش نوتیفیکیشن
    getServerUrl: function() {
        return localStorage.getItem('pm_push_server_url') || '';
    },

    // ذخیره آدرس سرور پوش نوتیفیکیشن
    setServerUrl: function(url) {
        if (!url) {
            localStorage.removeItem('pm_push_server_url');
            return '';
        }
        url = url.trim().replace(/\/+$/, '');
        localStorage.setItem('pm_push_server_url', url);
        return url;
    },

    // بررسی آیا سرور نوتیفیکیشن تنظیم شده یا نه
    isConfigured: function() {
        return Boolean(this.getServerUrl());
    },

    // کانال اختصاصی هر پرسنل (یکتا بر اساس شناسه کاربری)
    getUserTopic: function(userId) {
        if (!userId) return 'mecav_general';
        // تبدیل شناسه به یک رشته امن برای URL
        return 'mecav_u_' + String(userId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    },

    // لینک عضویت سریع در کانال برای کاربر (جهت باز کردن در اپ گوشی یا وب)
    getTopicSubscribeUrl: function(userId) {
        const serverUrl = this.getServerUrl();
        if (!serverUrl) return '';
        const topic = this.getUserTopic(userId);
        return `${serverUrl}/${topic}`;
    },

    // ارسال اعلان سیستمی به یک یا چند پرسنل
    sendPush: async function(targetUserIds, { title, body, priority = 'default', tags = ['pushpin'], clickUrl = '' }) {
        const serverUrl = this.getServerUrl();
        if (!targetUserIds) return;

        const ids = Array.isArray(targetUserIds) ? targetUserIds : [targetUserIds];
        const uniqueIds = [...new Set(ids.filter(id => id !== undefined && id !== null && id !== ''))];
        if (uniqueIds.length === 0) return;

        // نقشه تبدیل اولویت متنی به عددی برای سازگاری ntfy
        const priorityMap = {
            'min': 1,
            'low': 2,
            'default': 3,
            'high': 4,
            'urgent': 5
        };
        const numericPriority = priorityMap[priority] || 3;

        // لینک بازگشت به تسک یا برنامه در صورت کلیک روی نوتیفیکیشن
        const targetClickUrl = clickUrl || window.location.origin + window.location.pathname;

        // اگر سرور تنظیم نشده بود، فال‌بک به نوتیفیکیشن مرورگر لوکال
        if (!serverUrl) {
            if ("Notification" in window && Notification.permission === "granted") {
                try {
                    new Notification(title, { body: body, icon: 'icon-192.png' });
                } catch (e) {}
            }
            return;
        }

        // ارسال به سرور ntfy روی VPS برای هر کاربر
        for (const userId of uniqueIds) {
            const topic = this.getUserTopic(userId);
            const payload = {
                topic: topic,
                title: title,
                message: body,
                priority: numericPriority,
                tags: Array.isArray(tags) ? tags : [tags],
                click: targetClickUrl
            };

            try {
                // ارسال بدون مسدود کردن کار برنامه
                fetch(serverUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }).catch(err => {
                    console.warn(`[Notification] خطا در ارسال به کانال ${topic}:`, err);
                });
            } catch (err) {
                console.warn(`[Notification] خطا در درخواست نوتیفیکیشن:`, err);
            }
        }
    },

    // ارسال اعلان تستی به کاربر فعلی برای اطمینان از عملکرد زنگ و ویبره گوشی یا ویندوز
    sendTestPush: async function(userId) {
        if (!this.isConfigured()) {
            throw new Error('آدرس سرور نوتیفیکیشن تنظیم نشده است.');
        }
        return this.sendPush(userId, {
            title: '🔔 تست اعلان سیستمی مکاو',
            body: 'ارتباط با سرور اعلان برقرار است! زنگ و ویبره دستگاه شما فعال شد.',
            priority: 'high',
            tags: ['white_check_mark', 'tada']
        });
    }
};
