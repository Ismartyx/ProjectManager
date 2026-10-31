function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'fadeOut 0.3s forwards'; setTimeout(() => toast.remove(), 300); }, 2500);
}

// ==========================================
// سیستم پاپ‌آپ (Modal) یکپارچه
// ==========================================
window.showCustomModal = function(options) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 100000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); opacity: 0; transition: opacity 0.2s ease;';
        
        const box = document.createElement('div');
        box.className = 'card';
        box.style.cssText = 'width: 90%; max-width: 400px; padding: 20px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); transform: translateY(20px); transition: transform 0.2s ease; text-align: right;';

        if(options.title) box.innerHTML += `<h3 style="margin-top: 0; color: var(--primary); font-size: 1.1rem; margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">${options.title}</h3>`;
        if(options.message) box.innerHTML += `<div style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 15px; line-height: 1.6;">${options.message}</div>`;
        if(options.html) box.innerHTML += `<div style="margin-bottom: 15px; line-height: 1.5;">${options.html}</div>`;

        let inputEl = null;
        let checkEl = null;

        if(options.type === 'prompt' || options.type === 'complex') {
            inputEl = document.createElement('input');
            inputEl.type = 'text';
            if (options.placeholder) {
                inputEl.value = options.placeholder; 
                inputEl.placeholder = options.placeholder;
            }
            inputEl.style.cssText = 'width: 100%; padding: 10px 12px; margin-bottom: 15px; border-radius: 10px; border: 1px solid var(--border-input); background: var(--bg-input); color: var(--text-main); font-family: inherit; font-size: 0.95rem; outline: none;';
            box.appendChild(inputEl);
        }

        if(options.type === 'complex' && options.checkboxLabel) {
            const chkWrap = document.createElement('label');
            chkWrap.style.cssText = 'display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 15px; cursor: pointer;';
            checkEl = document.createElement('input');
            checkEl.type = 'checkbox';
            checkEl.style.cssText = 'width: 16px; height: 16px; accent-color: var(--primary); margin: 0;';
            chkWrap.appendChild(checkEl);
            chkWrap.appendChild(document.createTextNode(options.checkboxLabel));
            box.appendChild(chkWrap);
        }

        const btnWrap = document.createElement('div');
        btnWrap.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px;';

        const btnCancel = document.createElement('button');
        btnCancel.className = 'btn btn-secondary btn-custom-modal-cancel';
        btnCancel.innerText = 'انصراف';
        btnCancel.style.padding = '8px 16px';
        btnCancel.style.fontSize = '0.85rem';
        btnCancel.onclick = () => { close(); resolve(null); };

        const btnOk = document.createElement('button');
        btnOk.className = 'btn btn-primary';
        btnOk.innerText = options.okText || 'تایید';
        btnOk.style.padding = '8px 16px';
        btnOk.style.fontSize = '0.85rem';
        btnOk.onclick = () => {
            if(options.type === 'alert' || options.type === 'confirm') {
                close(); resolve(true);
            } else if(options.type === 'prompt') {
                close(); resolve(inputEl.value);
            } else if(options.type === 'complex') {
                close(); resolve({ value: inputEl.value, checked: checkEl.checked });
            }
        };

        if(options.type !== 'alert') btnWrap.appendChild(btnCancel);
        btnWrap.appendChild(btnOk);
        box.appendChild(btnWrap);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            box.style.transform = 'translateY(0)';
        });

        if(inputEl) {
            setTimeout(() => {
                inputEl.focus();
                inputEl.select();
            }, 200);
        }

        if (typeof NavigationBackManager !== 'undefined') {
            NavigationBackManager.pushNavState('customModal');
        }

        function close() {
            overlay.style.opacity = '0';
            box.style.transform = 'translateY(20px)';
            setTimeout(() => overlay.remove(), 200);
        }
    });
}

// ==========================================
// مدیریت پیشرفته دکمه بازگشت (Back Button) در اندروید، موبایل و مرورگر
// ==========================================
const NavigationBackManager = {
    _lastBackPressTime: 0,
    _historyDepth: 0,
    _inited: false,

    init: function() {
        if (this._inited) return;
        this._inited = true;

        const onHardwareBack = (e) => {
            if (e) {
                try { e.preventDefault(); } catch (err) {}
                try { e.stopPropagation(); } catch (err) {}
            }
            this.handleBack(false);
        };

        // ۱. پشتیبانی بومی کلید بازگشت در اندروید (Cordova BackButton)
        document.addEventListener('backbutton', onHardwareBack, false);
        document.addEventListener('deviceready', () => {
            document.addEventListener('backbutton', onHardwareBack, false);
        }, false);

        // ۲. پشتیبانی از مرورگر موبایل، ژست‌های حرکتی (Swipe Back) و PWA
        window.addEventListener('popstate', (e) => {
            this.handleBack(true);
        });

        // ۳. پشتیبانی از کلید Escape در نسخه دسکتاپ و کیبورد فیزیکی
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.handleBack(false);
            }
        });

        try {
            history.replaceState({ appRoot: true }, '');
        } catch (e) {}
    },

    pushNavState: function(contextName = 'modal') {
        try {
            this._historyDepth++;
            history.pushState({ appNav: true, depth: this._historyDepth, context: contextName }, '');
        } catch (e) {}
    },

    handleBack: function(fromPopstate = false) {
        // اولویت ۱: پاپ‌آپ‌ها یا مودال‌های تأیید داینامیک showCustomModal
        const customModalOverlay = document.querySelector('.custom-modal-overlay');
        if (customModalOverlay) {
            const cancelBtn = customModalOverlay.querySelector('.btn-custom-modal-cancel') || 
                              customModalOverlay.querySelector('button.btn-secondary') ||
                              customModalOverlay.querySelector('button');
            if (cancelBtn) {
                cancelBtn.click();
            } else {
                customModalOverlay.remove();
            }
            return true;
        }

        // اولویت ۲: پیش‌نمایش تمام‌صفحه تصاویر (Image Viewer)
        const imageViewer = document.getElementById('imageViewer');
        if (imageViewer && imageViewer.classList.contains('active')) {
            imageViewer.classList.remove('active');
            return true;
        }

        // اولویت ۳: مودال تاریخچه وقایع تسک (Task History Modal)
        const taskHistoryModal = document.getElementById('taskHistoryModal');
        if (taskHistoryModal && (taskHistoryModal.classList.contains('active') || taskHistoryModal.style.display !== 'none')) {
            taskHistoryModal.classList.remove('active');
            taskHistoryModal.style.display = 'none';
            return true;
        }

        // اولویت ۳: مودال جزئیات و چت تسک (Task Detail Modal)
        const taskDetailModal = document.getElementById('taskDetailModal');
        if (taskDetailModal && taskDetailModal.classList.contains('active')) {
            taskDetailModal.classList.remove('active');
            return true;
        }

        // اولویت ۴: مودال ثبت تسک جدید (Add Modal)
        const addModal = document.getElementById('addModal');
        if (addModal && addModal.classList.contains('active')) {
            addModal.classList.remove('active');
            return true;
        }

        // اولویت ۵: پنجره اختصاصی درباره ما (About Modal)
        const aboutModal = document.getElementById('aboutModal');
        if (aboutModal && (aboutModal.classList.contains('active') || (aboutModal.style.display && aboutModal.style.display !== 'none'))) {
            if (window.closeAboutModal) {
                window.closeAboutModal();
            } else {
                aboutModal.classList.remove('active');
                aboutModal.style.display = 'none';
            }
            return true;
        }

        // اولویت ۶: پالت‌ها و دراپ‌داون‌های باز در صفحه
        const openPalettes = document.querySelectorAll('.palette-dropdown[style*="display: block"], .palette-dropdown[style*="display: flex"]');
        if (openPalettes.length > 0) {
            openPalettes.forEach(p => p.style.display = 'none');
            return true;
        }

        // اولویت ۷: اگر کاربر در صفحه تنظیمات است -> بازگشت به داشبورد
        const settingsView = document.getElementById('settings-view');
        const dashboardView = document.getElementById('dashboard-view');
        if (settingsView && settingsView.style.display !== 'none') {
            const btnBack = document.getElementById('btnBackToDashboard');
            if (btnBack) {
                btnBack.click();
            } else {
                settingsView.style.display = 'none';
                if (dashboardView) dashboardView.style.display = 'block';
            }
            return true;
        }

        // اولویت ۸: پاک کردن متن جستجوی داشبورد در صورت وجود
        const searchInput = document.getElementById('dashboardSearchInput');
        if (searchInput && searchInput.value.trim() !== '') {
            searchInput.value = '';
            if (typeof renderDashboard === 'function') renderDashboard();
            return true;
        }

        // اولویت ۹: صفحه اصلی داشبورد (خروج دومرحله‌ای برای جلوگیری از خروج ناخواسته)
        const now = Date.now();
        if (now - this._lastBackPressTime < 2200) {
            // تایید خروج با کلیک دوم
            if (window.navigator && window.navigator.app && typeof window.navigator.app.exitApp === 'function') {
                window.navigator.app.exitApp();
            } else if (window.electronAPI && typeof window.electronAPI.closeWindow === 'function') {
                window.electronAPI.closeWindow();
            }
        } else {
            this._lastBackPressTime = now;
            if (typeof showToast === 'function') {
                showToast('برای خروج از برنامه، یک بار دیگر دکمه بازگشت را بزنید.', 'info');
            }
            try {
                history.pushState({ appRoot: true }, '');
            } catch (e) {}
        }
        return false;
    }
};
window.NavigationBackManager = NavigationBackManager;
try { NavigationBackManager.init(); } catch (e) {}

// ==========================================
// تزریق استایل و رنگ‌بندی یکپارچه مکاو
// ==========================================
function injectMecavUnifiedTheme() {
    // استایل‌ها اکنون به صورت استاندارد در css/style.css قرار دارند
}

// توابع کمکی استاندارد متنی و عددی
function enToFaDigits(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}
window.enToFaDigits = enToFaDigits;

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

function jalaliToGregorian(jy, jm, jd) {
    let gy;
    if (jy > 979) {
        gy = 1600;
        jy -= 979;
    } else {
        gy = 621;
    }
    let days = (365 * jy) + ((parseInt(jy / 33, 10)) * 8) + (parseInt(((jy % 33) + 3) / 4, 10)) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : (((jm - 7) * 30) + 186));
    gy += 400 * (parseInt(days / 146097, 10));
    days %= 146097;
    if (days > 36524) {
        gy += 100 * (parseInt(--days / 36524, 10));
        days %= 36524;
        if (days >= 365) days++;
    }
    gy += 4 * (parseInt(days / 1461, 10));
    days %= 1461;
    if (days > 365) {
        gy += parseInt((days - 1) / 365, 10);
        days = (days - 1) % 365;
    }
    let gd = days + 1;
    let sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm;
    for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
    return [gy, gm, gd];
}
window.jalaliToGregorian = jalaliToGregorian;

function applyFontSize(sizeStr) {
    if (!sizeStr) sizeStr = '15px';
    const pxVal = parseInt(sizeStr, 10) || 15;
    const finalStr = pxVal + 'px';
    document.documentElement.style.fontSize = finalStr;
    document.body.style.fontSize = finalStr;
    localStorage.setItem('pm_font_size', finalStr);

    const lbl = document.getElementById('fontSizeDisplayLabel');
    if (lbl) {
        lbl.innerText = (typeof enToFaDigits === 'function' ? enToFaDigits(pxVal) : pxVal) + ' پیکسل';
    }
}

function changeFontSize(delta) {
    const current = parseInt(localStorage.getItem('pm_font_size') || '15px', 10) || 15;
    let next = current + delta;
    if (next < 11) next = 11;
    if (next > 26) next = 26;
    applyFontSize(next + 'px');
}

function resetFontSizeDefault() {
    applyFontSize('15px');
}

function initLiveClock() {
    const timeEl = document.getElementById('headerLiveTime');
    const dateEl = document.getElementById('headerLiveDate');
    if (!timeEl || !dateEl) return;

    function update() {
        const now = new Date();
        try {
            // ساعت دیجیتال استاندارد و نزدیک به هم: HH:MM:SS
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');
            timeEl.innerText = `${h}:${m}:${s}`;

            // فرمت استاندارد تاریخ شمسی: روز، ماه، سال (مثلاً: پنجشنبه، ۷ آبان ۱۴۰۵)
            const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            const parts = formatter.formatToParts(now);
            const p = {};
            parts.forEach(part => { p[part.type] = part.value; });
            const weekday = p.weekday ? `${p.weekday}، ` : '';
            dateEl.innerText = `${weekday}${p.day || ''} ${p.month || ''} ${p.year || ''}`;
        } catch (e) {
            timeEl.innerText = now.toTimeString().split(' ')[0];
        }
    }
    update();
    setInterval(update, 1000);
}

function applyBrandingAndIcons() {
    injectMecavUnifiedTheme();
    document.title = "مدیریت پروژه مکاو";
    applyFontSize(localStorage.getItem('pm_font_size') || '15px');
    initLiveClock();

    const iconUrl = "icon-192.png?v=10";

    const headerTitle = document.getElementById('header-title');
    if (headerTitle) {
        headerTitle.innerText = "مدیریت پروژه مکاو";
    }

    const loginView = document.getElementById('login-view');
    if (loginView && !document.getElementById('mecavLoginLogo')) {
        const loginCard = loginView.querySelector('.card') || loginView.firstElementChild;
        if (loginCard) {
            const logoBox = document.createElement('div');
            logoBox.id = 'mecavLoginLogo';
            logoBox.style.cssText = 'text-align: center; margin-bottom: 14px;';
            logoBox.innerHTML = `<img src="${iconUrl}" style="width: 76px; height: 76px; drop-shadow: 0 6px 20px rgba(0,0,0,0.4);" />`;
            loginCard.insertBefore(logoBox, loginCard.firstChild);
        }
    }
}

function faToEnDigits(str) {
    if (!str) return '';
    return String(str).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

function parseDeadlineInput(rawInput) {
    let clean = faToEnDigits(rawInput).trim();
    if (!clean) return { timestamp: null, label: '' };

    if (/^\d+$/.test(clean)) {
        let days = parseInt(clean, 10);
        let d = new Date(); d.setDate(d.getDate() + days); d.setHours(23, 59, 59, 999);
        return { timestamp: d.getTime(), label: d.toLocaleDateString('fa-IR') };
    }

    let match = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (match) {
        let jy = parseInt(match[1], 10);
        let jm = parseInt(match[2], 10);
        let jd = parseInt(match[3], 10);
        if (jy > 1300 && jy < 1500) {
            let [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
            let d = new Date(gy, gm - 1, gd, 23, 59, 59, 999);
            return { timestamp: d.getTime(), label: d.toLocaleDateString('fa-IR') };
        }
    }

    let parsedTime = Date.parse(clean);
    if (!isNaN(parsedTime)) {
        let d = new Date(parsedTime); d.setHours(23, 59, 59, 999);
        return { timestamp: d.getTime(), label: d.toLocaleDateString('fa-IR') };
    }

    return { timestamp: null, label: clean };
}

function isTaskOverdue(task) {
    if (task.status === 'completed' || !task.deadlineTimestamp) return false;
    let now = Date.now();
    let startOfDeadlineDay = task.deadlineTimestamp - (24 * 60 * 60 * 1000) + 1000;
    return now >= startOfDeadlineDay;
}

function isSameUser(id1, id2) {
    if (!id1 || !id2) return id1 === id2;
    return ((id1 === '100' || id1 === 'admin') && (id2 === '100' || id2 === 'admin')) || String(id1) === String(id2);
}
window.isSameUser = isSameUser;

// تشخیص تسک‌های سفارش فروش دیجی‌کالا
function isDigikalaTask(t) {
    if (!t) return false;
    return Boolean(
        t.isDigikala || 
        t.dkpc || 
        t.creatorId === 'digikala_bot' || 
        (t.tag && t.tag.includes('دیجی‌کالا')) ||
        (t.title && t.title.includes('دیجی‌کالا'))
    );
}
window.isDigikalaTask = isDigikalaTask;

// بررسی امن عضویت ناظر در تسک با تطبیق رشته و عدد
function isUserObserver(task, userId) {
    if (!task || !task.observers || !Array.isArray(task.observers)) return false;
    return task.observers.some(o => isSameUser(o, userId));
}
window.isUserObserver = isUserObserver;

// بررسی کامل و دقیق سطح دسترسی کاربر برای مشاهده تسک در داشبورد
function isUserAllowedToViewTask(t, u) {
    if (!t || !u) return false;
    if (u.role === 'admin' || isSameUser(u.id, '100')) return true;
    if (isSameUser(t.assigneeId, u.id)) return true;
    if (isSameUser(t.finalizerId, u.id)) return true;
    if (isSameUser(t.creatorId, u.id)) return true;
    if (t.isPublic) return true;
    if (isUserObserver(t, u.id)) return true;

    // اگر تسک سفارش دیجی‌کالا باشد، افراد انتخاب‌شده در تنظیمات دیجی‌کالا نیز اجازه دسترسی دارند
    if (isDigikalaTask(t)) {
        let dkSettings = window._cachedDkSettings;
        if (!dkSettings) {
            try {
                const raw = localStorage.getItem('pm_digikala_settings');
                if (raw) dkSettings = JSON.parse(raw);
            } catch (e) {}
        }
        if (dkSettings && Array.isArray(dkSettings.observers)) {
            if (dkSettings.observers.some(o => isSameUser(o, u.id))) return true;
        }
    }

    return false;
}
window.isUserAllowedToViewTask = isUserAllowedToViewTask;

window.openDigikalaPanel = function(url) {
    if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
        window.electronAPI.openExternal(url);
    } else if (window.MecavNotification && typeof window.MecavNotification.openUrl === 'function') {
        window.MecavNotification.openUrl(url);
    } else {
        window.open(url, '_blank');
    }
};

function findUserName(id) {
    if (!id) return '';
    if (id === 'digikala_bot') return 'ربات دیجی‌کالا';
    try {
        let uList = (typeof AuthManager !== 'undefined' && Array.isArray(AuthManager.usersList)) ? AuthManager.usersList : [];
        if (id === 'admin' || id === '100') {
            let adm = uList.find(u => u && (u.id === '100' || u.id === 'admin'));
            return adm ? adm.name : 'مدیر سیستم';
        }
        let u = uList.find(user => user && isSameUser(user.id, id));
        return u ? u.name : String(id);
    } catch (e) {
        return String(id);
    }
}
window.findUserName = findUserName;

function getUserColor(userId) {
    if (!userId) return '#94a3b8';
    if (userId === 'digikala_bot') return '#ef394e';
    if (userId === '100' || userId === 'admin') return '#f59e0b';
    const colors = ['#10b981', '#a855f7', '#ec4899', '#f43f5e', '#0ea5e9', '#8b5cf6', '#14b8a6'];
    let hash = 0;
    for (let i = 0; i < String(userId).length; i++) hash = String(userId).charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

function getDefaultUserCharacter(userId) {
    if (!userId) return '👤';
    if (userId === 'digikala_bot') return '🛒';
    if (userId === '100' || userId === 'admin') return '👑';
    const chars = ['👨‍💼', '👨‍🔧', '👷‍♂️', '🧑‍💻', '👨‍🔬', '🧙‍♂️', '🦸‍♂️', '🦁', '🦊', '🦉', '🤖', '🚀', '🎯', '⚡', '🛡️', '🌟'];
    let hash = 0;
    const str = String(userId);
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return chars[Math.abs(hash) % chars.length];
}
window.getDefaultUserCharacter = getDefaultUserCharacter;

function getUserAvatar(userId) {
    if (!userId) return null;
    try {
        let uList = (typeof AuthManager !== 'undefined' && Array.isArray(AuthManager.usersList)) ? AuthManager.usersList : [];
        let user = uList.find(u => u && isSameUser(u.id, userId));
        if (user && user.avatar) return user.avatar;
        return getDefaultUserCharacter(userId);
    } catch (e) {
        return getDefaultUserCharacter(userId);
    }
}

function getUserAvatarHtml(userId, size = 24) {
    try {
        const avatar = getUserAvatar(userId) || getDefaultUserCharacter(userId);

        if (avatar.startsWith('data:image') || avatar.startsWith('http')) {
            return `<img src="${avatar}" class="user-avatar-thumb" style="width:${size}px; height:${size}px; border-radius:50%; margin-left:6px; object-fit:cover; vertical-align:middle;" alt="" />`;
        } else {
            return `<span class="user-avatar-thumb" style="display:inline-flex; align-items:center; justify-content:center; width:${size}px; height:${size}px; background:var(--bg-input); font-size:${Math.round(size * 0.72)}px; border:1px solid var(--border-color); border-radius:50%; margin-left:6px; line-height:1; vertical-align:middle; user-select:none;">${avatar}</span>`;
        }
    } catch (e) {
        return '';
    }
}

function setupCustomSelect(wrapperId, dataArray, placeholder, onDeleteClick = null, userObj = null) {
    const wrapper = document.getElementById(wrapperId);
    if(!wrapper) return;
    const selectDiv = wrapper.querySelector('.custom-select');
    const textSpan = wrapper.querySelector('.select-text');
    const optionsDiv = wrapper.querySelector('.custom-options');
    
    textSpan.innerText = placeholder; wrapper.dataset.value = ""; optionsDiv.innerHTML = '';

    dataArray.forEach(item => {
        let opt = document.createElement('div');
        opt.className = 'custom-option';
        
        if (item.value === 'ADD_NEW_PROJECT' || item.value === 'ADD_NEW_TAG') {
            opt.className = 'custom-option action-option';
            opt.innerHTML = `<span style="color: var(--primary); font-weight: bold; display: flex; align-items: center; gap: 6px;">${item.text}</span>`;
        } else if (onDeleteClick && item.canDelete) {
            opt.innerHTML = `<span>${item.text}</span> <span class="delete-btn" style="color:var(--danger); font-size:1.2rem;">✕</span>`;
            opt.querySelector('.delete-btn').onclick = async (e) => {
                e.stopPropagation();
                let isConfirmed = await showCustomModal({ title: 'حذف', message: `آیا از حذف "${item.text}" مطمئن هستید؟`, type: 'confirm', okText: 'بله، حذف شود' });
                if(isConfirmed) onDeleteClick(item.rawId);
            };
        } else { opt.innerText = item.text; }

        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            if (item.value === 'ADD_NEW_PROJECT') {
                document.querySelectorAll('.custom-options').forEach(el => el.classList.remove('open'));
                if(userObj && window.handleAddNewProject) window.handleAddNewProject(userObj);
                return;
            }
            if (item.value === 'ADD_NEW_TAG') {
                document.querySelectorAll('.custom-options').forEach(el => el.classList.remove('open'));
                if(userObj && window.handleAddNewTag) window.handleAddNewTag(userObj);
                return;
            }
            textSpan.innerText = item.text; wrapper.dataset.value = item.value;
            optionsDiv.classList.remove('open');
            wrapper.querySelectorAll('.custom-option').forEach(o => o.style.color = '');
            opt.style.color = 'var(--primary)';
        });
        optionsDiv.appendChild(opt);
    });

    selectDiv.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-options').forEach(el => { if(el !== optionsDiv) el.classList.remove('open'); });
        document.querySelectorAll('.multi-select-panel').forEach(p => p.classList.remove('open'));
        optionsDiv.classList.toggle('open');
    };
}

