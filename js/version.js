// سیستم مدیریت نسخه و بررسی خودکار بروزرسانی
const VersionManager = {
    CURRENT_VERSION: "1.0.7",
    CURRENT_VERSION_CODE: 10007,

    init: function() {
        const verEl = document.getElementById('app-current-version-text');
        if (verEl) verEl.innerText = this.CURRENT_VERSION;

        const checkBtn = document.getElementById('btnCheckAppUpdate');
        if (checkBtn) {
            checkBtn.addEventListener('click', () => this.checkForUpdates(false));
        }

        // بررسی خودکار در پس‌زمینه بعد از ۴ ثانیه از لود اولیه برنامه
        setTimeout(() => {
            this.checkForUpdates(true);
        }, 4000);
    },

    checkForUpdates: async function(silent = false) {
        const statusEl = document.getElementById('updateCheckStatus');
        if (!silent && statusEl) {
            statusEl.innerText = 'در حال بررسی آخرین نسخه...';
            statusEl.style.color = 'var(--text-muted)';
        }

        try {
            let data = null;

            // ۱. تلاش اول: بررسی از مخزن ریلیزهای دیتابیس لوکال یا آنلاین
            try {
                const couchDbBase = (typeof PouchAdapter !== 'undefined' && PouchAdapter.activeUrl) 
                    ? PouchAdapter.activeUrl.replace(/\/[^/]+$/, '')
                    : 'http://155.117.234.69:5984';
                const vRes = await fetch(`${couchDbBase}/mecav_releases/app_version_info?t=${Date.now()}`);
                if (vRes.ok) {
                    data = await vRes.json();
                }
            } catch (e) {}

            // ۲. تلاش دوم: در صورت عدم دسترسی به دیتابیس، بررسی از گیت‌هاب
            if (!data) {
                try {
                    const endpoint = 'https://raw.githubusercontent.com/Ismartyx/ProjectManager/main/version.json?t=' + Date.now();
                    const res = await fetch(endpoint, { cache: 'no-store' });
                    if (res.ok) {
                        data = await res.json();
                    }
                } catch (e) {}
            }

            if (!data) {
                throw new Error('عدم دریافت اطلاعات نسخه از سرور');
            }

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

    startDirectUpdate: function(targetUrl) {
        if (!targetUrl) return;
        // در اندروید (Cordova) مستقیماً به Intent سیستم واگذار می‌شود تا دانلود منیجر بومی آن را دریافت و نصب کند
        if (window.cordova) {
            window.open(targetUrl, '_system');
        } else if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
            window.electronAPI.openExternal(targetUrl);
        } else {
            window.open(targetUrl, '_blank');
        }
    },

    showUpdatePrompt: function(info, silent = false) {
        const isWin = Boolean(window.electronAPI && window.electronAPI.isElectron);
        let targetUrl = info.apkUrl || 'http://155.117.234.69:5984/mecav_releases/app_release/MechaveWS.apk';
        if (isWin && info.winUrl) {
            targetUrl = info.winUrl;
        }

        const notifTitle = `🚀 نسخه جدید ${info.version} مکاو آماده است`;
        const notifBody = info.changelog || 'جهت دانلود و نصب مستقیم نسخه جدید کلیک کنید.';

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

        // ۳. بنر اقدام سریع در پایین صفحه (با دانلود و نصب مستقیم درون‌برنامه‌ای)
        let banner = document.getElementById('app-update-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'app-update-banner';
            banner.style.cssText = `
                position: fixed;
                bottom: 24px;
                left: 20px;
                right: 20px;
                max-width: 460px;
                margin: 0 auto;
                background: var(--bg-card);
                border: 2px solid var(--accent);
                color: var(--text-main);
                padding: 16px 20px;
                border-radius: 16px;
                box-shadow: 0 16px 36px rgba(0,0,0,0.5);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                direction: rtl;
                font-family: inherit;
                backdrop-filter: blur(10px);
            `;
            document.body.appendChild(banner);
        }

        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <b style="color:var(--accent); font-size:1rem; display:flex; align-items:center; gap:6px;">
                    🚀 نسخه جدید ${info.version} مکاو آماده است
                </b>
                <button onclick="this.closest('#app-update-banner').remove()" style="background:none; border:none; color:var(--text-muted); font-size:1.3rem; cursor:pointer; line-height:1;" title="بستن">&times;</button>
            </div>
            <div style="font-size:0.85rem; color:var(--text-muted); line-height:1.5;">${info.changelog || 'بهبودها و رفع باگ‌های جدید در این نسخه اعمال شده است.'}</div>
            <div style="display:flex; gap:10px; margin-top:4px;">
                <button onclick="VersionManager.startDirectUpdate('${targetUrl}'); this.closest('#app-update-banner').remove();" class="btn btn-primary btn-small" style="flex:1; text-align:center; margin:0; padding:8px 14px; font-weight:bold; cursor:pointer;">
                    📥 دانلود و نصب مستقیم
                </button>
                <button onclick="this.closest('#app-update-banner').remove()" class="btn btn-secondary btn-small" style="margin:0; padding:8px 14px; cursor:pointer;">
                    بعداً
                </button>
            </div>
        `;
    }
};
