// ============================================================
// سیستم هوشمند قفل خودکار برنامه (Auto-Lock on Inactivity)
// ============================================================
const AutoLockManager = {
    STORAGE_KEY: 'pm_auto_lock_minutes',
    LOCKED_USER_KEY: 'pm_locked_user_info',
    lastActivityTime: Date.now(),
    checkIntervalId: null,

    init: function() {
        // ثبت شنوندگان فعالیت موس و کیبورد
        const onUserActivity = () => {
            this.lastActivityTime = Date.now();
        };

        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
        events.forEach(evt => {
            window.addEventListener(evt, onUserActivity, { passive: true });
        });

        // بررسی دوره‌ای هر ۴ ثانیه
        if (this.checkIntervalId) clearInterval(this.checkIntervalId);
        this.checkIntervalId = setInterval(() => this.checkInactivity(), 4000);

        // اعمال وضعیت ظاهری اولیه در صورتی که برنامه از قبل قفل بوده
        this.applyLockedUI();
    },

    getTimeoutMinutes: function() {
        const val = localStorage.getItem(this.STORAGE_KEY);
        return val ? parseInt(val, 10) : 0; // 0 به معنی غیرفعال است
    },

    setTimeoutMinutes: function(minutes) {
        localStorage.setItem(this.STORAGE_KEY, String(minutes));
        this.lastActivityTime = Date.now();
        this.updateSettingsStatusText();
    },

    updateSettingsStatusText: function() {
        const statusEl = document.getElementById('autoLockStatusText');
        const selectEl = document.getElementById('selectAutoLockTimeout');
        const minutes = this.getTimeoutMinutes();

        if (selectEl) {
            selectEl.value = String(minutes);
        }

        if (statusEl) {
            if (minutes <= 0) {
                statusEl.innerHTML = 'وضعیت: <span style="color:var(--text-muted);">غیرفعال</span>';
            } else {
                statusEl.innerHTML = `وضعیت: <span style="color:var(--primary); font-weight:bold;">فعال (${minutes} دقیقه عدم فعالیت)</span>`;
            }
        }
    },

    checkInactivity: function() {
        const minutes = this.getTimeoutMinutes();
        if (minutes <= 0) return;

        // فقط در صورتی که کاربر وارد شده باشد
        const user = (typeof AuthManager !== 'undefined') ? AuthManager.getCurrentUser() : null;
        if (!user) return;

        const idleMs = Date.now() - this.lastActivityTime;
        const limitMs = minutes * 60 * 1000;

        if (idleMs >= limitMs) {
            this.lock();
        }
    },

    lock: function(isManual = false) {
        const user = (typeof AuthManager !== 'undefined') ? AuthManager.getCurrentUser() : null;
        if (!user) return;

        // ذخیره مشخصات کاربر قفل‌شده برای ورود سریع بدون نیاز به نوشتن مجدد کد پرسنلی
        localStorage.setItem(this.LOCKED_USER_KEY, JSON.stringify({
            id: user.id,
            name: user.name
        }));

        // خروج کاربر از سشن فعال
        if (typeof AuthManager !== 'undefined') {
            AuthManager.logout();
        }

        // تغییر ویو به فرم لاگین
        if (typeof window.checkLoginStatus === 'function') {
            window.checkLoginStatus();
        }

        this.applyLockedUI();

        if (typeof showToast === 'function') {
            showToast(isManual ? 'برنامه قفل شد. جهت ورود رمز عبور را وارد کنید.' : 'برنامه به دلیل عدم فعالیت قفل شد. رمز عبور را مجدداً وارد کنید.', 'info');
        }
    },

    unlock: function() {
        localStorage.removeItem(this.LOCKED_USER_KEY);
        this.lastActivityTime = Date.now();
        this.applyLockedUI();
    },

    applyLockedUI: function() {
        const lockedRaw = localStorage.getItem(this.LOCKED_USER_KEY);
        const banner = document.getElementById('lockedUserBanner');
        const nameText = document.getElementById('lockedUserNameText');
        const pInput = document.getElementById('personnelCodeInput');
        const nInput = document.getElementById('nationalCodeInput');
        const switchBtn = document.getElementById('btnSwitchUser');

        if (lockedRaw) {
            try {
                const info = JSON.parse(lockedRaw);
                if (banner) banner.style.display = 'block';
                if (nameText) {
                    nameText.innerText = `خوش آمدید، ${info.name}. لطفاً جهت ادامه، فقط رمز عبور را وارد کنید:`;
                }
                if (pInput) {
                    pInput.value = info.id;
                    pInput.readOnly = true;
                    pInput.style.opacity = '0.75';
                    pInput.style.cursor = 'not-allowed';
                }
                if (switchBtn) switchBtn.style.display = 'block';
                if (nInput) {
                    nInput.value = '';
                    setTimeout(() => nInput.focus(), 150);
                }
            } catch (e) {
                localStorage.removeItem(this.LOCKED_USER_KEY);
            }
        } else {
            if (banner) banner.style.display = 'none';
            if (switchBtn) switchBtn.style.display = 'none';
            if (pInput) {
                pInput.readOnly = false;
                pInput.style.opacity = '1';
                pInput.style.cursor = 'text';
            }
        }
    },

    clearLockedUser: function() {
        localStorage.removeItem(this.LOCKED_USER_KEY);
        const pInput = document.getElementById('personnelCodeInput');
        const nInput = document.getElementById('nationalCodeInput');
        if (pInput) {
            pInput.value = '';
            pInput.readOnly = false;
            pInput.style.opacity = '1';
            pInput.style.cursor = 'text';
            pInput.focus();
        }
        if (nInput) {
            nInput.value = '';
        }
        this.applyLockedUI();
    }
};

window.AutoLockManager = AutoLockManager;