function setupMultiSelectWithSearch(wrapperId, dataArray, placeholder) {
    const wrapper = document.getElementById(wrapperId);
    if(!wrapper) return;
    wrapper.innerHTML = `
        <div class="multi-select-header">
            <span class="selected-text">${placeholder}</span>
            <span style="font-size: 0.7rem; color: var(--text-muted);">▼</span>
        </div>
        <div class="multi-select-panel">
            <div class="multi-select-search"><input type="text" placeholder="🔍 جستجوی نام یا کد..." class="ms-search-input" /></div>
            <div class="multi-select-list">
                ${dataArray.map(item => `
                    <label class="multi-select-item" data-search="${item.text.toLowerCase()} ${item.value.toLowerCase()}">
                        <input type="checkbox" value="${item.value}" class="ms-checkbox" />
                        <span style="font-size: 0.85rem; color: var(--text-main);">${item.text}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `;

    const header = wrapper.querySelector('.multi-select-header');
    const panel = wrapper.querySelector('.multi-select-panel');
    const searchInput = wrapper.querySelector('.ms-search-input');
    const items = wrapper.querySelectorAll('.multi-select-item');
    const checkboxes = wrapper.querySelectorAll('.ms-checkbox');
    const textSpan = wrapper.querySelector('.selected-text');

    header.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.multi-select-panel').forEach(p => { if(p !== panel) p.classList.remove('open'); });
        document.querySelectorAll('.custom-options').forEach(p => p.classList.remove('open'));
        panel.classList.toggle('open');
        if(panel.classList.contains('open')) searchInput.focus();
    });
    panel.addEventListener('click', (e) => e.stopPropagation());
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        items.forEach(item => {
            if(item.dataset.search.includes(term)) item.classList.remove('hidden');
            else item.classList.add('hidden');
        });
    });
    checkboxes.forEach(chk => {
        chk.addEventListener('change', () => {
            const selectedCount = Array.from(checkboxes).filter(c => c.checked).length;
            if(selectedCount === 0) textSpan.innerText = placeholder; else textSpan.innerText = `${selectedCount} نفر انتخاب شد`;
        });
    });
    wrapper.getSelectedValues = () => Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
}

document.addEventListener('click', () => {
    document.querySelectorAll('.custom-options').forEach(el => el.classList.remove('open'));
    document.querySelectorAll('.multi-select-panel').forEach(el => el.classList.remove('open'));
});

function compressImageToBase64(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800; const scaleSize = Math.min(1, MAX_WIDTH / img.width);
            canvas.width = img.width * scaleSize; canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            callback(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

const BackupManager = {
    buildBackupPayload: async function() {
        let allData = await PouchAdapter.localDB.allDocs({ include_docs: true });
        let cleanDocs = allData.rows.map(r => { let doc = Object.assign({}, r.doc); delete doc._rev; return doc; });
        return { app: "MechaveWS", exportDate: new Date().toISOString(), totalItems: cleanDocs.length, users: AuthManager.usersList, data: cleanDocs };
    },

    applyRestoreData: async function(parsed) {
        let docsToRestore = parsed.data || parsed;
        if (!Array.isArray(docsToRestore)) throw new Error('فرمت فایل بک‌آپ نامعتبر است.');
        for (let doc of docsToRestore) await PouchAdapter.saveItem(doc);
        if (parsed.users && Array.isArray(parsed.users)) { AuthManager.usersList = parsed.users; AuthManager.saveUsers(); }
        await AuthManager.syncFromDB();
        window.dispatchEvent(new CustomEvent('db_updated', { detail: { source: 'restore' } }));
        showToast('✅ اطلاعات با موفقیت بازیابی شد!');
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    try { applyBrandingAndIcons(); } catch (e) { console.warn(e); }
    try { if (typeof VersionManager !== 'undefined') VersionManager.init(); } catch (e) {}
    try { if (typeof NavigationBackManager !== 'undefined') NavigationBackManager.init(); } catch (e) {}

    // نمایش دکمه بهینه‌سازی باتری در اندروید
    const checkAndroidBatteryBtn = () => {
        if (window.cordova || navigator.userAgent.toLowerCase().includes('android')) {
            const b = document.getElementById('btnBatteryExemption');
            if (b) b.style.display = 'inline-flex';
        }
    };
    checkAndroidBatteryBtn();
    document.addEventListener('deviceready', checkAndroidBatteryBtn);

    // پیش‌بارگذاری تنظیمات دیجی‌کالا برای هماهنگی سطح دسترسی ناظران
    try {
        let storedDk = localStorage.getItem('pm_digikala_settings');
        if (storedDk) window._cachedDkSettings = JSON.parse(storedDk);
        if (typeof DBManager !== 'undefined' && DBManager.getDigikalaSettings) {
            DBManager.getDigikalaSettings().then(s => { if (s) window._cachedDkSettings = s; });
        }
    } catch(e) {}

    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }

    DBManager.init();
    await AuthManager.syncFromDB();

    window.preselectedProjectId = null;
    window.preselectedProjectTitle = null;

    function setupSettingsUI() {
        const settingsView = document.getElementById('settings-view');
        if (!settingsView || document.getElementById('fontSettingsPanel')) return;

        const fontPanel = document.createElement('div');
        fontPanel.id = 'fontSettingsPanel';
        fontPanel.style.cssText = 'background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 16px; margin-top: 16px; margin-bottom: 20px; box-shadow: var(--shadow);';
        fontPanel.innerHTML = `
            <div style="color: var(--primary); font-weight: bold; font-size: 0.95rem; margin-bottom: 14px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
                🎨 تنظیم اندازه قلم (فونت) برنامه
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <button id="btnFontDecrease" class="btn btn-secondary" style="width: 44px; height: 42px; font-size: 1.2rem; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; padding: 0;" title="کوچک‌تر کردن متن">➖</button>
                    <div id="fontSizeDisplayLabel" style="min-width: 90px; text-align: center; font-weight: bold; font-size: 1.05rem; color: var(--primary);">۱۵ پیکسل</div>
                    <button id="btnFontIncrease" class="btn btn-secondary" style="width: 44px; height: 42px; font-size: 1.2rem; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; padding: 0;" title="بزرگ‌تر کردن متن">➕</button>
                </div>
                <button id="btnFontResetDefault" class="btn btn-secondary btn-small" style="padding: 9px 16px; border-radius: 10px; font-size: 0.85rem;">🔄 پیش‌فرض (۱۵)</button>
            </div>
        `;
        settingsView.appendChild(fontPanel);

        document.getElementById('btnFontDecrease').addEventListener('click', () => changeFontSize(-1));
        document.getElementById('btnFontIncrease').addEventListener('click', () => changeFontSize(1));
        document.getElementById('btnFontResetDefault').addEventListener('click', () => resetFontSizeDefault());
        applyFontSize(localStorage.getItem('pm_font_size') || '15px');

        // فعال‌سازی و تست اعلان‌ها و صدای زنگ روی این دستگاه
        const btnEnableNotif = document.getElementById('btnEnableNotif');
        const btnTestMyNotif = document.getElementById('btnTestMyNotif');
        const notifStatusText = document.getElementById('notifStatusText');

        function updateNotifStatusDisplay() {
            if (!notifStatusText) return;
            if (!("Notification" in window)) {
                notifStatusText.innerHTML = '<span style="color:var(--text-muted);">اعلان سیستمی در این مرورگر پشتیبانی نمی‌شود (صدای زنگ فعال است).</span>';
                return;
            }
            if (Notification.permission === 'granted') {
                notifStatusText.innerHTML = '<span style="color:#10b981; font-weight:bold;">🟢 اعلان سیستمی، ویبره و صدای زنگ روی این دستگاه فعال است.</span>';
            } else if (Notification.permission === 'denied') {
                notifStatusText.innerHTML = '<span style="color:#ef4444;">🔴 دسترسی اعلان مسدود شده است. لطفاً از تنظیمات سایت یا مرورگر دسترسی به Notification را مجاز کنید.</span>';
            } else {
                notifStatusText.innerHTML = '<span style="color:#f59e0b;">⏳ دسترسی اعلان هنوز فعال نشده است. روی دکمه فعال‌سازی بزنید.</span>';
            }
        }
        updateNotifStatusDisplay();

        if (btnEnableNotif && !btnEnableNotif.dataset.bound) {
            btnEnableNotif.dataset.bound = "true";
            btnEnableNotif.addEventListener('click', async () => {
                if ("Notification" in window) {
                    try {
                        let perm = await Notification.requestPermission();
                        updateNotifStatusDisplay();
                        if (perm === 'granted') {
                            NotificationManager.showLocalSystemNotification(
                                '✅ اعلان‌های مکاو فعال شد',
                                'صدای زنگ و اعلان‌های سیستمی روی این دستگاه با موفقیت فعال شدند.'
                            );
                            showToast('اعلان‌ها با موفقیت فعال شدند.');
                        } else {
                            showToast('دسترسی اعلان تایید نشد.', 'error');
                        }
                    } catch (e) {
                        NotificationManager.playAlertSound();
                        showToast('صدای زنگ فعال شد.');
                    }
                } else {
                    NotificationManager.playAlertSound();
                    showToast('صدای زنگ فعال است.');
                }
            });
        }

        if (btnTestMyNotif && !btnTestMyNotif.dataset.bound) {
            btnTestMyNotif.dataset.bound = "true";
            btnTestMyNotif.addEventListener('click', () => {
                NotificationManager.requestSystemPermission();
                NotificationManager.sendTestPush();
                showToast('زنگ و پیام تستی در نوار بالای برنامه ثبت شد.');
            });
        }

        // تنظیمات قفل خودکار و امنیت برنامه (عدم فعالیت)
        const selectAutoLock = document.getElementById('selectAutoLockTimeout');
        const btnLockAppNow = document.getElementById('btnLockAppNow');

        if (typeof AutoLockManager !== 'undefined') {
            AutoLockManager.updateSettingsStatusText();
        }

        if (selectAutoLock && !selectAutoLock.dataset.bound) {
            selectAutoLock.dataset.bound = "true";
            selectAutoLock.addEventListener('change', () => {
                const val = parseInt(selectAutoLock.value, 10);
                if (typeof AutoLockManager !== 'undefined') {
                    AutoLockManager.setTimeoutMinutes(val);
                }
                showToast(val > 0 ? `قفل خودکار پس از ${val} دقیقه عدم فعالیت فعال شد.` : 'قفل خودکار غیرفعال شد.');
            });
        }

        if (btnLockAppNow && !btnLockAppNow.dataset.bound) {
            btnLockAppNow.dataset.bound = "true";
            btnLockAppNow.addEventListener('click', () => {
                if (typeof AutoLockManager !== 'undefined') {
                    AutoLockManager.lock();
                }
            });
        }

        // ==========================================
        // تنظیمات آواتار و کاراکتر پروفایل کاربر (تلگرامی)
        // ==========================================
        const PRESET_AVATARS = [
            { icon: '👨‍🔧', label: 'مکانیک' },
            { icon: '👷', label: 'مهندس' },
            { icon: '🧑‍💻', label: 'فنی' },
            { icon: '👨‍💼', label: 'مدیر' },
            { icon: '👩‍🔧', label: 'کارشناس' },
            { icon: '🤖', label: 'مکاو' },
            { icon: '⚡', label: 'برق' },
            { icon: '🏎️', label: 'صنعتی' },
            { icon: '🚀', label: 'نوآور' },
            { icon: '👑', label: 'ارشد' }
        ];

        function refreshUserAvatarSettingsUI() {
            const user = AuthManager.getCurrentUser();
            if (!user) return;

            const previewBox = document.getElementById('currentUserAvatarPreview');
            const nameEl = document.getElementById('avatarUserDisplayName');
            const grid = document.getElementById('avatarPresetsGrid');

            if (nameEl) nameEl.innerText = user.name;
            if (previewBox) {
                const av = user.avatar;
                if (av && (av.startsWith('data:image') || av.startsWith('http'))) {
                    previewBox.innerHTML = `<img src="${av}" alt="" style="width:100%; height:100%; object-fit:cover;" />`;
                } else if (av) {
                    previewBox.innerHTML = `<span style="font-size:2.2rem;">${av}</span>`;
                } else {
                    previewBox.innerHTML = `<span style="font-size:2.2rem;">👨‍🔧</span>`;
                }
            }

            if (grid) {
                grid.innerHTML = '';
                PRESET_AVATARS.forEach(p => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'avatar-preset-btn' + (user.avatar === p.icon ? ' active' : '');
                    btn.innerText = p.icon;
                    btn.title = p.label;
                    btn.onclick = async () => {
                        await updateUserAvatar(p.icon);
                        refreshUserAvatarSettingsUI();
                        showToast(`کاراکتر ${p.label} به عنوان تصویر شما ذخیره شد.`);
                    };
                    grid.appendChild(btn);
                });
            }
        }

        async function updateUserAvatar(avatarValue) {
            let user = AuthManager.getCurrentUser();
            if (!user) return;
            user.avatar = avatarValue;
            localStorage.setItem('pm_currentUser', JSON.stringify(user));

            let u = AuthManager.usersList.find(x => isSameUser(x.id, user.id));
            if (u) {
                u.avatar = avatarValue;
                AuthManager.saveUsers();
            }
            checkLoginStatus();
        }

        refreshUserAvatarSettingsUI();

        const fileInput = document.getElementById('avatarFileInput');
        if (fileInput && !fileInput.dataset.bound) {
            fileInput.dataset.bound = "true";
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function(evt) {
                    const img = new Image();
                    img.onload = async function() {
                        const canvas = document.createElement('canvas');
                        canvas.width = 128;
                        canvas.height = 128;
                        const ctx = canvas.getContext('2d');
                        let minDim = Math.min(img.width, img.height);
                        let sx = (img.width - minDim) / 2;
                        let sy = (img.height - minDim) / 2;
                        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 128, 128);

                        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                        await updateUserAvatar(dataUrl);
                        refreshUserAvatarSettingsUI();
                        showToast('تصویر پروفایل شما با موفقیت ذخیره شد.');
                    };
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            });
        }

        const adminSec = document.getElementById('admin-settings-section');
        if (!adminSec) return;

        // تنظیم و بارگذاری آدرس‌های سرور محلی و آنلاین در پنل ادمین
        const serverLocalUrlInput = document.getElementById('serverLocalUrl');
        const serverOnlineUrlInput = document.getElementById('serverOnlineUrl');
        const btnSaveServerUrls = document.getElementById('btnSaveServerUrls');

        if (serverLocalUrlInput && typeof PouchAdapter !== 'undefined') {
            serverLocalUrlInput.value = PouchAdapter.getLocalUrl();
        }
        if (serverOnlineUrlInput && typeof PouchAdapter !== 'undefined') {
            serverOnlineUrlInput.value = PouchAdapter.getOnlineUrl();
        }

        if (btnSaveServerUrls && !btnSaveServerUrls.dataset.bound) {
            btnSaveServerUrls.dataset.bound = "true";
            btnSaveServerUrls.addEventListener('click', async () => {
                let localVal = serverLocalUrlInput.value.trim();
                let onlineVal = serverOnlineUrlInput.value.trim();
                if (!localVal) return showToast("آدرس سرور محلی نمی‌تواند خالی باشد.", "error");

                let newLocal = PouchAdapter.setLocalUrl(localVal);
                let newOnline = PouchAdapter.setOnlineUrl(onlineVal);
                serverLocalUrlInput.value = newLocal;
                serverOnlineUrlInput.value = newOnline;

                showToast("تنظیمات ذخیره شد. در حال اتصال هوشمند به سرور...");
                await PouchAdapter.checkConnection();
                await AuthManager.syncFromDB();
            });
        }

        // تنظیم و بارگذاری آدرس سرور اعلان‌ها
        const serverPushUrlInput = document.getElementById('serverPushUrl');
        const btnSavePushUrl = document.getElementById('btnSavePushUrl');
        if (serverPushUrlInput && typeof NotificationManager !== 'undefined') {
            serverPushUrlInput.value = NotificationManager.getServerUrl();
        }
        if (btnSavePushUrl && !btnSavePushUrl.dataset.bound) {
            btnSavePushUrl.dataset.bound = "true";
            btnSavePushUrl.addEventListener('click', () => {
                let val = serverPushUrlInput.value.trim();
                let saved = NotificationManager.setServerUrl(val);
                serverPushUrlInput.value = saved;
                showToast(saved ? "آدرس سرور اعلان‌ها ذخیره شد." : "آدرس سرور اعلان‌ها پاک شد.");
            });
        }

        // تنظیم و بارگذاری تنظیمات دیجی‌کالا
        const dkProjectSelect = document.getElementById('dkProjectSelect');
        const dkAssigneeSelect = document.getElementById('dkAssigneeSelect');
        const dkFinalizerSelect = document.getElementById('dkFinalizerSelect');
        const dkObserversContainer = document.getElementById('dkObserversContainer');
        const dkIsImportant = document.getElementById('dkIsImportant');
        const btnSaveDkSettings = document.getElementById('btnSaveDkSettings');

        async function initDigikalaSettingsUI() {
            if (!dkProjectSelect) return;
            const currentUsers = (typeof AuthManager !== 'undefined' && AuthManager.usersList) ? AuthManager.usersList : [];
            const allProjects = (typeof DBManager !== 'undefined') ? await DBManager.getProjects() : [];
            const currentSettings = (typeof DBManager !== 'undefined' && DBManager.getDigikalaSettings) ? await DBManager.getDigikalaSettings() : {};

            dkProjectSelect.innerHTML = '';
            allProjects.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p._id;
                opt.textContent = p.title;
                if (currentSettings.targetProjectId === p._id || (!currentSettings.targetProjectId && p.title.includes('فروش'))) {
                    opt.selected = true;
                }
                dkProjectSelect.appendChild(opt);
            });

            dkAssigneeSelect.innerHTML = '';
            dkFinalizerSelect.innerHTML = '';
            currentUsers.forEach(u => {
                const opt1 = document.createElement('option');
                opt1.value = u.id;
                opt1.textContent = `${u.name} (${u.id})`;
                if (String(currentSettings.assigneeId) === String(u.id)) opt1.selected = true;
                dkAssigneeSelect.appendChild(opt1);

                const opt2 = document.createElement('option');
                opt2.value = u.id;
                opt2.textContent = `${u.name} (${u.id})`;
                if (String(currentSettings.finalizerId) === String(u.id)) opt2.selected = true;
                dkFinalizerSelect.appendChild(opt2);
            });

            dkObserversContainer.innerHTML = '';
            const selectedObservers = Array.isArray(currentSettings.observers) ? currentSettings.observers.map(String) : ['100'];
            currentUsers.forEach(u => {
                const isChecked = selectedObservers.includes(String(u.id));
                const label = document.createElement('label');
                label.style.cssText = 'display: inline-flex; align-items: center; gap: 5px; font-size: 0.82rem; background: rgba(255,255,255,0.06); padding: 4px 8px; border-radius: 6px; cursor: pointer; color: var(--text-main);';
                label.innerHTML = `
                    <input type="checkbox" class="dk-observer-chk" value="${u.id}" ${isChecked ? 'checked' : ''} style="cursor: pointer;" />
                    <span>${u.name}</span>
                `;
                dkObserversContainer.appendChild(label);
            });

            if (dkIsImportant) {
                dkIsImportant.checked = currentSettings.isImportant !== false;
            }
        }
        window.initDigikalaSettingsUI = initDigikalaSettingsUI;
        initDigikalaSettingsUI();

        if (btnSaveDkSettings && !btnSaveDkSettings.dataset.bound) {
            btnSaveDkSettings.dataset.bound = "true";
            btnSaveDkSettings.addEventListener('click', async () => {
                const targetProjectId = dkProjectSelect ? dkProjectSelect.value : '';
                const targetProjectTitle = dkProjectSelect && dkProjectSelect.selectedOptions[0] ? dkProjectSelect.selectedOptions[0].textContent : 'فروش';
                const assigneeId = dkAssigneeSelect ? dkAssigneeSelect.value : '100';
                const finalizerId = dkFinalizerSelect ? dkFinalizerSelect.value : '100';
                const isImportant = dkIsImportant ? dkIsImportant.checked : true;

                const observerCheckboxes = dkObserversContainer ? dkObserversContainer.querySelectorAll('.dk-observer-chk:checked') : [];
                const observers = Array.from(observerCheckboxes).map(c => c.value);

                const data = {
                    targetProjectId,
                    targetProjectTitle,
                    assigneeId,
                    finalizerId,
                    observers,
                    isImportant,
                    tag: 'فروش / دیجی‌کالا'
                };

                if (typeof DBManager !== 'undefined' && DBManager.saveDigikalaSettings) {
                    await DBManager.saveDigikalaSettings(data);
                } else {
                    localStorage.setItem('pm_digikala_settings', JSON.stringify(data));
                }

                showToast('تنظیمات دیجی‌کالا با موفقیت ذخیره شد.');
            });
        }

        // تنظیم و ذخیره اطلاعات درباره ما در پنل ادمین
        const adminAboutTitle = document.getElementById('adminAboutTitle');
        const adminAboutSite = document.getElementById('adminAboutSite');
        const adminAboutDesc = document.getElementById('adminAboutDesc');
        const adminAboutPhone = document.getElementById('adminAboutPhone');
        const adminAboutSocial = document.getElementById('adminAboutSocial');
        const btnSaveAdminAbout = document.getElementById('btnSaveAdminAbout');

        async function loadAdminAboutFields() {
            let info = (typeof DBManager !== 'undefined' && DBManager.getAboutInfo) 
                ? await DBManager.getAboutInfo() 
                : {
                    title: 'مدیریت کارگاه مکاو',
                    site: 'https://mechave.ir',
                    desc: 'سامانه هوشمند مدیریت پروژه، فرآیندهای تولید، ارجاع وظایف و کنترل کیفیت کارگاه مکاو.',
                    phone: '',
                    social: '@mechave'
                };

            if (adminAboutTitle) adminAboutTitle.value = info.title || '';
            if (adminAboutSite) adminAboutSite.value = info.site || 'https://mechave.ir';
            if (adminAboutDesc) adminAboutDesc.value = info.desc || '';
            if (adminAboutPhone) adminAboutPhone.value = info.phone || '';
            if (adminAboutSocial) adminAboutSocial.value = info.social || '@mechave';
        }
        loadAdminAboutFields();

        if (btnSaveAdminAbout && !btnSaveAdminAbout.dataset.bound) {
            btnSaveAdminAbout.dataset.bound = "true";
            btnSaveAdminAbout.addEventListener('click', async () => {
                const title = adminAboutTitle ? adminAboutTitle.value.trim() : '';
                const site = adminAboutSite ? adminAboutSite.value.trim() : 'https://mechave.ir';
                const desc = adminAboutDesc ? adminAboutDesc.value.trim() : '';
                const phone = adminAboutPhone ? adminAboutPhone.value.trim() : '';
                const social = adminAboutSocial ? adminAboutSocial.value.trim() : '';

                const data = { title, site, desc, phone, social };
                if (typeof DBManager !== 'undefined' && DBManager.saveAboutInfo) {
                    await DBManager.saveAboutInfo(data);
                } else {
                    localStorage.setItem('pm_about_info', JSON.stringify(data));
                }

                showToast('اطلاعات درباره ما با موفقیت در دیتابیس سرور ذخیره شد.');
            });
        }

        if (document.getElementById('mecavManualBackupPanel')) return;

        const backupWrapper = document.createElement('div');
        backupWrapper.id = 'mecavManualBackupPanel';
        backupWrapper.innerHTML = `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 16px; margin-bottom: 16px; box-shadow: var(--shadow);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
                    <span style="color: var(--primary); font-weight: bold; font-size: 0.95rem;">💾 خروجی و ادغام فایل پشتیبان (JSON)</span>
                    <span id="backupStats" style="font-size: 0.8rem; color: var(--text-muted);">در حال محاسبه...</span>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="btnManualExportFile" class="btn btn-primary" style="flex: 1; border-radius: 12px; padding: 12px;">📤 دانلود فایل بک‌آپ</button>
                    <button id="btnManualImportFile" class="btn btn-success" style="flex: 1; border-radius: 12px; padding: 12px;">📥 ادغام فایل بک‌آپ</button>
                    <input type="file" id="inputManualRestoreFile" accept=".json" style="display: none;" />
                </div>
            </div>
        `;
        adminSec.appendChild(backupWrapper);

        document.getElementById('btnManualExportFile').addEventListener('click', async () => {
            try {
                const payload = await BackupManager.buildBackupPayload();
                const dataStr = JSON.stringify(payload, null, 2);
                const blob = new Blob([dataStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `MechaveWS_Backup_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.json`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                showToast('✅ فایل بک‌آپ دانلود شد.');
            } catch (e) { showToast('خطا در ساخت فایل بک‌آپ!', 'error'); }
        });

        const fileInp = document.getElementById('inputManualRestoreFile');
        document.getElementById('btnManualImportFile').addEventListener('click', () => fileInp.click());
        fileInp.addEventListener('change', async (e) => {
            let file = e.target.files[0];
            if (!file) return;
            let isConfirmed = await showCustomModal({ title: 'ادغام فایل', message: 'آیا از دریافت و ادغام این فایل بک‌آپ مطمئن هستید؟', type: 'confirm' });
            if (!isConfirmed) { fileInp.value = ''; return; }
            let reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    let parsed = JSON.parse(ev.target.result);
                    await BackupManager.applyRestoreData(parsed);
                    updateBackupStatsText();
                } catch (err) { showToast('خطا در خواندن فایل بک‌آپ!', 'error'); }
                fileInp.value = '';
            };
            reader.readAsText(file);
        });

        updateBackupStatsText();
    }

    async function updateBackupStatsText() {
        const statEl = document.getElementById('backupStats');
        if (!statEl) return;
        try {
            const payload = await BackupManager.buildBackupPayload();
            const kb = (new Blob([JSON.stringify(payload)]).size / 1024).toFixed(1);
            statEl.innerText = `${payload.totalItems} رکورد (${kb} KB)`;
        } catch (e) {}
    }

    window.reloadTagsInDropdown = async function(user) {
        let tags = await DBManager.getTags(user.id);
        let tagData = tags.map(t => ({ text: t.title, value: t.title, rawId: t._id, canDelete: (t.creatorId === user.id || user.role === 'admin') }));
        tagData.unshift({ text: '➕ تعریف تگ جدید...', value: 'ADD_NEW_TAG', canDelete: false });
        setupCustomSelect('taskTagSelectWrapper', tagData, 'تگ (اختیاری)...', async (tagId) => {
            await DBManager.deleteTag(tagId); showToast('تگ حذف شد.'); window.reloadTagsInDropdown(user);
        }, user);
    };

    window.reloadProjectsInDropdown = async function(user) {
        let projects = await DBManager.getProjects(user.id);
        let isAdmin = user && (user.role === 'admin' || isSameUser(user.id, '100'));
        let projData = projects.filter(p => !p.isArchived).map(p => ({ 
            text: p.title, 
            value: p._id, 
            rawId: p._id, 
            canDelete: (isAdmin || isSameUser(p.creatorId, user.id)) 
        }));
        projData.unshift({ text: '➕ تعریف پروژه جدید...', value: 'ADD_NEW_PROJECT', canDelete: false });
        setupCustomSelect('taskProjectSelectWrapper', projData, 'پروژه مرتبط...', async (projId) => {
            let isConfirmed = await showCustomModal({ title: 'حذف پروژه', message: 'هشدار: با حذف این پروژه، تمام تسک‌های داخل آن نیز از داشبورد مخفی می‌شوند. ادامه می‌دهید؟', type: 'confirm' });
            if(isConfirmed) { await DBManager.deleteProject(projId); showToast('پروژه حذف شد.'); window.reloadProjectsInDropdown(user); renderDashboard(); }
        }, user);
    };

    window.handleAddNewProject = async function(user) {
        let res = await showCustomModal({ title: '➕ ثبت پروژه جدید', type: user.role === 'admin' ? 'complex' : 'prompt', placeholder: 'عنوان پروژه را وارد کنید...', checkboxLabel: '🌍 این پروژه برای همه پرسنل (عمومی) باشد؟', okText: 'ثبت پروژه' });
        if(!res) return;
        let title = typeof res === 'string' ? res : res.value;
        if(!title || !title.trim()) return;
        let isGlobal = typeof res === 'object' ? res.checked : false;

        await DBManager.saveProject(title.trim(), user.id, isGlobal);
        await window.reloadProjectsInDropdown(user);
        
        setTimeout(() => {
            const wrapper = document.getElementById('taskProjectSelectWrapper');
            if (wrapper) {
                const options = wrapper.querySelectorAll('.custom-option');
                for (let opt of options) {
                    if (opt.innerText.includes(title.trim())) { opt.click(); break; }
                }
            }
        }, 200);
        showToast('پروژه اضافه شد.');
    };

    window.handleAddNewTag = async function(user) {
        let res = await showCustomModal({ title: '🏷️ ثبت تگ جدید', type: user.role === 'admin' ? 'complex' : 'prompt', placeholder: 'عنوان تگ را وارد کنید...', checkboxLabel: '🌍 این تگ برای همه پرسنل (عمومی) باشد؟', okText: 'ثبت تگ' });
        if(!res) return;
        let title = typeof res === 'string' ? res : res.value;
        if(!title || !title.trim()) return;
        let isGlobal = typeof res === 'object' ? res.checked : false;

        await DBManager.saveTag(title.trim(), user.id, isGlobal);
        await window.reloadTagsInDropdown(user);
        
        setTimeout(() => {
            const wrapper = document.getElementById('taskTagSelectWrapper');
            if (wrapper) {
                const options = wrapper.querySelectorAll('.custom-option');
                for (let opt of options) {
                    if (opt.innerText.includes(title.trim())) { opt.click(); break; }
                }
            }
        }, 200);
        showToast('تگ اضافه شد.');
    };

    function syncElectronTitlebarTheme() {
        if (window.electronAPI && typeof window.electronAPI.updateTitleBarOverlay === 'function') {
            const isDark = document.body.getAttribute('data-theme') !== 'light';
            const bgCard = getComputedStyle(document.body).getPropertyValue('--bg-card').trim() || (isDark ? '#131b2e' : '#ffffff');
            const textMuted = isDark ? '#94a3b8' : '#64748b';
            window.electronAPI.updateTitleBarOverlay(bgCard, textMuted);
        }
    }

    if (window.electronAPI && window.electronAPI.isElectron) {
        document.body.classList.add('is-electron');
        setTimeout(syncElectronTitlebarTheme, 200);

        if (typeof window.electronAPI.onOpenTask === 'function') {
            window.electronAPI.onOpenTask((taskId) => {
                if (taskId && typeof window.openTaskById === 'function') {
                    window.openTaskById(taskId);
                }
            });
        }
    }

    function checkUrlTaskHash() {
        try {
            if (window.location.hash && window.location.hash.includes('task=')) {
                const parts = window.location.hash.split('task=');
                if (parts[1]) {
                    const taskId = parts[1].split('&')[0];
                    if (taskId && typeof window.openTaskById === 'function') {
                        setTimeout(() => window.openTaskById(taskId), 350);
                    }
                }
            }
        } catch (e) {}
    }
    window.addEventListener('hashchange', checkUrlTaskHash);

    const btnThemeToggle = document.getElementById('btnThemeToggle');
    let currentTheme = localStorage.getItem('pm_theme') || 'dark';
    document.body.setAttribute('data-theme', currentTheme);
    if(btnThemeToggle) {
        btnThemeToggle.innerText = currentTheme === 'dark' ? '☀️' : '🌙';
        btnThemeToggle.addEventListener('click', () => {
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', currentTheme);
            localStorage.setItem('pm_theme', currentTheme);
            btnThemeToggle.innerText = currentTheme === 'dark' ? '☀️' : '🌙';
            syncElectronTitlebarTheme();
        });
    }

    // ==========================================
    // سیستم انتخاب پالت رنگی چندگانه (Palette Switcher)
    // ==========================================
    let currentPalette = localStorage.getItem('pm_theme_palette') || 'ocean';
    document.body.setAttribute('data-palette', currentPalette);

    function applyPalette(palId) {
        currentPalette = palId;
        document.body.setAttribute('data-palette', palId);
        localStorage.setItem('pm_theme_palette', palId);
        
        // بروزرسانی دکمه‌های هدر
        document.querySelectorAll('.palette-color-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.palette === palId);
        });

        // بروزرسانی دکمه‌های صفحه تنظیمات
        document.querySelectorAll('.palette-setting-btn').forEach(btn => {
            if (btn.dataset.palette === palId) {
                btn.style.borderColor = 'var(--primary)';
                btn.style.background = 'var(--bg-input)';
                btn.style.fontWeight = 'bold';
            } else {
                btn.style.borderColor = 'var(--border-color)';
                btn.style.background = 'transparent';
                btn.style.fontWeight = 'normal';
            }
        });

        syncElectronTitlebarTheme();
    }

    applyPalette(currentPalette);

    // دکمه باز/بسته کردن منوی کشویی پالت در هدر
    const btnPaletteToggle = document.getElementById('btnPaletteToggle');
    const paletteDropdown = document.getElementById('paletteDropdown');
    if (btnPaletteToggle && paletteDropdown) {
        btnPaletteToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = paletteDropdown.style.display === 'block';
            paletteDropdown.style.display = isOpen ? 'none' : 'block';
        });

        document.addEventListener('click', (e) => {
            if (!paletteDropdown.contains(e.target) && e.target !== btnPaletteToggle) {
                paletteDropdown.style.display = 'none';
            }
        });
    }

    // رویداد کلیک روی دکمه‌های پالت در هدر
    document.querySelectorAll('.palette-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pal = btn.dataset.palette;
            if (pal) applyPalette(pal);
            if (paletteDropdown) paletteDropdown.style.display = 'none';
        });
    });

    // رویداد کلیک روی دکمه‌های پالت در تنظیمات
    document.querySelectorAll('.palette-setting-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pal = btn.dataset.palette;
            if (pal) applyPalette(pal);
        });
    });

    const imageViewer = document.getElementById('imageViewer');
    const viewerImage = document.getElementById('viewerImage');
    if(document.getElementById('btnCloseViewer')) {
        document.getElementById('btnCloseViewer').onclick = () => imageViewer.classList.remove('active');
    }
    window.openImage = (src) => { 
        if (typeof NavigationBackManager !== 'undefined') {
            NavigationBackManager.pushNavState('imageViewer');
        }
        viewerImage.src = src; 
        imageViewer.classList.add('active'); 
    };

    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const btnLogin = document.getElementById('btnLogin');
    const fabAdd = document.getElementById('fabAdd');
    let currentOpenedTask = null;
    let pendingReportImage = null;
    let pendingCommentImage = null;

    setupSettingsUI();
    if (typeof AutoLockManager !== 'undefined') {
        AutoLockManager.init();
    }

    function checkLoginStatus() {
        let user = AuthManager.getCurrentUser();
        [loginView, dashboardView, document.getElementById('settings-view'), document.getElementById('headerActions'), document.getElementById('admin-settings-section'), fabAdd].forEach(el => {
            if(el) el.style.display = 'none';
        });
        if (user) {
            dashboardView.style.display = 'block'; document.getElementById('headerActions').style.display = 'flex';
            try {
                const avatarHtml = (typeof getUserAvatarHtml === 'function') ? getUserAvatarHtml(user.id, 24) : '';
                document.getElementById('welcomeName').innerHTML = `${avatarHtml} <span>${user.name || ''}</span>`;
            } catch (err) {
                document.getElementById('welcomeName').innerText = (user && user.name) ? user.name : '';
            }
            fabAdd.style.display = 'flex';
            if (typeof NotificationManager !== 'undefined') {
                try {
                    NotificationManager.startListening(user.id);
                    NotificationManager.initInAppNotifs();
                    NotificationManager.requestSystemPermission();
                } catch (e) {}
            }
            const banner = document.getElementById('notif-permission-banner');
            const isDismissed = localStorage.getItem('pm_dismiss_notif_banner') === 'true';
            if (banner) {
                if (isDismissed) {
                    banner.style.display = 'none';
                } else if (!window.isSecureContext && window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                    banner.style.display = 'flex';
                    const txt = document.getElementById('notifBannerText');
                    if (txt) {
                        txt.innerHTML = `<b>اعلان در ویندوز:</b> مرورگر کروم نوتیفیکیشن را روی آدرس IP مسدود می‌کند. در این کامپیوتر به جای آی‌پی، آدرس <a href="http://localhost:8000" style="color:var(--primary); font-weight:bold; text-decoration:underline;">http://localhost:8000</a> را باز کنید تا اعلان‌ها فعال شوند.`;
                    }
                } else {
                    banner.style.display = ("Notification" in window && Notification.permission !== "granted") ? 'flex' : 'none';
                }
            }
            if(user.role === 'admin') { 
                document.getElementById('admin-settings-section').style.display = 'block'; 
                try { renderAdminUserList(); } catch (e) {}
            }
            try {
                renderDashboard();
                setTimeout(checkUrlTaskHash, 400);
            } catch (e) {
                console.error("خطا در بارگذاری داشبورد:", e);
            }
        } else { 
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.stopListening();
            }
            loginView.style.display = 'block'; 
            if (typeof AutoLockManager !== 'undefined') {
                AutoLockManager.applyLockedUI();
            }
        }
        setTimeout(hideAppSplash, 350);
    }
    window.checkLoginStatus = checkLoginStatus;

    function hideAppSplash() {
        const splash = document.getElementById('app-splash-overlay');
        if (splash && splash.style.display !== 'none' && !splash.dataset.hidden) {
            splash.dataset.hidden = 'true';
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
            }, 450);
        }
    }
    window.hideAppSplash = hideAppSplash;
    setTimeout(hideAppSplash, 1500);

    checkLoginStatus();

    // شنود رخداد آماده بودن Cordova در اپلیکیشن اندروید جهت درخواست مجوز
    document.addEventListener('deviceready', () => {
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.requestSystemPermission();
        }
    }, false);

    // دکمه پاک کردن اعلان‌های جدید
    const btnClearRecentNotifs = document.getElementById('btnClearRecentNotifs');
    if (btnClearRecentNotifs && !btnClearRecentNotifs.dataset.bound) {
        btnClearRecentNotifs.dataset.bound = "true";
        btnClearRecentNotifs.addEventListener('click', () => {
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.clearAllInAppNotifications();
            }
        });
    }

    const btnDismissNotifBanner = document.getElementById('btnDismissNotifBanner');
    if (btnDismissNotifBanner && !btnDismissNotifBanner.dataset.bound) {
        btnDismissNotifBanner.dataset.bound = "true";
        btnDismissNotifBanner.addEventListener('click', () => {
            const banner = document.getElementById('notif-permission-banner');
            if (banner) banner.style.display = 'none';
            localStorage.setItem('pm_dismiss_notif_banner', 'true');
        });
    }

    const btnBannerEnableNotif = document.getElementById('btnBannerEnableNotif');
    if (btnBannerEnableNotif && !btnBannerEnableNotif.dataset.bound) {
        btnBannerEnableNotif.dataset.bound = "true";
        btnBannerEnableNotif.addEventListener('click', async () => {
            if (!window.isSecureContext && window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                showToast('در مرورگر کروم، اعلان فقط روی http://localhost:8000 یا HTTPS کار می‌کند.', 'warning');
                return;
            }
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.requestSystemPermission(() => {
                    const banner = document.getElementById('notif-permission-banner');
                    if (banner) banner.style.display = 'none';
                    NotificationManager.showLocalSystemNotification(
                        '✅ اعلان‌های مکاو فعال شد',
                        'صدای زنگ و اعلان‌های سیستمی روی این دستگاه فعال شدند.'
                    );
                    showToast('اعلان‌ها با موفقیت فعال شدند.');
                });
            }
        });
    }

    let searchInputEl = document.getElementById('dashboardSearchInput');
    if (searchInputEl) searchInputEl.addEventListener('input', () => renderDashboard());

    // تب‌های فیلتر سریع داشبورد
    document.querySelectorAll('.filter-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            window.currentDashboardTab = btn.dataset.filter;
            renderDashboard();
        });
    });

    document.addEventListener('keydown', (e) => { if(e.key === 'Enter' && loginView.style.display !== 'none') btnLogin.click(); });

    btnLogin.addEventListener('click', async () => {
        let pCode = document.getElementById('personnelCodeInput').value.trim();
        let nCode = document.getElementById('nationalCodeInput').value.trim();
        if(!pCode || !nCode) return showToast("لطفا فیلدها را پر کنید.", "error");

        // نمایش وضعیت در دکمه برای جلوگیری از کلیک مجدد
        const btnEl = document.getElementById('btnLogin');
        const originalText = btnEl.innerText;
        btnEl.disabled = true;
        btnEl.innerText = '⏳ در حال دریافت اطلاعات...';

        try {
            // اگر دیتابیس محلی خالی است، صبر می‌کنیم تا سینک از سرور کامل شود
            await AuthManager.syncFromDBWithWait();
            AuthManager.login(pCode, nCode);
            if (typeof AutoLockManager !== 'undefined') {
                AutoLockManager.unlock();
            }
            document.getElementById('personnelCodeInput').value = '';
            document.getElementById('nationalCodeInput').value = '';
            showToast("با موفقیت وارد شدید.");
            checkLoginStatus();

            // درخواست مجوز اعلان برای اندروید، آیفون و ویندوز بلافاصله بعد از لاگین
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.requestSystemPermission(() => {
                    const banner = document.getElementById('notif-permission-banner');
                    if (banner) banner.style.display = 'none';
                });
            }
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            btnEl.disabled = false;
            btnEl.innerText = originalText;
        }
    });
    
    document.getElementById('btnLogout').addEventListener('click', () => { AuthManager.logout(); checkLoginStatus(); });

    const btnLockApp = document.getElementById('btnLockApp');
    if (btnLockApp && !btnLockApp.dataset.bound) {
        btnLockApp.dataset.bound = "true";
        btnLockApp.addEventListener('click', () => {
            if (typeof AutoLockManager !== 'undefined') {
                AutoLockManager.lock(true);
            }
        });
    }

    const btnDashboardAddProj = document.getElementById('btnDashboardAddProject');
    if (btnDashboardAddProj && !btnDashboardAddProj.dataset.bound) {
        btnDashboardAddProj.dataset.bound = "true";
        btnDashboardAddProj.addEventListener('click', () => {
            const curUser = AuthManager.getCurrentUser();
            if (window.handleAddNewProject) {
                window.handleAddNewProject(curUser);
            }
        });
    }
    
    const btnSwitchUser = document.getElementById('btnSwitchUser');
    if (btnSwitchUser && !btnSwitchUser.dataset.bound) {
        btnSwitchUser.dataset.bound = "true";
        btnSwitchUser.addEventListener('click', () => {
            if (typeof AutoLockManager !== 'undefined') {
                AutoLockManager.clearLockedUser();
            }
        });
    }

    // ==========================================
    // پنجره درباره کارگاه مکاو (About Modal)
    // ==========================================
    window.openAboutModal = async function() {
        const modal = document.getElementById('aboutModal');
        if (!modal) return;
        
        let aboutInfo = (typeof DBManager !== 'undefined' && DBManager.getAboutInfo) 
            ? await DBManager.getAboutInfo()
            : {
                title: 'مدیریت کارگاه مکاو',
                site: 'https://mechave.ir',
                desc: 'سامانه هوشمند مدیریت پروژه، فرآیندهای تولید، ارجاع وظایف و کنترل کیفیت کارگاه مکاو.',
                phone: '',
                social: '@mechave'
            };

        const titleEl = document.getElementById('aboutModalTitle');
        const descEl = document.getElementById('aboutModalDesc');
        const verEl = document.getElementById('aboutModalVersion');
        const phoneEl = document.getElementById('aboutModalPhone');
        const socialEl = document.getElementById('aboutModalSocial');
        const phoneRow = document.getElementById('aboutPhoneRow');
        const socialRow = document.getElementById('aboutSocialRow');

        if (titleEl) titleEl.innerText = aboutInfo.title || 'مدیریت کارگاه مکاو';
        if (descEl) descEl.innerText = aboutInfo.desc || 'سامانه هوشمند مدیریت کارگاه مکاو';
        if (verEl && typeof VersionManager !== 'undefined') verEl.innerText = VersionManager.CURRENT_VERSION;
        if (phoneEl) phoneEl.innerText = aboutInfo.phone || '—';
        if (socialEl) socialEl.innerText = aboutInfo.social || '@mechave';
        if (phoneRow) phoneRow.style.display = aboutInfo.phone ? 'flex' : 'none';
        if (socialRow) socialRow.style.display = aboutInfo.social ? 'flex' : 'none';

        if (typeof NavigationBackManager !== 'undefined') {
            NavigationBackManager.pushNavState('about');
        }

        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
    };

    window.closeAboutModal = function() {
        const modal = document.getElementById('aboutModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                if (!modal.classList.contains('active')) modal.style.display = 'none';
            }, 250);
        }
    };

    // شنود کلیک روی تمام لوگوهای برنامه برای باز شدن About
    document.addEventListener('click', (e) => {
        const logoTarget = e.target.closest('#appHeaderBrand, .app-header-logo, #header-title, #mecavLoginLogo, .electron-titlebar-brand, .electron-titlebar-icon, .electron-titlebar-text');
        if (logoTarget) {
            e.preventDefault();
            e.stopPropagation();
            window.openAboutModal();
        }
    });

    // اتصال مستقیم به المان‌های لوگو در صورت لود زودهنگام
    const bindDirectLogoClick = () => {
        ['appHeaderBrand', 'header-title', 'mecavLoginLogo'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.dataset.aboutBound) {
                el.dataset.aboutBound = 'true';
                el.style.cursor = 'pointer';
                el.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    window.openAboutModal();
                });
            }
        });
        document.querySelectorAll('.electron-titlebar-brand, .app-header-logo').forEach(el => {
            if (el && !el.dataset.aboutBound) {
                el.dataset.aboutBound = 'true';
                el.style.cursor = 'pointer';
                el.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    window.openAboutModal();
                });
            }
        });
    };
    bindDirectLogoClick();
    setTimeout(bindDirectLogoClick, 500);

    const btnCloseAboutModal = document.getElementById('btnCloseAboutModal');
    if (btnCloseAboutModal) {
        btnCloseAboutModal.onclick = () => window.closeAboutModal();
    }

    const aboutModalEl = document.getElementById('aboutModal');
    if (aboutModalEl) {
        aboutModalEl.onclick = (e) => {
            if (e.target === aboutModalEl) window.closeAboutModal();
        };
    }

    const aboutSiteLink = document.getElementById('aboutModalSiteLink');
    if (aboutSiteLink && !aboutSiteLink.dataset.bound) {
        aboutSiteLink.dataset.bound = "true";
        aboutSiteLink.addEventListener('click', (e) => {
            e.preventDefault();
            const url = 'https://mechave.ir';
            if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
                window.electronAPI.openExternal(url);
            } else if (window.cordova) {
                window.open(url, '_system');
            } else {
                window.open(url, '_blank');
            }
        });
    }
    
    const btnSettingsEl = document.getElementById('btnSettings');
    if(btnSettingsEl) {
        btnSettingsEl.addEventListener('click', () => { 
            if (typeof NavigationBackManager !== 'undefined') {
                NavigationBackManager.pushNavState('settings');
            }
            dashboardView.style.display = 'none'; 
            document.getElementById('settings-view').style.display = 'block'; 
            updateBackupStatsText();
            if (window.initDigikalaSettingsUI) window.initDigikalaSettingsUI();
        });
    }

    const btnBackToDashEl = document.getElementById('btnBackToDashboard');
    if(btnBackToDashEl) {
        btnBackToDashEl.addEventListener('click', () => { 
            document.getElementById('settings-view').style.display = 'none'; 
            dashboardView.style.display = 'block'; 
            renderDashboard(); 
        });
    }

    const btnAddUserEl = document.getElementById('btnAddUser');
    if(btnAddUserEl) {
        btnAddUserEl.addEventListener('click', () => {
            let name = document.getElementById('newUserName').value.trim(), 
                code = document.getElementById('newUserCode').value.trim(), 
                nat = document.getElementById('newUserNatCode').value.trim();
            if(!name || !code || !nat) return showToast("اطلاعات پرسنل ناقص است", "error");
            try {
                AuthManager.addUser(code, name, nat, 'user', false);
                showToast("کاربر ثبت و با سرور همگام‌سازی شد."); 
                renderAdminUserList();
                document.getElementById('newUserName').value = ''; 
                document.getElementById('newUserCode').value = ''; 
                document.getElementById('newUserNatCode').value = '';
            } catch (e) { showToast(e.message, "error"); }
        });
    }

    const btnChangeMyPassEl = document.getElementById('btnChangeMyPass');
    if(btnChangeMyPassEl) {
        btnChangeMyPassEl.addEventListener('click', async () => {
            let oldPassEl = document.getElementById('myOldPassword');
            let oldPass = oldPassEl ? oldPassEl.value.trim() : '';
            let newPass = document.getElementById('myNewPassword').value.trim();
            
            if(oldPassEl && !oldPass) return showToast("لطفاً رمز عبور فعلی خود را وارد کنید.", "error");
            if(!newPass) return showToast("لطفاً رمز عبور جدید را وارد کنید.", "error");
            
            try {
                AuthManager.changePassword(AuthManager.getCurrentUser().id, newPass, oldPassEl ? oldPass : null);
                if(oldPassEl) oldPassEl.value = '';
                document.getElementById('myNewPassword').value = ''; 
                showToast("رمز عبور با موفقیت تغییر کرد.");
            } catch (error) {
                showToast(error.message, "error");
            }
        });
    }

    function renderAdminUserList() {
        const container = document.getElementById('admin-users-list-container');
        if(!container) return;
        container.innerHTML = AuthManager.usersList.map(u => 
            `<div style="display:flex; justify-content:space-between; align-items:center; padding: 10px; border-bottom: 1px solid var(--border-color); flex-wrap:wrap; gap:8px;">
                <div>
                    👤 <b>${u.name}</b> (کد: <code>${u.id}</code>)
                    ${u.role === 'admin' 
                        ? `<span style="font-size:0.75rem; background:rgba(56,189,248,0.15); color:var(--primary); padding:2px 8px; border-radius:6px; margin-right:6px; border:1px solid rgba(56,189,248,0.3);">مدیر ارشد</span>` 
                        : (u.canAssignTasks 
                            ? `<span style="font-size:0.75rem; background:rgba(16,185,129,0.15); color:var(--success); padding:2px 8px; border-radius:6px; margin-right:6px; border:1px solid rgba(16,185,129,0.3);">⚡ مجاز به ارجاع</span>` 
                            : `<span style="font-size:0.75rem; background:rgba(255,255,255,0.05); color:var(--text-muted); padding:2px 8px; border-radius:6px; margin-right:6px; border:1px solid var(--border-color);">پرسنل عادی</span>`
                          )
                    }
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                    ${u.role !== 'admin' ? `
                        <button class="btn btn-small ${u.canAssignTasks ? 'btn-success' : 'btn-secondary'}" onclick="window.adminTogglePermission('${u.id}')" title="تغییر دسترسی تعیین مسئول تسک">
                            ${u.canAssignTasks ? '✓ ارجاع: فعال' : '+ اجازه ارجاع'}
                        </button>
                    ` : ''}
                    <button class="btn btn-small btn-secondary" onclick="window.adminEditName('${u.id}')">✏️ ویرایش نام</button>
                    <button class="btn btn-small btn-secondary" onclick="window.adminChangePass('${u.id}')">🔑 تغییر رمز</button>
                    ${u.role !== 'admin' ? `<button class="btn btn-small btn-secondary" style="background:var(--danger); color:white; border:none;" onclick="window.adminDeleteUser('${u.id}')">🗑️ حذف</button>` : ''}
                </div>
            </div>`
        ).join('');
    }
    window.adminTogglePermission = function(id) {
        let user = AuthManager.usersList.find(u => u.id === id);
        if(!user || user.role === 'admin') return;
        let newStatus = !user.canAssignTasks;
        AuthManager.updateUserPermission(id, newStatus);
        renderAdminUserList();
        renderDashboard();
        showToast(newStatus ? `دسترسی ارجاع تسک به «${user.name}» داده شد.` : `دسترسی ارجاع تسک از «${user.name}» برداشته شد.`);
    };
    window.adminEditName = async (id) => {
        let user = AuthManager.usersList.find(u => u.id === id);
        if(!user) return;
        let newName = await showCustomModal({ 
            title: 'ویرایش نام پرسنل', 
            type: 'prompt', 
            placeholder: user.name, 
            okText: 'ذخیره' 
        });
        if(newName && newName.trim() !== '' && newName.trim() !== user.name) {
            try {
                AuthManager.updateUserName(id, newName.trim());
                renderAdminUserList();
                renderDashboard();
                let cur = AuthManager.getCurrentUser();
                if (cur && (cur.id === id || (id === '100' && cur.id === 'admin'))) {
                    let welcomeEl = document.getElementById('welcomeName');
                    if (welcomeEl) welcomeEl.innerText = newName.trim();
                }
                showToast("نام با موفقیت ویرایش شد.");
            } catch (err) {
                showToast(err.message, "error");
            }
        }
    };
    window.adminChangePass = async (id) => {
        let newPass = await showCustomModal({ title: 'تغییر رمز عبور', type: 'prompt', placeholder: 'رمز عبور جدید را وارد کنید...' });
        if(newPass && newPass.trim() !== '') { 
            AuthManager.changePassword(id, newPass.trim()); 
            showToast("رمز کاربر تغییر کرد."); 
        }
    };
    window.adminDeleteUser = async (id) => {
        let isConfirmed = await showCustomModal({ title: 'حذف کاربر', message: 'آیا از حذف این کاربر مطمئن هستید؟', type: 'confirm' });
        if(isConfirmed) {
            AuthManager.usersList = AuthManager.usersList.filter(u => u.id !== id);
            AuthManager.saveUsers(); renderAdminUserList(); showToast("کاربر حذف شد.");
        }
    };

    window.quickAddTask = function(projId, projTitle) {
        window.preselectedProjectId = projId;
        window.preselectedProjectTitle = projTitle;
        fabAdd.click();
    };

    fabAdd.addEventListener('click', async () => {
        if (typeof NavigationBackManager !== 'undefined') {
            NavigationBackManager.pushNavState('addModal');
        }
        document.getElementById('addModal').classList.add('active');
        let user = AuthManager.getCurrentUser();
        let hasPower = user.role === 'admin' || Boolean(user.canAssignTasks);
        
        if (hasPower) {
            document.getElementById('advancedTaskOptions').style.display = 'block';
            let usersData = AuthManager.usersList.map(u => ({ text: u.name, value: u.id }));
            setupCustomSelect('taskAssigneeSelectWrapper', usersData, 'مسئول انجام...');
            setupCustomSelect('taskFinalizerSelectWrapper', usersData, 'مسئول نهایی...');
        } else { 
            let adv = document.getElementById('advancedTaskOptions');
            if (adv) adv.style.display = 'none'; 
        }
        
        let extraTaskBox = document.getElementById('generalTaskObserversBox');
        if (!extraTaskBox) {
            extraTaskBox = document.createElement('div');
            extraTaskBox.id = 'generalTaskObserversBox';
            extraTaskBox.style.cssText = 'margin-top: 15px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);';
            extraTaskBox.innerHTML = `
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #38bdf8; font-size: 0.85rem; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <input type="checkbox" id="chkPublicTask" style="width: 16px; height: 16px; accent-color: #38bdf8; margin: 0;" />
                    <span>🌍 عمومی (همه پرسنل ببینند و نظر بدهند)</span>
                </label>
                <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 6px;">اشتراک با افراد خاص (جهت مشاهده و نظر):</div>
                <div id="observersMultiSelectWrapper" class="multi-select-wrapper"></div>
            `;
            const btnSaveTaskEl = document.getElementById('btnSaveTask');
            if (btnSaveTaskEl) btnSaveTaskEl.parentNode.insertBefore(extraTaskBox, btnSaveTaskEl);
        }
        
        const observerData = AuthManager.usersList.filter(u => u.id !== user.id).map(u => ({ text: `${u.name} (${u.id})`, value: u.id }));
        setupMultiSelectWithSearch('observersMultiSelectWrapper', observerData, 'هیچ فردی انتخاب نشده...');
        
        await window.reloadProjectsInDropdown(user);
        await window.reloadTagsInDropdown(user);

        if (window.preselectedProjectId) {
            const wrapper = document.getElementById('taskProjectSelectWrapper');
            if(wrapper) {
                wrapper.dataset.value = window.preselectedProjectId;
                wrapper.querySelector('.select-text').innerText = window.preselectedProjectTitle;
            }
            window.preselectedProjectId = null;
            window.preselectedProjectTitle = null;
        }
    });

    document.getElementById('btnCloseModal').addEventListener('click', () => document.getElementById('addModal').classList.remove('active'));

    document.getElementById('btnSaveTask').addEventListener('click', async () => {
        let user = AuthManager.getCurrentUser();
        let hasPower = user.role === 'admin' || Boolean(user.canAssignTasks);
        
        let projectId = document.getElementById('taskProjectSelectWrapper').dataset.value;
        let title = document.getElementById('taskTitle').value.trim();
        let description = document.getElementById('taskDescription') ? document.getElementById('taskDescription').value.trim() : '';
        let tag = document.getElementById('taskTagSelectWrapper').dataset.value || ''; 
        
        let assigneeId = hasPower ? (document.getElementById('taskAssigneeSelectWrapper').dataset.value || user.id) : user.id;
        let finalizerId = hasPower ? (document.getElementById('taskFinalizerSelectWrapper').dataset.value || user.id) : user.id;

        if (!projectId || projectId === "undefined" || projectId === "ADD_NEW_PROJECT") return showToast('لطفاً یک پروژه معتبر انتخاب کنید.', 'error');
        if (!title) return showToast('عنوان تسک الزامی است.', 'error');
        if (hasPower && !assigneeId) assigneeId = user.id;
        if (hasPower && !finalizerId) finalizerId = user.id;

        let isPublic = document.getElementById('chkPublicTask') ? document.getElementById('chkPublicTask').checked : false;
        let obsWrapper = document.getElementById('observersMultiSelectWrapper');
        let selectedObservers = (obsWrapper && obsWrapper.getSelectedValues) ? obsWrapper.getSelectedValues() : [];

        let deadlineRaw = document.getElementById('taskDeadlineInput') ? document.getElementById('taskDeadlineInput').value : '';
        let parsedDL = parseDeadlineInput(deadlineRaw);
        let isImportant = document.getElementById('chkTaskImportant') ? document.getElementById('chkTaskImportant').checked : false;

        const nowTs = Date.now();
        const nowPersian = new Date(nowTs).toLocaleDateString('fa-IR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        let newTask = {
            projectId: projectId, 
            title: title, 
            description: description,
            assigneeId: assigneeId, 
            finalizerId: finalizerId,
            creatorId: user.id, 
            tag: tag, 
            status: 'pending', 
            transferRequest: null, 
            activities: [],
            isImportant: isImportant, 
            deadlineTimestamp: parsedDL.timestamp, 
            deadlineLabel: parsedDL.label,
            isPublic: isPublic, 
            observers: selectedObservers,
            createdAt: nowTs,
            createdDateStr: nowPersian,
            viewedBy: [user.id], // سازنده خودش تسک رو همون لحظه دیده
            seenList: [
                {
                    userId: user.id,
                    userName: user.name,
                    timestamp: nowTs,
                    dateStr: nowPersian
                }
            ]
        };
        
        try {
            await DBManager.saveTask(newTask);

            // ارسال نوتیفیکیشن سیستمی به مسئول تسک
            if (newTask.assigneeId && String(newTask.assigneeId) !== String(user.id)) {
                NotificationManager.sendPush(newTask.assigneeId, {
                    title: '📌 تسک جدید برای شما',
                    body: `تسک "${newTask.title}" توسط ${user.name} به شما ارجاع شد.`,
                    priority: newTask.isImportant ? 'urgent' : 'high',
                    tags: ['pushpin', newTask.isImportant ? 'warning' : 'memo'],
                    taskId: newTask._id
                });
            }

            // ارسال نوتیفیکیشن به ناظران
            if (selectedObservers && selectedObservers.length > 0) {
                const obsRecipients = selectedObservers.filter(id => id && String(id) !== String(user.id) && String(id) !== String(newTask.assigneeId));
                if (obsRecipients.length > 0) {
                    NotificationManager.sendPush(obsRecipients, {
                        title: '👀 ناظر در تسک جدید',
                        body: `شما به عنوان ناظر در تسک "${newTask.title}" تعیین شدید.`,
                        priority: 'default',
                        tags: ['eyes', 'pushpin'],
                        taskId: newTask._id
                    });
                }
            }

            document.getElementById('taskTitle').value = ''; 
            if(document.getElementById('taskDescription')) document.getElementById('taskDescription').value = '';
            if(document.getElementById('taskDeadlineInput')) document.getElementById('taskDeadlineInput').value = '';
            if(document.getElementById('chkTaskImportant')) document.getElementById('chkTaskImportant').checked = false;
            if(document.getElementById('chkPublicTask')) document.getElementById('chkPublicTask').checked = false;
            
            document.getElementById('btnCloseModal').click(); 
            await renderDashboard();
            showToast('تسک با موفقیت ثبت شد.');
        } catch (error) { showToast('خطا در ذخیره تسک', 'error'); }
    });

    function getCollapsedProjects() {
        try {
            let user = AuthManager.getCurrentUser();
            let key = user ? 'pm_collapsed_projects_' + user.id : 'pm_collapsed_projects';
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch (e) {
            return [];
        }
    }

    function setProjectCollapsed(projectId, isCollapsed) {
        if (!projectId) return;
        try {
            let user = AuthManager.getCurrentUser();
            let key = user ? 'pm_collapsed_projects_' + user.id : 'pm_collapsed_projects';
            let list = getCollapsedProjects();
            if (isCollapsed) {
                if (!list.includes(projectId)) list.push(projectId);
            } else {
                list = list.filter(id => id !== projectId);
            }
            localStorage.setItem(key, JSON.stringify(list));
        } catch (e) {}
    }

    window.toggleProject = function(headerEl, projectId) {
        const container = headerEl.nextElementSibling;
        if (!container) return;
        const isNowCollapsed = container.classList.toggle('collapsed');
        if (projectId) {
            setProjectCollapsed(projectId, isNowCollapsed);
        }
        const arrow = headerEl.querySelector('.project-collapse-arrow');
        if (arrow) arrow.innerText = isNowCollapsed ? '◀' : '▼';
    };
    const chkShowArchivedEl = document.getElementById('chkShowArchived');
    if(chkShowArchivedEl) chkShowArchivedEl.addEventListener('change', () => renderDashboard());

    // ==========================================
    // قابلیت چیدمان ستونی مستقل و پویا (Multi-Lane Kanban Board)
    // ==========================================
    function getOptimalColumnCount() {
        const width = window.innerWidth;
        if (width < 768) return 1;
        if (width < 1100) return 2;
        if (width < 1500) return 3;
        if (width < 1900) return 4;
        return 5;
    }

    function getSavedProjectLanes() {
        try {
            const raw = localStorage.getItem('pm_project_lanes');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function getSavedProjectOrder() {
        try {
            const raw = localStorage.getItem('pm_project_order');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveCurrentProjectLanes(container) {
        if (!container) return;
        const laneEls = container.querySelectorAll('.project-lane');
        if (laneEls.length === 0) return;
        const lanes = [];
        const flatOrder = [];
        laneEls.forEach(lane => {
            const ids = [];
            lane.querySelectorAll('.project-group').forEach(c => {
                if (c.dataset.projectId) {
                    ids.push(c.dataset.projectId);
                    flatOrder.push(c.dataset.projectId);
                }
            });
            lanes.push(ids);
        });
        localStorage.setItem('pm_project_lanes', JSON.stringify(lanes));
        localStorage.setItem('pm_project_order', JSON.stringify(flatOrder));
    }

    let boardResizeTimer = null;
    let lastRenderedOptimalCols = getOptimalColumnCount();
    window.addEventListener('resize', () => {
        clearTimeout(boardResizeTimer);
        boardResizeTimer = setTimeout(() => {
            const currentOptimal = getOptimalColumnCount();
            if (currentOptimal !== lastRenderedOptimalCols) {
                lastRenderedOptimalCols = currentOptimal;
                const container = document.getElementById('tasks-list-container');
                if (container && container.offsetParent !== null) {
                    renderDashboard();
                }
            }
        }, 300);
    });

    function setupProjectDragAndDrop(container) {
        if (!container) return;
        const projectCards = container.querySelectorAll('.project-group');
        const lanes = container.querySelectorAll('.project-lane');
        if (projectCards.length === 0) return;

        let draggedEl = null;

        // شنود رویداد درگ روی هر ستون مستقل
        lanes.forEach(lane => {
            lane.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!draggedEl) return;
                e.dataTransfer.dropEffect = 'move';
                lane.classList.add('drag-over-lane');

                // محاسبه موقعیت قرارگیری درون ستون جاری
                const siblingCards = Array.from(lane.querySelectorAll('.project-group')).filter(c => c !== draggedEl);
                let insertBeforeEl = null;
                for (const card of siblingCards) {
                    const rect = card.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    if (e.clientY < midY) {
                        insertBeforeEl = card;
                        break;
                    }
                }

                if (insertBeforeEl) {
                    if (insertBeforeEl !== draggedEl.nextElementSibling) {
                        lane.insertBefore(draggedEl, insertBeforeEl);
                    }
                } else {
                    if (lane.lastElementChild !== draggedEl) {
                        lane.appendChild(draggedEl);
                    }
                }
            });

            lane.addEventListener('dragleave', (e) => {
                if (!lane.contains(e.relatedTarget)) {
                    lane.classList.remove('drag-over-lane');
                }
            });

            lane.addEventListener('drop', (e) => {
                e.preventDefault();
                lane.classList.remove('drag-over-lane');
                saveCurrentProjectLanes(container);
            });
        });

        projectCards.forEach(card => {
            // ۱. پشتیبانی از ماوس در دسکتاپ
            card.addEventListener('dragstart', (e) => {
                draggedEl = card;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', card.dataset.projectId || '');
                setTimeout(() => card.classList.add('is-dragging'), 0);
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('is-dragging');
                lanes.forEach(l => l.classList.remove('drag-over-lane'));
                saveCurrentProjectLanes(container);
                draggedEl = null;
            });

            // ۲. پشتیبانی از لمس و نگه‌داشتن در گوشی (Touch & Hold برای اندروید)
            const handle = card.querySelector('.project-drag-handle') || card.querySelector('.project-header');
            if (handle) {
                let touchTimer = null;
                let isTouchDragging = false;
                let startX = 0;
                let startY = 0;

                handle.addEventListener('touchstart', (e) => {
                    const touch = e.touches[0];
                    startX = touch.clientX;
                    startY = touch.clientY;
                    touchTimer = setTimeout(() => {
                        isTouchDragging = true;
                        draggedEl = card;
                        card.classList.add('touch-dragging');
                        if (navigator.vibrate) navigator.vibrate(50);
                    }, 300);
                }, { passive: true });

                handle.addEventListener('touchmove', (e) => {
                    if (!isTouchDragging) {
                        const touch = e.touches[0];
                        if (Math.abs(touch.clientY - startY) > 15 || Math.abs(touch.clientX - startX) > 15) {
                            clearTimeout(touchTimer);
                        }
                        return;
                    }

                    e.preventDefault();
                    const touch = e.touches[0];
                    const hoveredEl = document.elementFromPoint(touch.clientX, touch.clientY);
                    const targetLane = hoveredEl ? hoveredEl.closest('.project-lane') : null;
                    if (targetLane) {
                        const siblingCards = Array.from(targetLane.querySelectorAll('.project-group')).filter(c => c !== card);
                        let insertBeforeEl = null;
                        for (const sc of siblingCards) {
                            const rect = sc.getBoundingClientRect();
                            if (touch.clientY < (rect.top + rect.height / 2)) {
                                insertBeforeEl = sc;
                                break;
                            }
                        }
                        if (insertBeforeEl) {
                            if (insertBeforeEl !== card.nextElementSibling) {
                                targetLane.insertBefore(card, insertBeforeEl);
                            }
                        } else {
                            if (targetLane.lastElementChild !== card) {
                                targetLane.appendChild(card);
                            }
                        }
                    }
                }, { passive: false });

                const finishTouch = () => {
                    clearTimeout(touchTimer);
                    if (isTouchDragging) {
                        isTouchDragging = false;
                        card.classList.remove('touch-dragging');
                        saveCurrentProjectLanes(container);
                        showToast('چیدمان پروژه‌ها ذخیره شد.');
                    }
                };

                handle.addEventListener('touchend', finishTouch, { passive: true });
                handle.addEventListener('touchcancel', finishTouch, { passive: true });
            }
        });
    }

    async function renderDashboard() {
        let currentUser = AuthManager.getCurrentUser();
        if (!currentUser) return;
        
        document.getElementById('archiveToggleLabel').style.display = (currentUser.role === 'admin') ? 'flex' : 'none';
        let showArchived = document.getElementById('chkShowArchived') ? document.getElementById('chkShowArchived').checked : false;

        let searchInputEl = document.getElementById('dashboardSearchInput');
        let searchTerm = searchInputEl ? searchInputEl.value.trim().toLowerCase() : '';

        let allTasks = await DBManager.getTasks();
        let allProjects = await DBManager.getProjects();
        const container = document.getElementById('tasks-list-container');
        
        let adminNotif = document.getElementById('admin-notifications');
        let hasAssignPower = currentUser.role === 'admin' || Boolean(currentUser.canAssignTasks);
        if (hasAssignPower) {
            let pendingTransfers = allTasks.filter(t => t.transferRequest !== null && !t.isArchived && (currentUser.role === 'admin' || isSameUser(t.finalizerId, currentUser.id) || isSameUser(t.creatorId, currentUser.id)));
            let pendingApprovals = allTasks.filter(t => t.status === 'pending_approval' && !t.isArchived && (currentUser.role === 'admin' || isSameUser(t.finalizerId, currentUser.id)));
            
            if (pendingTransfers.length > 0 || pendingApprovals.length > 0) {
                if(adminNotif) adminNotif.style.display = 'block'; 
                let html = '';
                pendingTransfers.forEach(t => {
                    let reqName = findUserName(t.assigneeId);
                    let targetName = findUserName(t.transferRequest);
                    html += `<div style="padding:10px; background:rgba(255,255,255,0.05); border-radius:8px; margin-bottom:8px;">
                        درخواست ارجاع <b>${t.title}</b> از ${reqName} به ${targetName}.
                        <div style="margin-top:8px;">
                            <button onclick="window.handleTransfer('${t._id}', true)" class="btn btn-small btn-success">تایید</button> 
                            <button onclick="window.handleTransfer('${t._id}', false)" class="btn btn-small btn-secondary">رد</button>
                        </div>
                    </div>`;
                });
                pendingApprovals.forEach(t => {
                    let asgName = findUserName(t.assigneeId);
                    html += `<div style="padding:10px; background:rgba(16,185,129,0.1); border-radius:8px; margin-bottom:8px; border: 1px solid var(--success);">
                        پایان کار <b>${t.title}</b> توسط ${asgName}. نیازمند تایید نهایی.
                        <div style="margin-top:8px;">
                            <button onclick="window.openTaskById('${t._id}')" class="btn btn-small btn-primary">مشاهده و تایید</button>
                        </div>
                    </div>`;
                });
                let notifList = document.getElementById('admin-notif-list');
                if(notifList) notifList.innerHTML = html;
            } else { if(adminNotif) adminNotif.style.display = 'none'; }
        } else { if(adminNotif) adminNotif.style.display = 'none'; }

        if(!container) return;
        container.innerHTML = '';
        
        let myTasks = currentUser.role === 'admin' ? allTasks : allTasks.filter(t => isUserAllowedToViewTask(t, currentUser));

        // شمارش و نمایش تعداد کل تسک‌های جدید/خوانده‌نشده
        let totalUnreadCount = allTasks.filter(t => 
            isUserAllowedToViewTask(t, currentUser) && 
            t.status !== 'completed' && 
            (!t.viewedBy || !t.viewedBy.some(v => isSameUser(v, currentUser.id)))
        ).length;
        const totalUnreadBadge = document.getElementById('unreadTotalCountBadge');
        if (totalUnreadBadge) {
            if (totalUnreadCount > 0) {
                totalUnreadBadge.style.display = 'inline-flex';
                totalUnreadBadge.innerText = totalUnreadCount;
            } else {
                totalUnreadBadge.style.display = 'none';
            }
        }

        // اعمال تب فیلتر سریع
        window.currentDashboardTab = window.currentDashboardTab || 'all';
        if (window.currentDashboardTab === 'unread') {
            myTasks = myTasks.filter(t => (!t.viewedBy || !t.viewedBy.some(v => isSameUser(v, currentUser.id))) && t.status !== 'completed');
        } else if (window.currentDashboardTab === 'mine') {
            myTasks = myTasks.filter(t => isSameUser(t.assigneeId, currentUser.id));
        } else if (window.currentDashboardTab === 'important') {
            myTasks = myTasks.filter(t => t.isImportant && t.status !== 'completed');
        } else if (window.currentDashboardTab === 'digikala') {
            myTasks = myTasks.filter(t => isDigikalaTask(t) && t.status !== 'completed');
        }

        if (searchTerm) {
            myTasks = myTasks.filter(t => {
                let assigneeName = findUserName(t.assigneeId).toLowerCase();
                return t.title.toLowerCase().includes(searchTerm) || (t.tag && t.tag.toLowerCase().includes(searchTerm)) || assigneeName.includes(searchTerm);
            });
        }
            
        let filteredProjects = allProjects.filter(p => Boolean(p.isArchived) === Boolean(showArchived));
        let myProjects = filteredProjects.filter(p => myTasks.some(t => t.projectId === p._id) || currentUser.role === 'admin');
        
        // مرتب‌سازی بر اساس چیدمان سفارشی پروژه‌ها
        const savedOrder = getSavedProjectOrder();
        if (savedOrder && savedOrder.length > 0) {
            myProjects.sort((a, b) => {
                let idxA = savedOrder.indexOf(a._id);
                let idxB = savedOrder.indexOf(b._id);
                if (idxA === -1) idxA = 999999;
                if (idxB === -1) idxB = 999999;
                return idxA - idxB;
            });
        }

        if (myProjects.length === 0) { 
            container.innerHTML = searchTerm ? '<div class="card">تسکی با این جستجو یافت نشد.</div>' : '<div class="card">تسک فعالی با این فیلتر وجود ندارد.</div>'; 
            return; 
        }

        let collapsedList = getCollapsedProjects();
        const cardHtmlMap = new Map();
        const activeProjects = [];

        myProjects.forEach(proj => {
            let projTasks = myTasks.filter(t => t.projectId === proj._id);
            if (searchTerm && projTasks.length === 0) return;

            let unreadCountInProj = projTasks.filter(t => (!t.viewedBy || !t.viewedBy.includes(currentUser.id)) && t.status !== 'completed').length;
            let unreadBadgeInHeader = unreadCountInProj > 0 ? `<span class="badge-unread-count">${unreadCountInProj} جدید</span>` : '';

            projTasks.sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed') return 1;
                if (a.status !== 'completed' && b.status === 'completed') return -1;
                let aOver = isTaskOverdue(a) ? 1 : 0; let bOver = isTaskOverdue(b) ? 1 : 0;
                if (aOver !== bOver) return bOver - aOver;
                return (b.isImportant ? 1 : 0) - (a.isImportant ? 1 : 0);
            });

            let isAdmin = currentUser.role === 'admin' || isSameUser(currentUser.id, '100');
            let projectActionBtns = '';
            if (isAdmin) {
                projectActionBtns = `
                    <div class="project-header-actions" onclick="event.stopPropagation();">
                        ${!showArchived ? `<button class="btn btn-small btn-secondary btn-proj-archive" onclick="window.archiveProject('${proj._id}')" title="آرشیو پروژه">آرشیو</button>` : ''}
                        <button class="btn btn-small btn-proj-delete" onclick="window.deleteProjectById('${proj._id}', '${proj.title}')" title="حذف کامل این پروژه">🗑️ حذف</button>
                    </div>
                `;
            }
            
            let isCollapsed = searchTerm ? false : collapsedList.includes(proj._id);

            let projHTML = `<div class="project-group" draggable="true" data-project-id="${proj._id}">
                <div class="project-header" onclick="toggleProject(this, '${proj._id}')">
                    <div class="project-header-info">
                        <span class="project-drag-handle" title="نگه‌داشتن یا کشیدن جهت تغییر چیدمان" onclick="event.stopPropagation();">⠿</span>
                        <span class="project-collapse-arrow" style="display:inline-block; font-size:0.75rem; color:var(--text-muted); flex-shrink:0;">${isCollapsed ? '◀' : '▼'}</span>
                        <button class="btn-quick-add" onclick="event.stopPropagation(); window.quickAddTask('${proj._id}', '${proj.title}')" title="افزودن تسک به این پروژه" style="flex-shrink:0;">
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                        <span class="project-title-text" title="${escapeHtml(proj.title)}">📁 ${escapeHtml(proj.title)}</span>
                        <span class="project-count-badge">(${projTasks.length})</span>
                        ${unreadBadgeInHeader}
                    </div>
                    ${projectActionBtns}
                </div>
                <div class="project-tasks-container ${isCollapsed ? 'collapsed' : ''}">`;
            
            if (projTasks.length === 0) {
                projHTML += `
                    <div style="padding: 24px 14px; text-align: center; color: var(--text-muted); font-size: 0.85rem; border: 1px dashed var(--border-color); border-radius: 10px; margin: 8px 10px 12px 10px; background: rgba(255, 255, 255, 0.01);">
                        تسکی در این پروژه وجود ندارد
                    </div>`;
            }

            projTasks.forEach(t => {
                let overdue = isTaskOverdue(t);
                let isUnread = (!t.viewedBy || !t.viewedBy.some(v => isSameUser(v, currentUser.id))) && t.status !== 'completed';
                let isDk = isDigikalaTask(t);

                let cardClasses = 'task-card';
                if (isDk) cardClasses += ' task-card-digikala';
                if (t.status === 'completed') {
                    cardClasses += ' task-done';
                } else {
                    if (isUnread) cardClasses += ' task-unread';
                    if (overdue) cardClasses += ' task-overdue';
                    else if (t.isImportant) cardClasses += ' task-important';
                }

                let statusTxt = isDk ? '🛒' : (t.status === 'completed' ? '✅' : (t.status === 'pending_approval' ? '⏳' : (overdue ? '🚨' : '🔥')));
                
                let badgesHTML = '';
                if (isDk) badgesHTML += `<span class="badge-digikala">🔴 سفارش دیجی‌کالا</span>`;
                if (isDk && t.dkpc) badgesHTML += `<span class="badge-dkpc">DKPC-${t.dkpc}</span>`;
                if (isUnread) badgesHTML += `<span class="badge-unread"><span class="unread-dot"></span>جدید</span>`;
                if (t.tag && (!isDk || !t.tag.includes('دیجی‌کالا'))) badgesHTML += `<span class="tag">${t.tag}</span>`;
                if (t.isImportant) badgesHTML += `<span class="badge-important">⭐ مهم</span>`;
                if (t.deadlineLabel) badgesHTML += `<span class="badge-deadline ${overdue ? 'overdue' : ''}">📅 ${t.deadlineLabel}</span>`;

                // وضعیت مشاهده مسئول تسک
                let assigneeSeen = t.seenList && t.seenList.some(s => isSameUser(s.userId, t.assigneeId));
                let seenBadge = '';
                if (t.status !== 'completed' && (isSameUser(t.creatorId, currentUser.id) || currentUser.role === 'admin' || isSameUser(t.finalizerId, currentUser.id))) {
                    seenBadge = assigneeSeen
                        ? `<span class="badge-seen" title="توسط مسئول تسک (${findUserName(t.assigneeId)}) مشاهده شده است">👁️ دیده‌شده</span>`
                        : `<span class="badge-unseen" title="هنوز توسط مسئول تسک باز نشده است">👁️‍🗨️ دیده‌نشده</span>`;
                }

                let lastReport = t.activities ? t.activities.filter(a => a.type === 'report').pop() : null;
                let lastComment = t.activities ? t.activities.filter(a => a.type === 'comment').pop() : null;
                let activitySnippet = '';
                if (lastReport) activitySnippet += `<div style="margin-bottom: 4px; border-right: 3px solid #10b981; padding-right: 6px;"><b style="color:#10b981;">آخرین گزارش:</b> ${lastReport.text.substring(0, 45)}${lastReport.text.length > 45 ? '...' : ''}</div>`;
                if (lastComment) activitySnippet += `<div style="border-right: 3px solid var(--primary); padding-right: 6px;"><b style="color:var(--primary);">نظر ${lastComment.userName}:</b> ${lastComment.text.substring(0, 45)}${lastComment.text.length > 45 ? '...' : ''}</div>`;
                if (!activitySnippet) activitySnippet = '<div style="opacity: 0.5;">گزارش یا نظری ثبت نشده...</div>';

                let createdStr = t.createdDateStr || (t.createdAt ? new Date(t.createdAt).toLocaleDateString('fa-IR', { month: 'numeric', day: 'numeric' }) : '');

                projHTML += `
                    <div class="${cardClasses}" onclick="window.openTaskById('${t._id}')">
                        <div class="task-card-inner">
                            <div class="task-card-title" style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; width:100%;">
                                <h3 style="flex:1; min-width:0; margin:0; word-break:break-word;">${statusTxt} ${t.title}</h3>
                                <button class="task-card-history-btn" onclick="event.stopPropagation(); window.openTaskHistoryModal('${t._id}')" title="تاریخچه وقایع، ارجاعات و مشاهده‌های تسک">📜</button>
                            </div>
                            ${t.description ? `<div class="task-card-desc">${escapeHtml(t.description)}</div>` : ''}
                            <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-top: 6px; align-items: center;">
                                ${badgesHTML}
                                ${seenBadge}
                            </div>
                            <div class="task-latest-activity">${activitySnippet}</div>
                            <div class="task-card-meta" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; width:100%; border-top:1px dashed rgba(255,255,255,0.06); padding-top:6px; margin-top:6px;">
                                <div style="font-size: 0.75rem; color: var(--text-muted); display:inline-flex; align-items:center; gap: 6px; flex-wrap: wrap;">
                                    <span style="opacity:0.75; font-size:0.7rem;">از:</span>
                                    <span style="display:inline-flex; align-items:center; gap:3px;" title="ایجادکننده تسک">${getUserAvatarHtml(t.creatorId, 16)} <span style="opacity:0.9;">${findUserName(t.creatorId)}</span></span>
                                    <span style="color:var(--primary); font-weight:bold; font-size:0.9rem;" title="ارجاع شده به">←</span>
                                    <span style="opacity:0.75; font-size:0.7rem;">به:</span>
                                    <span style="display:inline-flex; align-items:center; gap:3px;" title="مسئول انجام">${getUserAvatarHtml(t.assigneeId, 16)} <b>${findUserName(t.assigneeId)}</b></span>
                                    ${createdStr ? `<span style="font-size:0.7rem; opacity:0.75; margin-right:4px;">📅 ${createdStr}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>`;
            });
            projHTML += `</div></div>`;
            cardHtmlMap.set(proj._id, projHTML);
            activeProjects.push(proj._id);
        });

        if (activeProjects.length === 0) {
            container.innerHTML = searchTerm ? '<div class="card">تسکی با این جستجو یافت نشد.</div>' : '<div class="card">تسک فعالی با این فیلتر وجود ندارد.</div>';
            return;
        }

        const optimalCols = getOptimalColumnCount();
        const numCols = Math.min(optimalCols, Math.max(1, activeProjects.length));
        lastRenderedOptimalCols = optimalCols;

        // آماده‌سازی ستون‌های مستقل برد (Lanes)
        const lanesBuckets = Array.from({ length: numCols }, () => []);
        const placedIds = new Set();
        const savedLanes = getSavedProjectLanes();

        if (savedLanes && Array.isArray(savedLanes) && savedLanes.length > 0 && numCols > 1) {
            savedLanes.forEach((laneList, lIdx) => {
                const targetCol = lIdx % numCols;
                if (Array.isArray(laneList)) {
                    laneList.forEach(id => {
                        if (activeProjects.includes(id) && !placedIds.has(id)) {
                            lanesBuckets[targetCol].push(id);
                            placedIds.add(id);
                        }
                    });
                }
            });
        }

        // پروژه‌های جدید یا توزیع پیش‌فرض
        activeProjects.forEach(id => {
            if (!placedIds.has(id)) {
                let minCol = 0;
                let minLen = lanesBuckets[0].length;
                for (let c = 1; c < numCols; c++) {
                    if (lanesBuckets[c].length < minLen) {
                        minLen = lanesBuckets[c].length;
                        minCol = c;
                    }
                }
                lanesBuckets[minCol].push(id);
                placedIds.add(id);
            }
        });

        // رندر نهایی کانتینر چندستونه مستقل
        let boardHTML = '';
        for (let c = 0; c < numCols; c++) {
            const bucket = lanesBuckets[c] || [];
            const cardsInLane = bucket.map(id => cardHtmlMap.get(id)).filter(Boolean).join('');
            boardHTML += `<div class="project-lane" data-lane-index="${c}">
                ${cardsInLane}
            </div>`;
        }

        container.innerHTML = boardHTML;
        setupProjectDragAndDrop(container);
    }

    window.archiveProject = async function(id) {
        let isConfirmed = await showCustomModal({ title: 'آرشیو پروژه', message: 'پروژه به آرشیو منتقل شود؟', type: 'confirm' });
        if(isConfirmed) {
            let p = (await DBManager.getProjects()).find(x => x._id === id);
            if (p) { p.isArchived = true; await DBManager.saveProject(p); renderDashboard(); }
        }
    };

    window.deleteProjectById = async function(id, title) {
        let isConfirmed = await showCustomModal({ 
            title: 'حذف کامل پروژه', 
            message: `آیا از حذف کامل پروژه «${title}» مطمئن هستید؟ با حذف این پروژه، تسک‌های داخل آن نیز از داشبورد خارج می‌شوند.`, 
            type: 'confirm',
            okText: 'بله، حذف شود'
        });
        if (isConfirmed) {
            await DBManager.deleteProject(id);
            showToast('پروژه با موفقیت حذف شد.');
            let user = AuthManager.getCurrentUser();
            if (user) window.reloadProjectsInDropdown(user);
            renderDashboard();
        }
    };

    window.deleteCurrentTask = async function() {
        let isConfirmed = await showCustomModal({ title: 'حذف تسک', message: 'آیا از حذف این تسک مطمئن هستید؟ این عمل غیرقابل بازگشت است.', type: 'confirm', okText: 'بله، حذف شود' });
        if(isConfirmed && currentOpenedTask) {
            await PouchAdapter.deleteItem(currentOpenedTask._id);
            document.getElementById('taskDetailModal').classList.remove('active');
            renderDashboard(); showToast('تسک با موفقیت حذف شد.');
        }
    };

    window.editTaskObservers = async function() {
        if (!currentOpenedTask) return;
        let user = AuthManager.getCurrentUser();
        let canEdit = user.role === 'admin' || isSameUser(currentOpenedTask.creatorId, user.id);
        if (!canEdit) return showToast('فقط مدیر یا ثبت‌کننده تسک می‌تواند ناظران را ویرایش کند.', 'error');

        let currentObs = Array.isArray(currentOpenedTask.observers) ? currentOpenedTask.observers.map(String) : [];
        let allUsers = AuthManager.usersList || [];

        let checkboxesHtml = allUsers.map(u => {
            let isChecked = currentObs.includes(String(u.id)) ? 'checked' : '';
            return `
                <label style="display:flex; align-items:center; gap:8px; padding:7px 10px; background:rgba(255,255,255,0.04); border-radius:8px; cursor:pointer; font-size:0.86rem; border:1px solid rgba(255,255,255,0.06);">
                    <input type="checkbox" class="task-obs-chk" value="${u.id}" ${isChecked} style="accent-color:var(--primary); width:16px; height:16px;" />
                    <span>${getUserAvatarHtml(u.id, 18)} ${u.name}</span>
                </label>
            `;
        }).join('');

        let modalWrap = document.createElement('div');
        modalWrap.innerHTML = `
            <div style="font-size:0.86rem; margin-bottom:12px; color:var(--text-muted); line-height:1.5;">
                افرادی که تیک می‌خورند، می‌توانند این تسک را در کارتابل خود مشاهده کرده و در گفتگوها شرکت کنند:
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; max-height:240px; overflow-y:auto; padding:4px;" id="taskObsEditBox">
                ${checkboxesHtml}
            </div>
        `;

        let isConfirmed = await showCustomModal({
            title: '👥 ویرایش و انتصاب ناظران تسک',
            html: modalWrap.innerHTML,
            type: 'confirm',
            okText: 'ذخیره ناظران',
            cancelText: 'انصراف'
        });

        if (isConfirmed) {
            let chks = document.querySelectorAll('.task-obs-chk:checked');
            let newObs = Array.from(chks).map(c => c.value);
            currentOpenedTask.observers = newObs;
            await DBManager.saveTask(currentOpenedTask);
            openTaskDetail(currentOpenedTask);
            renderDashboard();
            showToast('✅ لیست ناظران تسک با موفقیت به‌روزرسانی شد.');
        }
    };

    window.editTaskTitle = async function() {
        if (!currentOpenedTask) return;
        let newTitle = await showCustomModal({ title: 'ویرایش عنوان تسک', type: 'prompt', placeholder: currentOpenedTask.title, okText: 'ذخیره' });
        if(newTitle && newTitle.trim() && newTitle.trim() !== currentOpenedTask.title) {
            currentOpenedTask.title = newTitle.trim();
            await DBManager.saveTask(currentOpenedTask);
            openTaskDetail(currentOpenedTask); renderDashboard(); showToast('عنوان تسک ویرایش شد.');
        }
    };

    window.deleteActivity = async function(actId) {
        let isConfirmed = await showCustomModal({ title: 'حذف پیام', message: 'آیا از حذف این پیام یا گزارش مطمئن هستید؟', type: 'confirm' });
        if (isConfirmed && currentOpenedTask) {
            currentOpenedTask.activities = currentOpenedTask.activities.filter(a => a.id !== actId);
            await DBManager.saveTask(currentOpenedTask);
            openTaskDetail(currentOpenedTask); renderDashboard(); showToast('پیام حذف شد.');
        }
    };

    // متغیرهای موقت پیوست فایل و تصویر
    let pendingReportAttachment = null;
    let pendingCommentAttachment = null;

    function formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 بایت';
        const k = 1024;
        const sizes = ['بایت', 'کیلوبایت', 'مگابایت'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function processFileAttachment(file, callback) {
        if (!file) return;
        if (file.size > 15 * 1024 * 1024) {
            showToast('حجم فایل انتخابی نباید بیشتر از ۱۵ مگابایت باشد.', 'error');
            return;
        }

        const isImage = file.type.startsWith('image/');
        if (isImage) {
            compressImageToBase64(file, (b64) => {
                callback({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: b64,
                    isImage: true
                });
            });
        } else {
            const reader = new FileReader();
            reader.onload = function(e) {
                callback({
                    name: file.name,
                    type: file.type || 'application/octet-stream',
                    size: file.size,
                    data: e.target.result,
                    isImage: false
                });
            };
            reader.readAsDataURL(file);
        }
    }

    function renderAttachmentPreview(containerId, att, clearFnName) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (!att) {
            container.innerHTML = '';
            return;
        }

        if (att.isImage) {
            container.innerHTML = `
                <div style="position:relative; display:inline-block; margin: 4px 0;">
                    <img src="${att.data}" class="clickable-image" style="max-height: 80px; border-radius: 8px; border: 1px solid var(--border-color); margin: 0;"/>
                    <span class="remove-attachment-btn" onclick="${clearFnName}()">✕</span>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="position:relative; display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.06); border:1px solid var(--border-color); border-radius:8px; padding:6px 12px; margin: 4px 0;">
                    <span style="font-size:1.2rem;">📎</span>
                    <span style="font-size:0.82rem; font-weight:bold; color:var(--text-main); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${att.name}</span>
                    <span style="font-size:0.75rem; color:var(--text-muted);">(${formatFileSize(att.size)})</span>
                    <span class="remove-attachment-btn" style="position:static; margin-right:4px;" onclick="${clearFnName}()">✕</span>
                </div>
            `;
        }
    }

    window.clearReportAttachment = function() {
        pendingReportAttachment = null;
        document.getElementById('reportAttachmentPreview').innerHTML = '';
        const input = document.getElementById('reportFileInput');
        if (input) input.value = '';
    };

    window.clearCommentAttachment = function() {
        pendingCommentAttachment = null;
        document.getElementById('commentAttachmentPreview').innerHTML = '';
        const input = document.getElementById('commentFileInput');
        if (input) input.value = '';
    };

    window.downloadAttachment = function(fileName, dataUrl) {
        if (!dataUrl) return;
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = fileName || 'attachment';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 100);
    };

    window.openTaskById = async function(taskId) {
        let tasks = await DBManager.getTasks(); 
        let task = tasks.find(t => t._id === taskId);
        if(task) {
            let user = AuthManager.getCurrentUser();
            if (!task.viewedBy) task.viewedBy = [];
            if (!task.seenList) task.seenList = [];

            const nowTs = Date.now();
            const nowPersian = new Date(nowTs).toLocaleDateString('fa-IR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            let needSave = false;
            if (!task.viewedBy.includes(user.id)) {
                task.viewedBy.push(user.id);
                needSave = true;
            }

            let existingSeen = task.seenList.find(s => isSameUser(s.userId, user.id));
            if (!existingSeen) {
                task.seenList.push({
                    userId: user.id,
                    userName: user.name,
                    timestamp: nowTs,
                    dateStr: nowPersian
                });
                needSave = true;
            } else {
                existingSeen.lastSeenAt = nowTs;
                existingSeen.lastSeenStr = nowPersian;
            }

            if (needSave) {
                DBManager.saveTask(task).then(() => renderDashboard());
            }

            openTaskDetail(task);
        }
    };

    window.toggleTaskImportance = async function() {
        if (!currentOpenedTask) return;
        currentOpenedTask.isImportant = !currentOpenedTask.isImportant;
        await DBManager.saveTask(currentOpenedTask); openTaskDetail(currentOpenedTask); renderDashboard();
        showToast(currentOpenedTask.isImportant ? '⭐ تسک به عنوان مهم علامت‌گذاری شد.' : 'از حالت مهم خارج شد.');
    };

    function openTaskDetail(task) {
        currentOpenedTask = task;
        let user = AuthManager.getCurrentUser();
        let overdue = isTaskOverdue(task);
        let canDelete = user.role === 'admin' || isSameUser(task.creatorId, user.id);
        
        const titleEl = document.getElementById('td-title');
        if (titleEl) {
            titleEl.innerText = task.title;
        }

        const btnEdit = document.getElementById('btnEditTaskTitle');
        const btnDelete = document.getElementById('btnDeleteTask');
        if (btnEdit) {
            btnEdit.style.display = canDelete ? 'inline-flex' : 'none';
            btnEdit.onclick = (e) => {
                e.stopPropagation();
                window.editTaskTitle();
            };
        }
        if (btnDelete) {
            btnDelete.style.display = canDelete ? 'inline-flex' : 'none';
            btnDelete.onclick = (e) => {
                e.stopPropagation();
                window.deleteCurrentTask();
            };
        }

        // دکمه باز کردن تاریخچه تسک
        const btnHistory = document.getElementById('btnOpenTaskHistory');
        if (btnHistory) {
            btnHistory.onclick = () => window.openTaskHistoryModal(task._id);
        }

        // نمایش توضیحات تسک در صورت وجود
        const descEl = document.getElementById('td-description');
        if (descEl) {
            if (task.description && task.description.trim()) {
                descEl.style.display = 'block';
                descEl.innerText = task.description;
            } else {
                descEl.style.display = 'none';
                descEl.innerText = '';
            }
        }

        let statStr = task.status === 'completed' ? '✅ تکمیل شده' : (task.status === 'pending_approval' ? '⏳ منتظر تایید مدیر' : '🔥 در حال انجام');
        if (overdue) statStr += ` <span class="badge-deadline overdue" style="margin-right:6px;">🚨 موعد رسیده (${task.deadlineLabel})</span>`;
        else if (task.deadlineLabel) statStr += ` <span class="badge-deadline" style="margin-right:6px;">📅 مهلت: ${task.deadlineLabel}</span>`;
        
        statStr += ` <button onclick="window.toggleTaskImportance()" class="btn btn-small btn-secondary" style="padding: 2px 8px; font-size: 0.75rem; margin-right: 6px; border-color: ${task.isImportant ? '#f59e0b' : 'transparent'}; color: ${task.isImportant ? '#fbbf24' : '#94a3b8'};">
            ${task.isImportant ? '⭐ مهم (فعال)' : '☆ علامت به عنوان مهم'}
        </button>`;

        document.getElementById('td-status').innerHTML = statStr;

        // بنر اختصاصی و لینک مستقیم سفارش در سلر سنتر دیجی‌کالا
        let dkBanner = document.getElementById('td-digikala-banner');
        if (!dkBanner) {
            dkBanner = document.createElement('div');
            dkBanner.id = 'td-digikala-banner';
            const statusBox = document.getElementById('td-status');
            if (statusBox && statusBox.parentNode) {
                statusBox.parentNode.insertBefore(dkBanner, statusBox.nextSibling);
            }
        }
        if (isDigikalaTask(task)) {
            dkBanner.style.display = 'block';
            dkBanner.className = 'digikala-detail-banner';
            const cleanDkpc = task.dkpc || (task.title.match(/(\d{6,})/) ? task.title.match(/(\d{6,})/)[1] : '');
            const panelUrl = cleanDkpc ? `https://seller.digikala.com/pwa/orders/ship-by-digikala/${cleanDkpc}` : 'https://seller.digikala.com/pwa/orders';
            dkBanner.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:1.5rem;">🛍️</span>
                        <div>
                            <div style="color:#ef394e; font-weight:800; font-size:0.95rem;">سفارش مستقیم فروش دیجی‌کالا</div>
                            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
                                ${task.dkpc ? `<span>کد تنوع: <b style="color:#fca5a5; direction:ltr; display:inline-block;">DKPC-${task.dkpc}</b></span> &bull; ` : ''}
                                <span>مهلت تعهد ارسال: <b style="color:var(--text-main);">${task.deadlineLabel || 'بر اساس پنل'}</b></span>
                            </div>
                        </div>
                    </div>
                    <button class="digikala-detail-btn" onclick="window.openDigikalaPanel('${panelUrl}')">
                        <span>🔗 باز کردن سفارش در پنل دیجی‌کالا</span>
                    </button>
                </div>
            `;
        } else {
            dkBanner.style.display = 'none';
        }

        // نمایش افراد درگیر و وضعیت دیده‌شده
        const metaPeople = document.getElementById('td-meta-people');
        if (metaPeople) {
            let seenCount = task.seenList ? task.seenList.length : (task.viewedBy ? task.viewedBy.length : 1);
            let seenTooltip = task.seenList ? task.seenList.map(s => `${s.userName} (${s.dateStr || ''})`).join(' ، ') : '';
            let obsCount = (task.observers && Array.isArray(task.observers)) ? task.observers.length : 0;
            let obsTooltip = (task.observers && Array.isArray(task.observers)) ? task.observers.map(findUserName).join(' ، ') : 'بدون ناظر';
            let editObsBtn = (user.role === 'admin' || isSameUser(task.creatorId, user.id))
                ? `<span style="cursor:pointer; margin-right:3px; opacity:0.8;" onclick="window.editTaskObservers()" title="ویرایش لیست ناظران">✏️</span>`
                : '';

            metaPeople.innerHTML = `
                <span style="display:inline-flex; align-items:center; gap:4px;" title="ایجادکننده تسک">${getUserAvatarHtml(task.creatorId, 18)} <span>ایجاد: <b>${findUserName(task.creatorId)}</b></span></span>
                <span style="display:inline-flex; align-items:center; gap:4px;" title="مسئول انجام">${getUserAvatarHtml(task.assigneeId, 18)} <span>مسئول: <b style="color:var(--text-main);">${findUserName(task.assigneeId)}</b></span></span>
                <span style="display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="${seenTooltip}" onclick="window.openTaskHistoryModal('${task._id}')" class="badge-seen">👁️ ${seenCount} نفر دیده‌اند</span>
                <span style="display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="${obsTooltip}" onclick="window.editTaskObservers()" class="badge-seen" style="background:rgba(56,189,248,0.1); color:#38bdf8;">👥 ${obsCount} ناظر ${editObsBtn}</span>
            `;
        }

        const reportsBox = document.getElementById('td-official-reports');
        const commentsBox = document.getElementById('td-comments-list');
        reportsBox.innerHTML = ''; commentsBox.innerHTML = '';
        
        if(task.activities) {
            task.activities.forEach(a => {
                let date = new Date(a.timestamp).toLocaleDateString('fa-IR', { hour: '2-digit', minute:'2-digit' });
                let text = a.text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:var(--accent)">$1</a>');
                
                // پیوست تصویر یا فایل
                let attachmentHTML = '';
                if (a.attachment && !a.attachment.isImage) {
                    attachmentHTML = `
                        <div class="attachment-file-box" onclick="window.downloadAttachment('${escapeHtml(a.attachment.name)}', '${a.attachment.data}')">
                            <span style="font-size: 1.4rem;">📎</span>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: bold; font-size: 0.85rem; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(a.attachment.name)}</div>
                                <div style="font-size: 0.72rem; color: var(--text-muted);">${formatFileSize(a.attachment.size)} - کلیک جهت دانلود</div>
                            </div>
                            <span style="color: var(--accent); font-size: 1rem;">⬇️</span>
                        </div>
                    `;
                } else if (a.image || (a.attachment && a.attachment.isImage)) {
                    let imgSrc = a.image || a.attachment.data;
                    attachmentHTML = `<img src="${imgSrc}" class="clickable-image" onclick="window.openImage('${imgSrc}')" style="max-width:100%; border-radius:8px; margin-top:8px;"/>`;
                }

                let isMine = isSameUser(a.userId, user.id);
                let uColor = getUserColor(a.userId);
                let delBtn = user.role === 'admin' ? `<span style="cursor:pointer; color:var(--danger); padding: 0 4px;" title="حذف این پیام" onclick="window.deleteActivity(${a.id})">🗑️</span>` : '';

                if(a.type === 'report') {
                    reportsBox.innerHTML += `<div class="report-item"><div class="msg-meta" style="color: #10b981; display:flex; align-items:center; justify-content:space-between;"><div style="display:inline-flex; align-items:center;">${getUserAvatarHtml(a.userId, 22)} <span>گزارش: ${a.userName}</span></div><div><span style="font-weight:normal; opacity:0.7;">${date}</span>${delBtn}</div></div><div>${text}</div>${attachmentHTML}</div>`;
                } else {
                    if (isMine) {
                        commentsBox.innerHTML += `
                        <div class="chat-msg msg-mine">
                            <div class="msg-meta" style="color: #38bdf8; display:flex; align-items:center; justify-content:space-between;"><div style="display:inline-flex; align-items:center;">${getUserAvatarHtml(a.userId, 22)} <span>شما</span></div><div><span style="font-weight:normal; opacity:0.7;">${date}</span>${delBtn}</div></div>
                            <div>${text}</div>${attachmentHTML}
                        </div>`;
                    } else {
                        commentsBox.innerHTML += `
                        <div class="chat-msg msg-other" style="--user-color: ${uColor}; border-left-color: ${uColor};">
                            <div class="msg-meta" style="color: ${uColor}; display:flex; align-items:center; justify-content:space-between;"><div style="display:inline-flex; align-items:center;">${getUserAvatarHtml(a.userId, 22)} <span>${a.userName}</span></div><div><span style="font-weight:normal; opacity:0.7;">${date}</span>${delBtn}</div></div>
                            <div>${text}</div>${attachmentHTML}
                        </div>`;
                    }
                }
            });
        }
        if(reportsBox.innerHTML === '') reportsBox.innerHTML = '<div style="font-size:0.85rem; color:var(--text-muted); text-align:center;">گزارشی ثبت نشده.</div>';
        if(commentsBox.innerHTML === '') commentsBox.innerHTML = '<div style="font-size:0.85rem; color:var(--text-muted); text-align:center;">هیچ پیامی نیست.</div>';

        let reportForm = document.getElementById('td-report-form');
        let commentForm = document.getElementById('td-comment-form');

        let isMainActor = isSameUser(task.assigneeId, user.id) || isSameUser(task.finalizerId, user.id) || isSameUser(task.creatorId, user.id) || user.role === 'admin';
        let infoNotice = document.getElementById('observerNoticeBox');

        // بازنشانی فایل‌های موقت
        window.clearReportAttachment();
        window.clearCommentAttachment();

        if (task.status === 'completed') {
            reportForm.style.display = 'none'; 
            commentForm.style.display = user.role === 'admin' ? 'block' : 'none'; 
            if (infoNotice) infoNotice.remove();
        } else if (task.status === 'pending_approval') {
            reportForm.style.display = 'none'; 
            commentForm.style.display = 'block'; 
            if(isSameUser(task.finalizerId, user.id) || user.role === 'admin') {
                reportForm.style.display = 'block';
                reportForm.innerHTML = `<button class="btn btn-success" onclick="window.approveTask()" style="width:100%; margin-bottom:8px;">✅ تایید گزارش و بستن پرونده</button>
                                        <button class="btn btn-secondary" onclick="window.rejectTask()" style="width:100%;">❌ رد گزارش و بازگشت به مسئول</button>`;
            }
            if (infoNotice) infoNotice.remove();
        } else {
            commentForm.style.display = 'block';
            
            if (!isMainActor) {
                if (reportForm) reportForm.style.display = 'none';
                if (!infoNotice) {
                    infoNotice = document.createElement('div'); infoNotice.id = 'observerNoticeBox';
                    infoNotice.style.cssText = 'font-size: 0.8rem; color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 8px; border-radius: 8px; margin-bottom: 10px; border: 1px solid rgba(56, 189, 248, 0.3);';
                    reportsBox.parentNode.insertBefore(infoNotice, reportsBox);
                }
                infoNotice.innerText = user.role === 'admin' ? 'ℹ️ شما به عنوان مدیر (دسترسی کامل) این تسک را مشاهده می‌کنید.' : 'ℹ️ شما به عنوان ناظر این تسک را مشاهده می‌کنید (فقط امکان ثبت نظر/کامنت دارید).';
            } else {
                if (infoNotice) infoNotice.remove();
                if(isSameUser(task.assigneeId, user.id)) {
                    reportForm.style.display = 'block';
                    
                    // راه‌اندازی بخش ارجاع داخل فرم گزارش رسمی
                    const chkRefer = document.getElementById('chkReferTaskWithReport');
                    const referBox = document.getElementById('referSelectBoxInReport');
                    const btnSubmitReport = document.getElementById('btnSubmitReport');
                    const btnSubmitFinal = document.getElementById('btnSubmitFinal');

                    if (chkRefer && referBox) {
                        chkRefer.checked = false;
                        referBox.style.display = 'none';
                        if (btnSubmitReport) btnSubmitReport.innerText = 'ثبت گزارش در پرونده';

                        let usersData = AuthManager.usersList.filter(u => !isSameUser(u.id, user.id)).map(u => ({ text: u.name, value: u.id }));
                        setupCustomSelect('transferUserSelectWrapper', usersData, 'انتخاب شخص جدید برای ارجاع...');

                        chkRefer.onchange = function() {
                            referBox.style.display = this.checked ? 'block' : 'none';
                            if (btnSubmitReport) {
                                btnSubmitReport.innerText = this.checked ? 'ثبت گزارش و درخواست ارجاع' : 'ثبت گزارش در پرونده';
                            }
                        };
                    }

                    // دکمه پیوست فایل در گزارش
                    const reportFileBtn = document.getElementById('btnAttachReportFile');
                    const reportFileInput = document.getElementById('reportFileInput');
                    if (reportFileBtn && reportFileInput) {
                        reportFileBtn.onclick = () => reportFileInput.click();
                        reportFileInput.onchange = (e) => {
                            if (e.target.files[0]) {
                                processFileAttachment(e.target.files[0], (att) => {
                                    pendingReportAttachment = att;
                                    renderAttachmentPreview('reportAttachmentPreview', att, 'window.clearReportAttachment');
                                });
                            }
                        };
                    }

                    if (btnSubmitReport) btnSubmitReport.onclick = () => saveActivity('report', false);
                    if (btnSubmitFinal) btnSubmitFinal.onclick = () => saveActivity('report', true);
                } else { 
                    reportForm.style.display = 'none'; 
                }
            }
        }

        // دکمه پیوست فایل در گفتگو و نظرات
        const commentFileBtn = document.getElementById('btnAttachCommentFile');
        const commentFileInput = document.getElementById('commentFileInput');
        if (commentFileBtn && commentFileInput) {
            commentFileBtn.onclick = () => commentFileInput.click();
            commentFileInput.onchange = (e) => {
                if (e.target.files[0]) {
                    processFileAttachment(e.target.files[0], (att) => {
                        pendingCommentAttachment = att;
                        renderAttachmentPreview('commentAttachmentPreview', att, 'window.clearCommentAttachment');
                    });
                }
            };
        }
        document.getElementById('btnSubmitComment').onclick = () => saveActivity('comment', false);

        if (typeof NavigationBackManager !== 'undefined') {
            NavigationBackManager.pushNavState('taskDetail');
        }

        document.getElementById('taskDetailModal').classList.add('active');
    }
    
    document.getElementById('btnCloseTaskDetail').addEventListener('click', () => document.getElementById('taskDetailModal').classList.remove('active'));

    async function saveActivity(type, isFinal) {
        let textId = type === 'report' ? 'td-new-report' : 'td-new-comment';
        let textEl = document.getElementById(textId);
        let text = textEl ? textEl.value.trim() : '';
        let attachment = type === 'report' ? pendingReportAttachment : pendingCommentAttachment;
        
        let user = AuthManager.getCurrentUser();
        let isTransferring = false;
        let transferTargetId = null;

        // بررسی حالت ارجاع در گزارش رسمی کار
        if (type === 'report') {
            const chkRefer = document.getElementById('chkReferTaskWithReport');
            if (chkRefer && chkRefer.checked) {
                isTransferring = true;
                const wrapper = document.getElementById('transferUserSelectWrapper');
                transferTargetId = wrapper ? wrapper.dataset.value : null;

                if (!text) {
                    return showToast('برای ارجاع تسک، نوشتن توضیحات و گزارش در کادر بالا الزامی است.', 'error');
                }
                if (!transferTargetId) {
                    return showToast('لطفاً شخصی که می‌خواهید تسک به او ارجاع داده شود را انتخاب کنید.', 'error');
                }
            }
        }

        if(!text && !attachment) return showToast('محتوایی وارد نکردید.', 'error');

        if(!currentOpenedTask.activities) currentOpenedTask.activities = [];

        let reportTextToSave = text;
        if (isTransferring && transferTargetId) {
            let targetName = findUserName(transferTargetId);
            reportTextToSave = `🔄 درخواست ارجاع تسک به ${targetName} با توضیح: ${text}`;
        }

        let activityItem = {
            id: Date.now(),
            userId: user.id,
            userName: user.name,
            text: reportTextToSave,
            type: type,
            timestamp: Date.now(),
            image: (attachment && attachment.isImage) ? attachment.data : null,
            attachment: attachment || null
        };
        currentOpenedTask.activities.push(activityItem);
        
        if (isTransferring && transferTargetId) {
            currentOpenedTask.transferRequest = transferTargetId;
            currentOpenedTask.viewedBy = [user.id];

            // ارسال نوتیفیکیشن درخواست ارجاع به مدیر کارگاه
            NotificationManager.sendPush('admin', {
                title: '🔄 درخواست ارجاع تسک',
                body: `درخواست ارجاع تسک "${currentOpenedTask.title}" توسط ${user.name} به همراه گزارش ثبت شد.`,
                priority: 'high',
                tags: ['repeat', 'memo'],
                taskId: currentOpenedTask._id
            });

            showToast('گزارش ثبت شد و درخواست ارجاع برای مدیر ارسال گردید.');
        } else if(isFinal) {
            currentOpenedTask.status = 'pending_approval';
            
            // ارسال نوتیفیکیشن تایید نهایی برای مدیر یا تاییدکننده
            const finalizerTarget = currentOpenedTask.finalizerId || 'admin';
            NotificationManager.sendPush(finalizerTarget, {
                title: '📋 تسک منتظر تایید نهایی',
                body: `تسک "${currentOpenedTask.title}" توسط ${user.name} تکمیل شد و منتظر تایید نهایی است.`,
                priority: 'high',
                tags: ['clipboard', 'hourglass_flowing_sand'],
                taskId: currentOpenedTask._id
            });
        } else {
            // ارسال نوتیفیکیشن ثبت گزارش یا نظر جدید به سایر افراد درگیر در تسک
            const recipients = [
                currentOpenedTask.assigneeId,
                currentOpenedTask.creatorId,
                ...(currentOpenedTask.observers || [])
            ].filter(id => id && String(id) !== String(user.id));

            if (recipients.length > 0) {
                const isReport = type === 'report';
                const preview = text ? (text.length > 70 ? text.substring(0, 70) + '...' : text) : 'پیوست فایل ارسال شد';
                NotificationManager.sendPush(recipients, {
                    title: isReport ? `📝 گزارش جدید در "${currentOpenedTask.title}"` : `💬 نظر جدید در "${currentOpenedTask.title}"`,
                    body: `${user.name}: ${preview}`,
                    priority: 'default',
                    tags: isReport ? ['memo'] : ['speech_balloon'],
                    taskId: currentOpenedTask._id
                });
            }
        }
        
        // وقتی پیامی ثبت می‌شود، نشان خوانده شده فقط برای شخص پیام‌دهنده تنظیم می‌شود تا برای بقیه دوباره «جدید» شود
        currentOpenedTask.viewedBy = [user.id];

        await DBManager.saveTask(currentOpenedTask);
        if(type === 'report') window.clearReportAttachment(); else window.clearCommentAttachment();
        if(textEl) textEl.value = '';
        openTaskDetail(currentOpenedTask); 
        renderDashboard();
    }

    // ============================================================
    // مودال جامع تاریخچه وقایع، ارجاعات و مشاهده‌های تسک
    // ============================================================
    window.openTaskHistoryModal = async function(taskId) {
        if (!taskId && currentOpenedTask) taskId = currentOpenedTask._id;
        if (!taskId) return;

        let tasks = await DBManager.getTasks();
        let task = tasks.find(t => t._id === taskId);
        if (!task) return showToast('تسک یافت نشد.', 'error');

        const modal = document.getElementById('taskHistoryModal');
        const titleEl = document.getElementById('th-task-title');
        const timelineEl = document.getElementById('th-timeline-container');
        if (!modal || !timelineEl) return;

        let allProjects = await DBManager.getProjects();
        let proj = allProjects.find(p => p._id === task.projectId);
        let projTitle = proj ? proj.title : 'پروژه عمومی';

        titleEl.innerText = `${task.title} (پروژه: ${projTitle})`;

        let events = [];

        // ۱. رویداد ایجاد تسک
        let createdTs = task.createdAt || (task.activities && task.activities[0] ? task.activities[0].timestamp - 1000 : Date.now());
        let createdStr = task.createdDateStr || new Date(createdTs).toLocaleDateString('fa-IR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        events.push({
            timestamp: createdTs,
            dateStr: createdStr,
            icon: '🌱',
            title: `ایجاد تسک توسط ${findUserName(task.creatorId)}`,
            desc: `تسک با عنوان «${task.title}» تعریف و به ${findUserName(task.assigneeId)} اختصاص یافت.`,
            userAvatar: getUserAvatarHtml(task.creatorId, 20),
            color: 'var(--primary)'
        });

        // ۲. وضعیت افراد دیده‌بان تسک
        if (task.seenList && task.seenList.length > 0) {
            task.seenList.forEach(s => {
                events.push({
                    timestamp: s.timestamp || createdTs,
                    dateStr: s.dateStr || '',
                    icon: '👁️',
                    title: `مشاهده تسک توسط ${s.userName}`,
                    desc: isSameUser(s.userId, task.assigneeId) ? 'مسئول تسک وارد صفحه شد و جزئیات کار را مشاهده کرد.' : 'کاربر تسک را باز و بررسی کرد.',
                    userAvatar: getUserAvatarHtml(s.userId, 20),
                    color: '#38bdf8'
                });
            });
        }

        // ۳. گزارش‌ها، ارجاعات و نظرات
        if (task.activities && task.activities.length > 0) {
            task.activities.forEach(a => {
                let aDate = new Date(a.timestamp).toLocaleDateString('fa-IR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                let isTransfer = a.text && a.text.includes('درخواست ارجاع تسک');
                let isFinalReport = a.text && a.text.includes('اتمام کار');
                let isApproval = a.text && a.text.includes('پرونده توسط مدیر تایید');
                let isReject = a.text && a.text.includes('مدیر کار را رد کرد');

                let icon = a.type === 'report' ? '📝' : '💬';
                let title = `${a.type === 'report' ? 'گزارش رسمی' : 'نظر'}: ${a.userName}`;
                let color = a.type === 'report' ? 'var(--success)' : '#818cf8';

                if (isTransfer) { icon = '🔄'; title = `درخواست ارجاع: ${a.userName}`; color = '#f59e0b'; }
                if (isApproval) { icon = '✅'; title = `تایید نهایی و پایان کار`; color = '#10b981'; }
                if (isReject) { icon = '⚠️'; title = `رد و بازگشت تسک`; color = '#ef4444'; }

                let attBadge = '';
                if (a.attachment) {
                    attBadge = `<div style="margin-top:6px; font-size:0.75rem; color:var(--accent);">📎 پیوست: ${escapeHtml(a.attachment.name)}</div>`;
                }

                events.push({
                    timestamp: a.timestamp,
                    dateStr: aDate,
                    icon: icon,
                    title: title,
                    desc: a.text,
                    extraHtml: attBadge,
                    userAvatar: getUserAvatarHtml(a.userId, 20),
                    color: color
                });
            });
        }

        // ۴. ارجاع در انتظار تایید
        if (task.transferRequest) {
            let targetName = findUserName(task.transferRequest);
            events.push({
                timestamp: Date.now(),
                dateStr: 'در انتظار تایید',
                icon: '⏳',
                title: `ارجاع در انتظار تایید مدیر`,
                desc: `درخواست ارجاع به ${targetName} ارسال شده و منتظر تایید مدیر است.`,
                userAvatar: getUserAvatarHtml(task.transferRequest, 20),
                color: '#f59e0b'
            });
        }

        // مرتب‌سازی زمانی
        events.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        let html = '<div class="task-history-timeline">';
        events.forEach(ev => {
            html += `
                <div class="timeline-event-item">
                    <div class="timeline-event-dot" style="border-color: ${ev.color}; color: ${ev.color};">
                        <span>${ev.icon}</span>
                    </div>
                    <div class="timeline-event-card">
                        <div class="timeline-event-header">
                            <span style="font-weight: bold; color: ${ev.color}; display: flex; align-items: center; gap: 6px;">
                                ${ev.userAvatar || ''}
                                <span>${ev.title}</span>
                            </span>
                            <span style="direction: ltr;">${ev.dateStr}</span>
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-main); line-height: 1.5; margin-top: 4px;">
                            ${escapeHtml(ev.desc)}
                        </div>
                        ${ev.extraHtml || ''}
                    </div>
                </div>
            `;
        });
        html += '</div>';

        timelineEl.innerHTML = html;
        if (typeof NavigationBackManager !== 'undefined') {
            NavigationBackManager.pushNavState('taskHistory');
        }
        modal.classList.add('active');
        modal.style.display = 'flex';
    };

    const closeHistoryBtn = document.getElementById('btnCloseTaskHistory');
    if (closeHistoryBtn) {
        closeHistoryBtn.onclick = () => {
            const modal = document.getElementById('taskHistoryModal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
            }
        };
    }

    window.approveTask = async function() {
        let user = AuthManager.getCurrentUser();
        currentOpenedTask.status = 'completed';
        currentOpenedTask.viewedBy = [user.id];
        currentOpenedTask.activities.push({ id: Date.now(), userId: user.id, userName: 'سیستم', text: '✅ پرونده توسط مدیر تایید و بسته شد.', type: 'report', timestamp: Date.now() });
        await DBManager.saveTask(currentOpenedTask);

        // ارسال نوتیفیکیشن تایید به مسئول تسک
        if (currentOpenedTask.assigneeId && String(currentOpenedTask.assigneeId) !== String(user.id)) {
            NotificationManager.sendPush(currentOpenedTask.assigneeId, {
                title: '✅ تایید نهایی تسک',
                body: `تسک "${currentOpenedTask.title}" توسط مدیر تایید شد و پرونده بسته شد.`,
                priority: 'high',
                tags: ['white_check_mark', 'tada'],
                taskId: currentOpenedTask._id
            });
        }

        showToast('پرونده بسته شد.'); openTaskDetail(currentOpenedTask); renderDashboard();
    };

    window.rejectTask = async function() {
        let user = AuthManager.getCurrentUser();
        currentOpenedTask.status = 'pending';
        currentOpenedTask.viewedBy = [user.id];
        currentOpenedTask.activities.push({ id: Date.now(), userId: user.id, userName: 'سیستم', text: '❌ مدیر کار را رد کرد و به مسئول ارجاع داد.', type: 'report', timestamp: Date.now() });
        await DBManager.saveTask(currentOpenedTask);

        // ارسال نوتیفیکیشن رد/اصلاح به مسئول تسک
        if (currentOpenedTask.assigneeId && String(currentOpenedTask.assigneeId) !== String(user.id)) {
            NotificationManager.sendPush(currentOpenedTask.assigneeId, {
                title: '⚠️ بازگشت تسک جهت اصلاح',
                body: `تسک "${currentOpenedTask.title}" تایید نشد و جهت اصلاح به شما برگشت داده شد.`,
                priority: 'urgent',
                tags: ['warning', 'recycle'],
                taskId: currentOpenedTask._id
            });
        }

        showToast('به مسئول برگشت داده شد.', 'error'); openTaskDetail(currentOpenedTask); renderDashboard();
    };

    const btnTransferEl = document.getElementById('btnRequestTransfer');
    if (btnTransferEl) {
        btnTransferEl.addEventListener('click', async () => {
            let targetId = document.getElementById('transferUserSelectWrapper').dataset.value;
            if (!targetId) return showToast('شخص را انتخاب کنید.', 'error');
            currentOpenedTask.transferRequest = targetId; 
            currentOpenedTask.viewedBy = [AuthManager.getCurrentUser().id];
            await DBManager.saveTask(currentOpenedTask);

            // ارسال نوتیفیکیشن به مدیر جهت تایید انتقال
            NotificationManager.sendPush('admin', {
                title: '🔄 درخواست ارجاع تسک',
                body: `درخواست ارجاع تسک "${currentOpenedTask.title}" توسط ${AuthManager.getCurrentUser().name} ارسال شد.`,
                priority: 'default',
                tags: ['repeat'],
                taskId: currentOpenedTask._id
            });

            showToast('درخواست ارسال شد.'); document.getElementById('taskDetailModal').classList.remove('active'); renderDashboard();
        });
    }

    window.handleTransfer = async function(taskId, isApproved) {
        let tasks = await DBManager.getTasks(); let task = tasks.find(t => t._id === taskId);
        if (task) {
            let previousAssignee = task.assigneeId;
            if (isApproved) {
                task.assigneeId = task.transferRequest;
                showToast('تایید شد.');

                // ارسال نوتیفیکیشن به مسئول جدید
                if (task.assigneeId) {
                    NotificationManager.sendPush(task.assigneeId, {
                        title: '📌 ارجاع تسک جدید به شما',
                        body: `تسک "${task.title}" با تایید مدیر به شما ارجاع داده شد.`,
                        priority: 'high',
                        tags: ['pushpin', 'repeat'],
                        taskId: task._id
                    });
                }
            } else {
                showToast('رد شد.', 'error');
            }
            task.transferRequest = null; 
            task.viewedBy = [AuthManager.getCurrentUser().id];
            await DBManager.saveTask(task); renderDashboard();
        }
    };

    window.addEventListener('db_updated', async (e) => {
        await AuthManager.syncFromDB();
        let user = AuthManager.getCurrentUser();
        if (user) {
            let welcomeEl = document.getElementById('welcomeName');
            if (welcomeEl) welcomeEl.innerText = user.name;

            // بررسی هوشمند تغییرات جدید تسک‌ها و اعلام سیستمی با صدا و ویبره درون برنامه
            if (typeof NotificationManager !== 'undefined') {
                try {
                    let allTasks = await DBManager.getTasks();
                    NotificationManager.handleDatabaseSyncUpdate(allTasks, user);
                } catch (err) {}
            }
        }
        if (document.getElementById('dashboard-view').style.display !== 'none') renderDashboard();
        if (document.getElementById('settings-view').style.display !== 'none' && AuthManager.getCurrentUser()?.role === 'admin') {
            renderAdminUserList();
        }
    });
});
