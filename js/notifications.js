// سیستم جامع اعلان‌های سیستمی درون‌برنامه‌ای (بدون نیاز به نصب هیچ نرم‌افزار اضافی)
// سازگار با نسخه اندروید (APK)، نسخه تحت وب (PWA) و مرورگر ویندوز
const NotificationManager = {
    _eventSource: null,
    _activeUserId: null,
    _lastTasksMap: null,
    _recentSelfTriggered: new Set(),
    _recentHandledNotifs: new Map(),
    _inAppNotifs: [],

    isDuplicateNotification: function(title, body, taskId = null) {
        if (!title && !body) return true;
        const cleanTitle = (title || '').trim();
        const cleanBody = (body || '').trim();
        const keyExact = `${taskId || ''}_${cleanTitle}_${cleanBody}`;
        const keyGeneral = `${cleanTitle}_${cleanBody}`;
        const now = Date.now();

        // پاکسازی رکوردهای قدیمی‌تر از ۳۰ ثانیه
        if (this._recentHandledNotifs.size > 100) {
            for (const [k, time] of this._recentHandledNotifs.entries()) {
                if (now - time > 30000) this._recentHandledNotifs.delete(k);
            }
        }

        // اگر همین اعلان در بازه زمانی ۱۲ ثانیه گذشته یک‌بار پردازش شده باشد
        if (this._recentHandledNotifs.has(keyExact)) {
            const lastTime = this._recentHandledNotifs.get(keyExact);
            if (now - lastTime < 12000) return true;
        }
        if (this._recentHandledNotifs.has(keyGeneral)) {
            const lastTime = this._recentHandledNotifs.get(keyGeneral);
            if (now - lastTime < 12000) return true;
        }

        this._recentHandledNotifs.set(keyExact, now);
        this._recentHandledNotifs.set(keyGeneral, now);
        return false;
    },

    initInAppNotifs: function() {
        try {
            const saved = localStorage.getItem('pm_recent_inapp_notifs');
            this._inAppNotifs = saved ? JSON.parse(saved) : [];
        } catch (e) {
            this._inAppNotifs = [];
        }
        this.renderInAppNotifs();
    },

    saveInAppNotifs: function() {
        try {
            if (this._inAppNotifs.length > 25) {
                this._inAppNotifs = this._inAppNotifs.slice(0, 25);
            }
            localStorage.setItem('pm_recent_inapp_notifs', JSON.stringify(this._inAppNotifs));
        } catch (e) {}
    },

    addInAppNotification: function({ title, body, taskId = null, clickUrl = '', type = 'info' }) {
        if (!title && !body) return;
        let resolvedTaskId = taskId;
        if (!resolvedTaskId && clickUrl && clickUrl.includes('#task=')) {
            try { resolvedTaskId = clickUrl.split('#task=')[1].split('&')[0]; } catch(e){}
        }

        // جلوگیری قطعی از اضافه شدن کارت تکراری به لیست اعلان‌ها
        const cleanTitle = (title || '').trim();
        const cleanBody = (body || '').trim();
        const isDuplicateInList = this._inAppNotifs.slice(0, 5).some(existing => {
            const sameTask = resolvedTaskId && existing.taskId && String(resolvedTaskId) === String(existing.taskId);
            const sameTitle = existing.title && existing.title.trim() === cleanTitle;
            const sameBody = existing.body && existing.body.trim() === cleanBody;
            return (sameTitle && sameBody) || (sameTask && sameTitle);
        });
        if (isDuplicateInList) return;

        const item = {
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            title: title || 'اعلان جدید',
            body: body || '',
            taskId: resolvedTaskId,
            clickUrl: clickUrl,
            type: type,
            time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        };

        this._inAppNotifs.unshift(item);
        this.saveInAppNotifs();
        this.renderInAppNotifs();
    },

    removeInAppNotification: function(notifId) {
        this._inAppNotifs = this._inAppNotifs.filter(n => n.id !== notifId);
        this.saveInAppNotifs();
        this.renderInAppNotifs();
    },

    clearAllInAppNotifications: function() {
        this._inAppNotifs = [];
        this.saveInAppNotifs();
        this.renderInAppNotifs();
    },

    renderInAppNotifs: function() {
        const section = document.getElementById('recent-notifications-section');
        const list = document.getElementById('recent-notifications-list');
        const countBadge = document.getElementById('recent-notifs-count');
        if (!section || !list) return;

        if (!this._inAppNotifs || this._inAppNotifs.length === 0) {
            section.style.display = 'none';
            list.innerHTML = '';
            if (countBadge) countBadge.innerText = '0';
            return;
        }

        section.style.display = 'block';
        if (countBadge) countBadge.innerText = String(this._inAppNotifs.length);

        let html = '';
        this._inAppNotifs.forEach(n => {
            html += `
                <div class="inapp-notif-item" onclick="NotificationManager.openNotificationItem('${n.id}')" title="برای باز کردن تسک کلیک کنید">
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; gap: 8px;">
                            <b style="font-size: 0.88rem; color: var(--text-main);">${n.title}</b>
                            <span style="font-size: 0.7rem; color: var(--text-muted); direction: ltr; flex-shrink: 0;">${n.time}</span>
                        </div>
                        <div style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.4; word-break: break-word;">${n.body}</div>
                        <div class="inapp-notif-action-hint">
                            <span>🔍 برای باز کردن و پاسخ به تسک کلیک کنید</span>
                        </div>
                    </div>
                    <button class="inapp-notif-delete-btn" onclick="event.stopPropagation(); NotificationManager.removeInAppNotification('${n.id}')" title="حذف اعلان">&times;</button>
                </div>
            `;
        });

        list.innerHTML = html;
    },

    openNotificationItem: async function(notifId) {
        const notif = this._inAppNotifs.find(n => n.id === notifId);
        if (!notif) return;

        let targetTaskId = notif.taskId;

        if (!targetTaskId && notif.clickUrl && notif.clickUrl.includes('#task=')) {
            try {
                targetTaskId = notif.clickUrl.split('#task=')[1].split('&')[0];
            } catch (e) {}
        }

        // اگر شناسه تسک صریحاً نبود، تلاش برای پیدا کردن تسک از عنوان یا متن داخل گیومه
        if (!targetTaskId && typeof DBManager !== 'undefined') {
            try {
                const allTasks = await DBManager.getTasks();
                const match = (notif.title || '').match(/["'«»]([^"'«»]+)["'«»]/) || (notif.body || '').match(/["'«»]([^"'«»]+)["'«»]/);
                if (match && match[1]) {
                    const extractedTitle = match[1].trim().toLowerCase();
                    const found = allTasks.find(t => t.title && t.title.trim().toLowerCase() === extractedTitle);
                    if (found) targetTaskId = found._id;
                }
                if (!targetTaskId) {
                    const found = allTasks.find(t => t.title && t.title.trim().length > 3 && ((notif.title && notif.title.includes(t.title)) || (notif.body && notif.body.includes(t.title))));
                    if (found) targetTaskId = found._id;
                }
            } catch (e) {
                console.warn('[Notification] خطا در تطبیق تسک:', e);
            }
        }

        if (targetTaskId) {
            notif.taskId = targetTaskId;
            this.saveInAppNotifs();
            if (typeof window.openTaskById === 'function') {
                window.openTaskById(targetTaskId);
            }
        } else {
            if (typeof showToast === 'function') {
                showToast('تسک مرتبط با این اعلان یافت نشد یا ممکن است حذف شده باشد.', 'info');
            }
        }
    },

    showInAppFloatingBanner: function({ title, body, taskId = null }) {
        if (!title && !body) return;
        let container = document.getElementById('inapp-floating-notifs');
        if (!container) {
            container = document.createElement('div');
            container.id = 'inapp-floating-notifs';
            container.style.cssText = `
                position: fixed;
                top: 40px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 999999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 92%;
                width: 440px;
                pointer-events: none;
                direction: rtl;
                font-family: inherit;
            `;
            document.body.appendChild(container);
        }

        const banner = document.createElement('div');
        banner.className = 'inapp-floating-toast';
        banner.style.cssText = `
            background: var(--bg-card, #1e293b);
            color: var(--text-main, #f8fafc);
            border: 1px solid var(--accent, #38bdf8);
            border-right: 4px solid var(--primary, #38bdf8);
            border-radius: 12px;
            padding: 12px 14px;
            box-shadow: 0 12px 30px rgba(0,0,0,0.55);
            display: flex;
            align-items: flex-start;
            gap: 10px;
            cursor: pointer;
            pointer-events: auto;
            animation: slideDownToast 0.25s ease-out;
            transition: opacity 0.3s ease, transform 0.3s ease;
        `;
        banner.innerHTML = `
            <div style="font-size: 1.3rem; line-height: 1; flex-shrink: 0; margin-top: 2px;">🔔</div>
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: bold; font-size: 0.9rem; color: var(--text-main); margin-bottom: 2px;">
                    ${title}
                </div>
                <div style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.4; max-height: 44px; overflow: hidden; text-overflow: ellipsis;">
                    ${body}
                </div>
                <div style="margin-top: 6px; font-size: 0.75rem; color: var(--accent); font-weight: bold; display: flex; align-items: center; gap: 4px;">
                    👉 برای باز کردن تسک کلیک کنید
                </div>
            </div>
            <button onclick="event.stopPropagation(); this.closest('.inapp-floating-toast').remove();" style="background: none; border: none; color: var(--text-muted); font-size: 1.3rem; cursor: pointer; line-height: 1; padding: 0 4px;" title="بستن">&times;</button>
        `;

        banner.addEventListener('click', async () => {
            banner.remove();
            let targetId = taskId;
            if (!targetId && typeof DBManager !== 'undefined') {
                try {
                    const allTasks = await DBManager.getTasks();
                    const match = (title || '').match(/["'«»]([^"'«»]+)["'«»]/) || (body || '').match(/["'«»]([^"'«»]+)["'«»]/);
                    if (match && match[1]) {
                        const found = allTasks.find(t => t.title && t.title.trim().toLowerCase() === match[1].trim().toLowerCase());
                        if (found) targetId = found._id;
                    }
                    if (!targetId) {
                        const found = allTasks.find(t => t.title && ((title && title.includes(t.title)) || (body && body.includes(t.title))));
                        if (found) targetId = found._id;
                    }
                } catch (e) {}
            }
            if (targetId && typeof window.openTaskById === 'function') {
                window.openTaskById(targetId);
            }
        });

        container.appendChild(banner);
        setTimeout(() => {
            if (banner.parentElement) {
                banner.style.opacity = '0';
                banner.style.transform = 'translateY(-10px)';
                setTimeout(() => banner.remove(), 300);
            }
        }, 7000);
    },

    requestSystemPermission: function(onSuccess) {
        let granted = false;
        const markGranted = () => {
            granted = true;
            const banner = document.getElementById('notif-permission-banner');
            if (banner) banner.style.display = 'none';
            if (typeof onSuccess === 'function') onSuccess();
        };

        // ۱. محیط اپلیکیشن اندروید (Cordova / APK)
        if (window.cordova && window.cordova.plugins && window.cordova.plugins.permissions) {
            const perms = window.cordova.plugins.permissions;
            const notifPerm = perms.POST_NOTIFICATIONS || 'android.permission.POST_NOTIFICATIONS';
            try {
                perms.checkPermission(notifPerm, function(status) {
                    if (!status.hasPermission) {
                        perms.requestPermission(notifPerm, function(res) {
                            if (res && res.hasPermission) markGranted();
                        }, function(err) {
                            console.warn("[Notification] خطا در درخواست مجوز اندروید:", err);
                        });
                    } else {
                        markGranted();
                    }
                }, function() {
                    perms.requestPermission(notifPerm, function(res) {
                        if (res && res.hasPermission) markGranted();
                    });
                });
            } catch (e) {
                console.warn("[Notification] خطا در اجرای پلاگین مجوز:", e);
            }
        }

        // ۲. محیط مرورگر وب (ویندوز، آیفون iOS 16.4+، کروم اندروید، مک)
        if ("Notification" in window) {
            if (Notification.permission === "default") {
                try {
                    const p = Notification.requestPermission();
                    if (p && typeof p.then === 'function') {
                        p.then(perm => {
                            if (perm === "granted") markGranted();
                        }).catch(() => {});
                    } else if (typeof Notification.requestPermission === 'function') {
                        Notification.requestPermission(function(perm) {
                            if (perm === "granted") markGranted();
                        });
                    }
                } catch (e) {}
            } else if (Notification.permission === "granted") {
                markGranted();
            }
        }
    },

    requestBatteryExemption: function() {
        if (window.MecavNotification && typeof window.MecavNotification.requestBatteryExemption === 'function') {
            window.MecavNotification.requestBatteryExemption(
                function() { if (typeof showToast === 'function') showToast('درخواست لغو محدودیت باتری ارسال شد.'); },
                function(err) { console.warn('[Notification] خطا در درخواست لغو محدودیت باتری:', err); }
            );
        } else if (window.cordova && typeof window.cordova.exec === 'function') {
            window.cordova.exec(null, null, "MecavNotification", "requestBatteryExemption", []);
        } else {
            if (typeof showToast === 'function') showToast('این قابلیت مختص اپلیکیشن اندروید است.', 'info');
        }
    },

    // آدرس سرور پوش نوتیفیکیشن روی سرور مجازی (پیش‌فرض سرور فعال)
    getServerUrl: function() {
        return localStorage.getItem('pm_push_server_url') || 'http://155.117.234.69:8080';
    },

    setServerUrl: function(url) {
        if (!url) {
            localStorage.removeItem('pm_push_server_url');
            return '';
        }
        url = url.trim().replace(/\/+$/, '');
        localStorage.setItem('pm_push_server_url', url);
        // اتصال مجدد شنونده در صورت فعال بودن کاربر
        if (this._activeUserId) {
            this.startListening(this._activeUserId);
        }
        return url;
    },

    isConfigured: function() {
        return Boolean(this.getServerUrl());
    },

    getUserTopic: function(userId) {
        if (!userId) return 'mecav_general';
        return 'mecav_u_' + String(userId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    },

    // تولید صدای زنگ شفاف و دو مرحله‌ای (Chime) با استاندارد Web Audio بدون نیاز به دانلود هیچ فایل خارجی
    playAlertSound: function() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();

            // نت اول: فرکانس 587.33 هرتز (D5)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
            gain1.gain.setValueAtTime(0.25, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.35);

            // نت دوم: فرکانس 880 هرتز (A5) با کمی تاخیر دلنشین
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
            gain2.gain.setValueAtTime(0.001, ctx.currentTime);
            gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.12);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(ctx.currentTime + 0.12);
            osc2.stop(ctx.currentTime + 0.6);
        } catch (e) {
            console.warn("[Notification] خطا در پخش صدا:", e);
        }
    },

    // ویبره زدن گوشی در دستگاه‌های اندروید
    vibrateDevice: function() {
        if (navigator.vibrate) {
            try {
                navigator.vibrate([200, 100, 200]);
            } catch (e) {}
        }
    },

    // نمایش اعلان سیستمی واقعی در ویندوز (Action Center) یا اندروید (Notification Bar) + ثبت در پیام‌های بالای برنامه
    showLocalSystemNotification: function(title, body, clickUrl = '', taskId = null) {
        if (!title && !body) return;

        // جلوگیری ۱۰۰٪ قطعی از ارسال دوتایی اعلان (همزمانی دریافت از سرور پوش و همگام‌سازی دیتابیس)
        if (this.isDuplicateNotification(title, body, taskId)) {
            return;
        }

        // ۱. ثبت فوری در بخش پیام‌ها و اعلان‌های بالای برنامه
        this.addInAppNotification({
            title: title,
            body: body,
            clickUrl: clickUrl,
            taskId: taskId
        });

        // ۲. پخش زنگ و ویبره
        this.playAlertSound();
        this.vibrateDevice();

        // ۳. نمایش بنر شناور تعاملی درون برنامه برای دسترسی آنی با یک کلیک
        this.showInAppFloatingBanner({
            title: title,
            body: body,
            taskId: taskId
        });

        // ۴. ارسال مستقیم به نوتیفیکیشن سیستمی Action Center ویندوز (در نسخه نرم‌افزار ویندوز)
        if (window.electronAPI && typeof window.electronAPI.showNotification === 'function') {
            try {
                window.electronAPI.showNotification(title, body, taskId);
            } catch (err) {
                console.warn("[Notification] خطا در ارسال به اعلان ویندوز:", err);
            }
            return;
        }

        // ۵. ارسال مستقیم به نوار وضعیت (Status Bar) اندروید از طریق پلاگین بومی بدون نیاز به هیچ برنامه جانبی
        if (window.MecavNotification && typeof window.MecavNotification.show === 'function') {
            try {
                window.MecavNotification.show(title, body, taskId);
            } catch (err) {}
            return;
        } else if (window.cordova && typeof window.cordova.exec === 'function') {
            try {
                window.cordova.exec(null, null, "MecavNotification", "show", [title, body, taskId]);
            } catch (err) {
                console.warn("[Notification] خطا در ارسال به نوار وضعیت اندروید:", err);
            }
            return;
        }

        // ۶. نمایش نوتیفیکیشن سیستمی مرورگر (ویندوز / وب)
        if (!("Notification" in window)) return;

        const effectiveClickUrl = clickUrl || (taskId ? `${window.location.origin}${window.location.pathname}#task=${taskId}` : '');

        if (Notification.permission === "granted") {
            this._displayNotification(title, body, effectiveClickUrl, taskId);
        } else if (Notification.permission === "default") {
            Notification.requestPermission().then(perm => {
                if (perm === "granted") {
                    this._displayNotification(title, body, effectiveClickUrl, taskId);
                }
            });
        }
    },

    _displayNotification: function(title, body, clickUrl, taskId = null) {
        // تلاش اول با Service Worker (بهترین پشتیبانی در اندروید، PWA و ویندوز)
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(reg => {
                if (reg.showNotification) {
                    return reg.showNotification(title, {
                        body: body,
                        icon: 'icon-192.png',
                        badge: 'icon-192.png',
                        vibrate: [200, 100, 200],
                        data: { clickUrl: clickUrl || window.location.href, taskId: taskId }
                    });
                }
                this._fallbackNotification(title, body, clickUrl, taskId);
            }).catch(() => {
                this._fallbackNotification(title, body, clickUrl, taskId);
            });
        } else {
            this._fallbackNotification(title, body, clickUrl, taskId);
        }
    },

    _fallbackNotification: function(title, body, clickUrl, taskId = null) {
        try {
            const notif = new Notification(title, {
                body: body,
                icon: 'icon-192.png'
            });
            notif.onclick = function() {
                window.focus();
                if (taskId && typeof window.openTaskById === 'function') {
                    window.openTaskById(taskId);
                } else if (clickUrl) {
                    window.location.href = clickUrl;
                }
                notif.close();
            };
        } catch (e) {}
    },

    // شروع شنود آنلاین و خودکار در پس‌زمینه برنامه (بدون نیاز به برنامه جانبی)
    startListening: function(userId) {
        if (!userId) return;
        this._activeUserId = userId;

        // اگر مجوز اعلان تا الان پرسیده نشده، درخواست بدهد
        if ("Notification" in window && Notification.permission === "default") {
            try { Notification.requestPermission(); } catch (e) {}
        }

        const serverUrl = this.getServerUrl();
        if (this._eventSource) {
            try { this._eventSource.close(); } catch (e) {}
            this._eventSource = null;
        }

        // اگر سرور آنلاین تنظیم شده بود، با استاندارد جهانی EventSource بدون هیچ نرم‌افزار اضافی گوش بدهد
        if (serverUrl) {
            const topic = this.getUserTopic(userId);

            // ۱. فعال‌سازی شنونده بومی جاوا در اندروید جهت دریافت ۲۴ ساعته اعلان در پس‌زمینه و بسته بودن برنامه
            if (window.MecavNotification && typeof window.MecavNotification.startBackgroundListener === 'function') {
                window.MecavNotification.startBackgroundListener(serverUrl, topic);
            } else if (window.cordova && typeof window.cordova.exec === 'function') {
                window.cordova.exec(null, null, "MecavNotification", "startBackgroundListener", [serverUrl, topic]);
            }

            try {
                this._eventSource = new EventSource(`${serverUrl}/${topic}/sse`);
                this._eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        // نادیده گرفتن اعلان‌هایی که خود همین دستگاه ثانیه‌ای قبل ارسال کرده
                        if (data.event === 'keepalive') return;
                        const notifKey = (data.title || '') + '_' + (data.message || '');
                        if (this._recentSelfTriggered.has(notifKey)) return;

                        let extractedTaskId = null;
                        if (data.click && data.click.includes('#task=')) {
                            extractedTaskId = data.click.split('#task=')[1].split('&')[0];
                        } else if (data.actions && Array.isArray(data.actions)) {
                            const viewAction = data.actions.find(a => a.url && a.url.includes('#task='));
                            if (viewAction) {
                                extractedTaskId = viewAction.url.split('#task=')[1].split('&')[0];
                            }
                        }

                        this.showLocalSystemNotification(
                            data.title || 'اعلان جدید مکاو',
                            data.message || '',
                            data.click || '',
                            extractedTaskId
                        );
                    } catch (err) {}
                };
                this._eventSource.onerror = () => {
                    // اتصال مجدد خودکار توسط مرورگر انجام می‌شود
                };
            } catch (err) {
                console.warn("[Notification] خطا در اتصال شنونده آنلاین:", err);
            }
        }
    },

    stopListening: function() {
        if (this._eventSource) {
            try { this._eventSource.close(); } catch (e) {}
            this._eventSource = null;
        }

        // توقف شنونده بومی اندروید
        if (window.MecavNotification && typeof window.MecavNotification.stopBackgroundListener === 'function') {
            window.MecavNotification.stopBackgroundListener();
        } else if (window.cordova && typeof window.cordova.exec === 'function') {
            window.cordova.exec(null, null, "MecavNotification", "stopBackgroundListener", []);
        }

        this._activeUserId = null;
        this._lastTasksMap = null;
    },

    // ارسال پوش به سرور VPS (برای سایر همکاران خارج از کارگاه یا در محیط‌های دیگر)
    sendPush: async function(targetUserIds, { title, body, priority = 'default', tags = ['pushpin'], clickUrl = '', taskId = null }) {
        if (!targetUserIds) return;
        const ids = Array.isArray(targetUserIds) ? targetUserIds : [targetUserIds];
        const uniqueIds = [...new Set(ids.filter(id => id !== undefined && id !== null && id !== ''))];
        if (uniqueIds.length === 0) return;

        // ثبت در حافظه محلی جهت جلوگیری از تکرار زنگ در سیستم خود فرستنده
        const notifKey = title + '_' + body;
        this._recentSelfTriggered.add(notifKey);
        setTimeout(() => this._recentSelfTriggered.delete(notifKey), 6000);

        const serverUrl = this.getServerUrl();
        if (!serverUrl) return; // اگر سرور VPS تنظیم نشده بود، همگام‌سازی محلی CouchDB کار می‌کند

        const priorityMap = { 'min': 1, 'low': 2, 'default': 3, 'high': 4, 'urgent': 5 };
        const numericPriority = priorityMap[priority] || 3;
        const targetClickUrl = clickUrl || (taskId ? `${window.location.origin}${window.location.pathname}#task=${taskId}` : (window.location.origin + window.location.pathname));

        for (const userId of uniqueIds) {
            const topic = this.getUserTopic(userId);
            const payload = {
                topic: topic,
                title: title,
                message: body,
                priority: numericPriority,
                tags: Array.isArray(tags) ? tags : [tags],
                click: targetClickUrl,
                actions: taskId ? [
                    { action: 'view', label: 'مشاهده تسک', url: targetClickUrl }
                ] : []
            };

            fetch(serverUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(err => {
                console.warn(`[Notification] ارسال به سرور انجام نشد (${topic}):`, err);
            });
        }
    },

    // بررسی هوشمند تغییرات دیتابیس (کارکرد ۱۰۰٪ خودکار حتی در حالت آفلاین و شبکه محلی کارگاه بدون اینترنت)
    handleDatabaseSyncUpdate: function(allTasks, currentUser) {
        if (!currentUser || !allTasks || !Array.isArray(allTasks)) return;

        const isInitialLoad = this._lastTasksMap === null;
        const currentTasksMap = new Map();

        allTasks.forEach(task => {
            if (!task || !task._id) return;
            const actCount = (task.activities || []).length;
            currentTasksMap.set(task._id, {
                status: task.status,
                assigneeId: task.assigneeId,
                creatorId: task.creatorId,
                observers: task.observers || [],
                activitiesCount: actCount,
                lastActivity: actCount > 0 ? task.activities[actCount - 1] : null,
                viewedBy: task.viewedBy || []
            });

            // بار اول لودینگ برنامه، نوتیفیکیشن‌های گذشته را پخش نکن
            if (isInitialLoad) return;

            const prev = this._lastTasksMap.get(task._id);

            // ۱. تسک جدید که قبلاً نبود و به کاربر فعلی ارجاع یا به عنوان ناظر تعیین شده است
            if (!prev) {
                let isDk = (typeof isDigikalaTask === 'function') && isDigikalaTask(task);
                let isObs = (task.observers || []).some(o => (typeof isSameUser === 'function') ? isSameUser(o, currentUser.id) : String(o) === String(currentUser.id)) ||
                            (isDk && window._cachedDkSettings && Array.isArray(window._cachedDkSettings.observers) && window._cachedDkSettings.observers.some(o => (typeof isSameUser === 'function') ? isSameUser(o, currentUser.id) : String(o) === String(currentUser.id)));

                if ((typeof isSameUser === 'function' ? isSameUser(task.assigneeId, currentUser.id) : String(task.assigneeId) === String(currentUser.id)) && 
                    (typeof isSameUser === 'function' ? !isSameUser(task.creatorId, currentUser.id) : String(task.creatorId) !== String(currentUser.id))) {
                    this.showLocalSystemNotification(
                        isDk ? '🛒 سفارش جدید دیجی‌کالا' : '📌 تسک جدید برای شما',
                        isDk ? `سفارش جدید دیجی‌کالا: "${task.title}" برای انجام به شما ارجاع شد.` : `تسک "${task.title}" توسط ${task.creatorName || 'همکار'} به شما ارجاع شد.`,
                        '',
                        task._id
                    );
                } else if (isObs) {
                    this.showLocalSystemNotification(
                        isDk ? '🛒 ثبت سفارش فروش دیجی‌کالا' : '👀 ناظر در تسک جدید',
                        isDk ? `سفارش جدید دیجی‌کالا ثبت شد: "${task.title}"` : `شما به عنوان ناظر در تسک "${task.title}" تعیین شدید.`,
                        '',
                        task._id
                    );
                }
            } else {
                // ۲. ثبت پیام، گزارش یا نظر جدید توسط همکار دیگر
                if (actCount > prev.activitiesCount) {
                    const lastAct = task.activities[actCount - 1];
                    if (lastAct && (typeof isSameUser === 'function' ? !isSameUser(lastAct.userId, currentUser.id) : String(lastAct.userId) !== String(currentUser.id))) {
                        let isDk = (typeof isDigikalaTask === 'function') && isDigikalaTask(task);
                        const isRelevant = (typeof isSameUser === 'function' ? isSameUser(task.assigneeId, currentUser.id) : String(task.assigneeId) === String(currentUser.id)) ||
                                          (typeof isSameUser === 'function' ? isSameUser(task.creatorId, currentUser.id) : String(task.creatorId) === String(currentUser.id)) ||
                                          (task.observers || []).some(o => (typeof isSameUser === 'function') ? isSameUser(o, currentUser.id) : String(o) === String(currentUser.id)) ||
                                          (isDk && window._cachedDkSettings && Array.isArray(window._cachedDkSettings.observers) && window._cachedDkSettings.observers.some(o => (typeof isSameUser === 'function') ? isSameUser(o, currentUser.id) : String(o) === String(currentUser.id)));
                        if (isRelevant) {
                            const isReport = lastAct.type === 'report';
                            this.showLocalSystemNotification(
                                isReport ? `📝 گزارش جدید در "${task.title}"` : `💬 نظر جدید در "${task.title}"`,
                                `${lastAct.userName || 'همکار'}: ${lastAct.text ? (lastAct.text.length > 60 ? lastAct.text.substring(0, 60) + '...' : lastAct.text) : 'تصویر ارسال شد'}`,
                                '',
                                task._id
                            );
                        }
                    }
                }

                // ۳. تغییر وضعیت تسک (تایید، برگشت، درخواست تایید)
                if (prev.status !== task.status) {
                    if (String(task.assigneeId) === String(currentUser.id)) {
                        if (task.status === 'completed') {
                            this.showLocalSystemNotification('✅ تایید نهایی تسک', `تسک "${task.title}" توسط مدیر تایید شد.`, '', task._id);
                        } else if (task.status === 'pending' && prev.status === 'pending_approval') {
                            this.showLocalSystemNotification('⚠️ برگشت تسک', `تسک "${task.title}" تایید نشد و جهت اصلاح به شما برگشت داده شد.`, '', task._id);
                        }
                    }
                    if (currentUser.role === 'admin' && task.status === 'pending_approval' && prev.status !== 'pending_approval') {
                        this.showLocalSystemNotification('📋 تسک منتظر تایید', `تسک "${task.title}" تکمیل شد و منتظر تایید مدیر است.`, '', task._id);
                    }
                }
            }
        });

        this._lastTasksMap = currentTasksMap;
    },

    // تست صدا، ویبره و اعلان سیستمی روی دستگاه کاربر
    sendTestPush: function() {
        this.showLocalSystemNotification(
            '🔔 تست اعلان سیستمی مکاو',
            'سیستم اعلان فعال است! زنگ، ویبره و بنر ویندوز / اندروید به درستی کار می‌کنند.'
        );
    }
};
