// سیستم مدیریت نسخه و بررسی خودکار بروزرسانی
const VersionManager = {
    CURRENT_VERSION: "1.0.3",
    CURRENT_VERSION_CODE: 10003,

    init: function() {
        const verEl = document.getElementById('app-current-version-text');
        if (verEl) verEl.innerText = this.CURRENT_VERSION;

        const checkBtn = document.getElementById('btnCheckAppUpdate');
        if (checkBtn) {
            checkBtn.addEventListener('click', () => this.checkForUpdates(false));
        }

        // بررسی خودکار در پس‌زمینه بعد از ۵ ثانیه از لود اولیه برنامه
        setTimeout(() => {
            this.checkForUpdates(true);
        }, 5000);
    },

    checkForUpdates: async function(silent = false) {
        const statusEl = document.getElementById('updateCheckStatus');
        if (!silent && statusEl) {
            statusEl.innerText = 'در حال بررسی آخرین نسخه...';
            statusEl.style.color = 'var(--text-muted)';
        }

        try {
            const endpoint = 'https://raw.githubusercontent.com/Ismartyx/ProjectManager/main/version.json?t=' + Date.now();
            const res = await fetch(endpoint, { cache: 'no-store' });
            if (!res.ok) throw new Error('خطا در دریافت اطلاعات نسخه');

            const data = await res.json();
            if (data && data.versionCode > this.CURRENT_VERSION_CODE) {
                if (statusEl) {
                    statusEl.innerText = `نسخه جدید ${data.version} منتشر شده است!`;
                    statusEl.style.color = 'var(--accent)';
                }
                this.showUpdatePrompt(data, silent);
            } else {
                if (!silent && statusEl) {
                    statusEl.innerText = `شما از آخرین نسخه برنامه (${this.CURRENT_VERSION}) استفاده می‌کنید.`;
                    statusEl.style.color = '#10b981';
                }
            }
        } catch (err) {
            console.warn('[Version] خطا در بررسی نسخه جدید:', err);
            if (!silent && statusEl) {
                statusEl.innerText = 'ارتباط با سرور جهت بررسی نسخه برقرار نشد.';
                statusEl.style.color = 'var(--danger)';
            }
        }
    },

    showUpdatePrompt: function(info, silent = false) {
        const isAndroid = Boolean(window.cordova);
        const isWin = Boolean(window.electronAPI && window.electronAPI.isElectron);
        let targetUrl = info.apkUrl || 'https://github.com/Ismartyx/ProjectManager/actions';
        if (isWin && info.winUrl) {
            targetUrl = info.winUrl;
        }

        const notifTitle = `🚀 نسخه جدید ${info.version} مکاو آماده است`;
        const notifBody = info.changelog || 'جهت بروزرسانی برنامه کلیک کنید.';

        // ۱. ثبت در پیام‌ها و اعلان‌های داخلی بالای برنامه
        if (typeof NotificationManager !== 'undefined' && NotificationManager.addInAppNotification) {
            NotificationManager.addInAppNotification({
                title: notifTitle,
                body: notifBody,
                clickUrl: targetUrl,
                type: 'info'
            });
        }

        // ۲. ارسال اعلان سیستمی (Action Center ویندوز / نوار وضعیت اندروید + زنگ و ویبره)
        const lastNotified = localStorage.getItem('pm_last_notified_ver_code');
        if (!silent || lastNotified !== String(info.versionCode)) {
            localStorage.setItem('pm_last_notified_ver_code', String(info.versionCode));
            if (typeof NotificationManager !== 'undefined' && NotificationManager.showLocalSystemNotification) {
                NotificationManager.showLocalSystemNotification(
                    notifTitle,
                    notifBody,
                    targetUrl
                );
            }
        }

        // ۳. بنر اقدام سریع در پایین صفحه
        let banner = document.getElementById('app-update-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'app-update-banner';
            banner.style.cssText = `
                position: fixed;
                bottom: 24px;
                left: 20px;
                right: 20px;
                max-width: 480px;
                margin: 0 auto;
                background: var(--bg-card);
                border: 2px solid var(--accent);
                color: var(--text-main);
                padding: 14px 18px;
                border-radius: 14px;
                box-shadow: 0 12px 30px rgba(0,0,0,0.6);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 8px;
                direction: rtl;
                font-family: inherit;
            `;
            document.body.appendChild(banner);
        }

        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <b style="color:var(--accent); font-size:1rem;">🚀 نسخه جدید ${info.version} آماده است</b>
                <button onclick="this.closest('#app-update-banner').remove()" style="background:none; border:none; color:var(--text-muted); font-size:1.2rem; cursor:pointer; line-height:1;">&times;</button>
            </div>
            <div style="font-size:0.85rem; color:var(--text-muted); line-height:1.5;">${info.changelog || 'بهبودهای جدید در این نسخه اعمال شده است.'}</div>
            <div style="display:flex; gap:8px; margin-top:6px;">
                <a href="${targetUrl}" target="_blank" class="btn btn-primary btn-small" style="flex:1; text-align:center; text-decoration:none; margin:0; padding:6px 12px;">
                    📥 دریافت و نصب نسخه جدید
                </a>
                <button onclick="this.closest('#app-update-banner').remove()" class="btn btn-secondary btn-small" style="margin:0; padding:6px 12px;">
                    بعداً
                </button>
            </div>
        `;
    }
};
