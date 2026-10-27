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
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 100000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); opacity: 0; transition: opacity 0.2s ease;';
        
        const box = document.createElement('div');
        box.className = 'card';
        box.style.cssText = 'width: 90%; max-width: 400px; padding: 20px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); transform: translateY(20px); transition: transform 0.2s ease; text-align: right;';

        if(options.title) box.innerHTML += `<h3 style="margin-top: 0; color: var(--primary); font-size: 1.1rem; margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">${options.title}</h3>`;
        if(options.message) box.innerHTML += `<div style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 15px; line-height: 1.6;">${options.message}</div>`;

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
        btnCancel.className = 'btn btn-secondary';
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

        function close() {
            overlay.style.opacity = '0';
            box.style.transform = 'translateY(20px)';
            setTimeout(() => overlay.remove(), 200);
        }
    });
}

// ==========================================
// تزریق استایل و رنگ‌بندی یکپارچه مکاو
// ==========================================
function injectMecavUnifiedTheme() {
    // استایل‌ها اکنون به صورت استاندارد در css/style.css قرار دارند
}

function applyFontSize(sizeStr) {
    document.documentElement.style.fontSize = sizeStr;
    document.body.style.fontSize = sizeStr;
    localStorage.setItem('pm_font_size', sizeStr);
    document.querySelectorAll('.btn-font-size').forEach(btn => {
        btn.style.background = btn.dataset.size === sizeStr ? 'var(--primary)' : 'transparent';
        btn.style.color = btn.dataset.size === sizeStr ? (document.body.getAttribute('data-theme') === 'dark' ? '#0b1120' : '#ffffff') : 'var(--text-main)';
    });
}

function applyBrandingAndIcons() {
    injectMecavUnifiedTheme();
    document.title = "مدیریت پروژه مکاو";
    applyFontSize(localStorage.getItem('pm_font_size') || '15px');

    const iconUrl = "favicon.svg?v=1";

    document.querySelectorAll('h1, h2, h3, .header-title, header div, header span').forEach(el => {
        if (el.childNodes.length === 1 && el.innerText && (el.innerText.trim() === 'کارهای مکاو' || el.innerText.trim() === 'مدیریت پروژه مکاو')) {
            el.innerHTML = `<img src="${iconUrl}" style="width:24px; height:24px; border-radius:6px; vertical-align:middle; margin-left:6px; border: 1px solid rgba(255,255,255,0.12);" /><span style="font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: inline-block; max-width: 150px; vertical-align: middle;">مدیریت پروژه مکاو</span>`;
            el.style.display = 'inline-flex'; el.style.alignItems = 'center'; el.style.flexWrap = 'nowrap';
        }
    });

    const loginView = document.getElementById('login-view');
    if (loginView && !document.getElementById('mecavLoginLogo')) {
        const loginCard = loginView.querySelector('.card') || loginView.firstElementChild;
        if (loginCard) {
            const logoBox = document.createElement('div');
            logoBox.id = 'mecavLoginLogo';
            logoBox.style.cssText = 'text-align: center; margin-bottom: 14px;';
            logoBox.innerHTML = `<img src="${iconUrl}" style="width: 72px; height: 72px; border-radius: 18px; box-shadow: 0 6px 20px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);" />`;
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

function getUserColor(userId) {
    if (!userId) return '#94a3b8';
    if (userId === '100' || userId === 'admin') return '#f59e0b';
    const colors = ['#10b981', '#a855f7', '#ec4899', '#f43f5e', '#0ea5e9', '#8b5cf6', '#14b8a6'];
    let hash = 0;
    for (let i = 0; i < String(userId).length; i++) hash = String(userId).charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
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
            opt.innerHTML = `<span style="color: #10b981; font-weight: bold;">${item.text}</span>`;
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
                🎨 اندازه فونت برنامه
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-secondary btn-font-size" data-size="14px" style="flex: 1; border-radius: 12px;">کوچک (14)</button>
                <button class="btn btn-secondary btn-font-size" data-size="15px" style="flex: 1; border-radius: 12px;">متوسط (15)</button>
                <button class="btn btn-secondary btn-font-size" data-size="17px" style="flex: 1; border-radius: 12px;">بزرگ (17)</button>
            </div>
        `;
        settingsView.appendChild(fontPanel);

        document.querySelectorAll('.btn-font-size').forEach(btn => {
            btn.addEventListener('click', (e) => { applyFontSize(e.target.dataset.size); });
        });
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
        tagData.push({ text: '➕ ثبت تگ جدید...', value: 'ADD_NEW_TAG', canDelete: false });
        setupCustomSelect('taskTagSelectWrapper', tagData, 'تگ (اختیاری)...', async (tagId) => {
            await DBManager.deleteTag(tagId); showToast('تگ حذف شد.'); window.reloadTagsInDropdown(user);
        }, user);
    };

    window.reloadProjectsInDropdown = async function(user) {
        let projects = await DBManager.getProjects(user.id);
        let projData = projects.filter(p => !p.isArchived).map(p => ({ 
            text: p.title, value: p._id, rawId: p._id, canDelete: (p.creatorId === user.id || user.role === 'admin') 
        }));
        projData.push({ text: '➕ ثبت پروژه جدید...', value: 'ADD_NEW_PROJECT', canDelete: false });
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
        });
    }

    const imageViewer = document.getElementById('imageViewer');
    const viewerImage = document.getElementById('viewerImage');
    if(document.getElementById('btnCloseViewer')) {
        document.getElementById('btnCloseViewer').onclick = () => imageViewer.classList.remove('active');
    }
    window.openImage = (src) => { viewerImage.src = src; imageViewer.classList.add('active'); };

    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const btnLogin = document.getElementById('btnLogin');
    const fabAdd = document.getElementById('fabAdd');
    let currentOpenedTask = null;
    let pendingReportImage = null;
    let pendingCommentImage = null;

    setupSettingsUI();

    function checkLoginStatus() {
        let user = AuthManager.getCurrentUser();
        [loginView, dashboardView, document.getElementById('settings-view'), document.getElementById('headerActions'), document.getElementById('admin-settings-section'), fabAdd].forEach(el => {
            if(el) el.style.display = 'none';
        });
        if (user) {
            dashboardView.style.display = 'block'; document.getElementById('headerActions').style.display = 'flex';
            document.getElementById('welcomeName').innerText = user.name; fabAdd.style.display = 'flex';
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.startListening(user.id);
                NotificationManager.initInAppNotifs();
                NotificationManager.requestSystemPermission();
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
                renderAdminUserList(); 
            }
            renderDashboard();
        } else { 
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.stopListening();
            }
            loginView.style.display = 'block'; 
        }
    }

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
    
    const btnSettingsEl = document.getElementById('btnSettings');
    if(btnSettingsEl) {
        btnSettingsEl.addEventListener('click', () => { 
            dashboardView.style.display = 'none'; 
            document.getElementById('settings-view').style.display = 'block'; 
            updateBackupStatsText();
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

        let newTask = {
            projectId: projectId, title: title, assigneeId: assigneeId, finalizerId: finalizerId,
            creatorId: user.id, tag: tag, status: 'pending', transferRequest: null, activities: [],
            isImportant: isImportant, deadlineTimestamp: parsedDL.timestamp, deadlineLabel: parsedDL.label,
            isPublic: isPublic, observers: selectedObservers,
            viewedBy: [user.id] // سازنده خودش تسک رو همون لحظه دیده
        };
        
        try {
            await DBManager.saveTask(newTask);

            // ارسال نوتیفیکیشن سیستمی به مسئول تسک
            if (newTask.assigneeId && String(newTask.assigneeId) !== String(user.id)) {
                NotificationManager.sendPush(newTask.assigneeId, {
                    title: '📌 تسک جدید برای شما',
                    body: `تسک "${newTask.title}" توسط ${user.name} به شما ارجاع شد.`,
                    priority: newTask.isImportant ? 'urgent' : 'high',
                    tags: ['pushpin', newTask.isImportant ? 'warning' : 'memo']
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
                        tags: ['eyes', 'pushpin']
                    });
                }
            }

            document.getElementById('taskTitle').value = ''; 
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

    function findUserName(id) {
        if (id === 'admin' || id === '100') { let adm = AuthManager.usersList.find(u => u.id === '100' || u.id === 'admin'); return adm ? adm.name : 'مدیر سیستم'; }
        return AuthManager.usersList.find(u => u.id === id)?.name || id;
    }

    function isSameUser(id1, id2) { return ((id1 === '100' || id1 === 'admin') && (id2 === '100' || id2 === 'admin')) || id1 === id2; }

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
        
        let myTasks = currentUser.role === 'admin' ? allTasks : allTasks.filter(t => isSameUser(t.assigneeId, currentUser.id) || isSameUser(t.finalizerId, currentUser.id) || isSameUser(t.creatorId, currentUser.id) || t.isPublic || (t.observers && t.observers.includes(currentUser.id)));

        if (searchTerm) {
            myTasks = myTasks.filter(t => {
                let assigneeName = findUserName(t.assigneeId).toLowerCase();
                return t.title.toLowerCase().includes(searchTerm) || (t.tag && t.tag.toLowerCase().includes(searchTerm)) || assigneeName.includes(searchTerm);
            });
        }
            
        let filteredProjects = allProjects.filter(p => Boolean(p.isArchived) === Boolean(showArchived));
        let myProjects = filteredProjects.filter(p => myTasks.some(t => t.projectId === p._id) || currentUser.role === 'admin');
        
        if (myProjects.length === 0) { 
            container.innerHTML = searchTerm ? '<div class="card">تسکی با این جستجو یافت نشد.</div>' : '<div class="card">پروژه فعالی وجود ندارد.</div>'; 
            return; 
        }

        let collapsedList = getCollapsedProjects();

        myProjects.forEach(proj => {
            let projTasks = myTasks.filter(t => t.projectId === proj._id);
            if (searchTerm && projTasks.length === 0) return;

            projTasks.sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed') return 1;
                if (a.status !== 'completed' && b.status === 'completed') return -1;
                let aOver = isTaskOverdue(a) ? 1 : 0; let bOver = isTaskOverdue(b) ? 1 : 0;
                if (aOver !== bOver) return bOver - aOver;
                return (b.isImportant ? 1 : 0) - (a.isImportant ? 1 : 0);
            });

            let btnArchive = (currentUser.role === 'admin' && !showArchived) ? `<button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); window.archiveProject('${proj._id}')" style="padding:4px 10px; font-size:0.8rem;">بستن و آرشیو</button>` : '';
            
            let isCollapsed = searchTerm ? false : collapsedList.includes(proj._id);

            let projHTML = `<div class="project-group">
                <div class="project-header" onclick="toggleProject(this, '${proj._id}')">
                    <div style="display:flex; align-items:center;">
                        <span class="project-collapse-arrow" style="display:inline-block; font-size:0.75rem; margin-left:8px; color:var(--text-muted);">${isCollapsed ? '◀' : '▼'}</span>
                        <button class="btn-quick-add" onclick="event.stopPropagation(); window.quickAddTask('${proj._id}', '${proj.title}')" title="افزودن تسک به این پروژه">➕</button>
                        📁 ${proj.title} <span style="font-size:0.8rem; color: #38bdf8; margin-right:5px;">(${projTasks.length})</span>
                    </div>
                    ${btnArchive}
                </div>
                <div class="project-tasks-container ${isCollapsed ? 'collapsed' : ''}">`;
            
            projTasks.forEach(t => {
                let overdue = isTaskOverdue(t);
                let isUnread = !t.viewedBy || !t.viewedBy.includes(currentUser.id);

                let cardClasses = 'task-card';
                if (t.status === 'completed') {
                    cardClasses += ' task-done';
                } else {
                    if (isUnread) cardClasses += ' task-unread';
                    if (overdue) cardClasses += ' task-overdue';
                    else if (t.isImportant) cardClasses += ' task-important';
                }

                let statusTxt = t.status === 'completed' ? '✅' : (t.status === 'pending_approval' ? '⏳' : (overdue ? '🚨' : '🔥'));
                
                let badgesHTML = '';
                if (t.tag) badgesHTML += `<span class="tag">${t.tag}</span>`;
                if (t.isImportant) badgesHTML += `<span class="badge-important">⭐ مهم</span>`;
                if (t.deadlineLabel) badgesHTML += `<span class="badge-deadline ${overdue ? 'overdue' : ''}">📅 ${t.deadlineLabel}</span>`;

                let lastReport = t.activities ? t.activities.filter(a => a.type === 'report').pop() : null;
                let lastComment = t.activities ? t.activities.filter(a => a.type === 'comment').pop() : null;
                let activitySnippet = '';
                if (lastReport) activitySnippet += `<div style="margin-bottom: 4px; border-right: 3px solid #10b981; padding-right: 6px;"><b style="color:#10b981;">آخرین گزارش:</b> ${lastReport.text.substring(0, 45)}${lastReport.text.length > 45 ? '...' : ''}</div>`;
                if (lastComment) activitySnippet += `<div style="border-right: 3px solid var(--primary); padding-right: 6px;"><b style="color:var(--primary);">نظر ${lastComment.userName}:</b> ${lastComment.text.substring(0, 45)}${lastComment.text.length > 45 ? '...' : ''}</div>`;
                if (!activitySnippet) activitySnippet = '<div style="opacity: 0.5;">گزارش یا نظری ثبت نشده...</div>';

                projHTML += `
                    <div class="${cardClasses}" onclick="window.openTaskById('${t._id}')">
                        <div class="task-card-inner">
                            <div class="task-card-title">
                                <h3>${statusTxt} ${t.title}</h3>
                                ${badgesHTML ? `<div style="display: flex; gap: 5px; flex-wrap: wrap; margin-top: 6px;">${badgesHTML}</div>` : ''}
                            </div>
                            <div class="task-latest-activity">${activitySnippet}</div>
                            <div class="task-card-meta">
                                <div style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap;">👤 ${findUserName(t.assigneeId)}</div>
                            </div>
                        </div>
                    </div>`;
            });
            projHTML += `</div></div>`;
            container.innerHTML += projHTML;
        });
    }

    window.archiveProject = async function(id) {
        let isConfirmed = await showCustomModal({ title: 'آرشیو پروژه', message: 'پروژه به آرشیو منتقل شود؟', type: 'confirm' });
        if(isConfirmed) {
            let p = (await DBManager.getProjects()).find(x => x._id === id);
            if (p) { p.isArchived = true; await DBManager.saveProject(p); renderDashboard(); }
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

    window.openTaskById = async function(taskId) {
        let tasks = await DBManager.getTasks(); let task = tasks.find(t => t._id === taskId);
        if(task) {
            let user = AuthManager.getCurrentUser();
            if (!task.viewedBy) task.viewedBy = [];
            // اگر کاربر تسک را ندیده، نشان جدید را خاموش کن و در دیتابیس ذخیره کن
            if (!task.viewedBy.includes(user.id)) {
                task.viewedBy.push(user.id);
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

    window.clearReportImage = function() { pendingReportImage = null; document.getElementById('reportAttachmentPreview').innerHTML = ''; document.getElementById('reportImageInput').value = ''; };
    window.clearCommentImage = function() { pendingCommentImage = null; document.getElementById('commentAttachmentPreview').innerHTML = ''; document.getElementById('commentImageInput').value = ''; };

    function openTaskDetail(task) {
        currentOpenedTask = task;
        let user = AuthManager.getCurrentUser();
        let overdue = isTaskOverdue(task);
        let canDelete = user.role === 'admin' || isSameUser(task.creatorId, user.id);
        
        document.getElementById('td-title').innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <span style="flex: 1; line-height: 1.4;">${task.title}</span>
                <div style="display: flex; gap: 5px;">
                    ${canDelete ? `<button onclick="event.stopPropagation(); window.editTaskTitle()" class="btn btn-small btn-secondary" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 8px;">✏️ ویرایش</button>` : ''}
                    ${canDelete ? `<button onclick="event.stopPropagation(); window.deleteCurrentTask()" class="btn btn-small" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 4px 10px; font-size: 0.75rem; border-radius: 8px;">🗑️ حذف</button>` : ''}
                </div>
            </div>
        `;

        let statStr = task.status === 'completed' ? '✅ تکمیل شده' : (task.status === 'pending_approval' ? '⏳ منتظر تایید مدیر' : '🔥 در حال انجام');
        if (overdue) statStr += ` <span class="badge-deadline overdue" style="margin-right:6px;">🚨 موعد رسیده (${task.deadlineLabel})</span>`;
        else if (task.deadlineLabel) statStr += ` <span class="badge-deadline" style="margin-right:6px;">📅 مهلت: ${task.deadlineLabel}</span>`;
        
        statStr += ` <button onclick="window.toggleTaskImportance()" class="btn btn-small btn-secondary" style="padding: 2px 8px; font-size: 0.75rem; margin-right: 6px; border-color: ${task.isImportant ? '#f59e0b' : 'transparent'}; color: ${task.isImportant ? '#fbbf24' : '#94a3b8'};">
            ${task.isImportant ? '⭐ مهم (فعال)' : '☆ علامت به عنوان مهم'}
        </button>`;

        document.getElementById('td-status').innerHTML = statStr;
        document.getElementById('td-assignee').innerText = findUserName(task.assigneeId);

        const reportsBox = document.getElementById('td-official-reports');
        const commentsBox = document.getElementById('td-comments-list');
        reportsBox.innerHTML = ''; commentsBox.innerHTML = '';
        
        if(task.activities) {
            task.activities.forEach(a => {
                let date = new Date(a.timestamp).toLocaleDateString('fa-IR', { hour: '2-digit', minute:'2-digit' });
                let text = a.text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:var(--accent)">$1</a>');
                let imgHTML = a.image ? `<img src="${a.image}" class="clickable-image" onclick="window.openImage('${a.image}')" style="max-width:100%; border-radius:8px; margin-top:8px;"/>` : '';

                let isMine = isSameUser(a.userId, user.id);
                let uColor = getUserColor(a.userId);
                let delBtn = user.role === 'admin' ? `<span style="cursor:pointer; color:var(--danger); padding: 0 4px;" title="حذف این پیام" onclick="window.deleteActivity(${a.id})">🗑️</span>` : '';

                if(a.type === 'report') {
                    reportsBox.innerHTML += `<div class="report-item"><div class="msg-meta" style="color: #10b981;"><span>گزارش: ${a.userName}</span><div><span style="font-weight:normal; opacity:0.7;">${date}</span>${delBtn}</div></div><div>${text}</div>${imgHTML}</div>`;
                } else {
                    if (isMine) {
                        commentsBox.innerHTML += `
                        <div class="chat-msg msg-mine">
                            <div class="msg-meta" style="color: #38bdf8;"><span>شما</span><div><span style="font-weight:normal; opacity:0.7;">${date}</span>${delBtn}</div></div>
                            <div>${text}</div>${imgHTML}
                        </div>`;
                    } else {
                        commentsBox.innerHTML += `
                        <div class="chat-msg msg-other" style="--user-color: ${uColor}; border-left-color: ${uColor};">
                            <div class="msg-meta" style="color: ${uColor};"><span>${a.userName}</span><div><span style="font-weight:normal; opacity:0.7;">${date}</span>${delBtn}</div></div>
                            <div>${text}</div>${imgHTML}
                        </div>`;
                    }
                }
            });
        }
        if(reportsBox.innerHTML === '') reportsBox.innerHTML = '<div style="font-size:0.85rem; color:var(--text-muted); text-align:center;">گزارشی ثبت نشده.</div>';
        if(commentsBox.innerHTML === '') commentsBox.innerHTML = '<div style="font-size:0.85rem; color:var(--text-muted); text-align:center;">هیچ پیامی نیست.</div>';

        let reportForm = document.getElementById('td-report-form');
        let commentForm = document.getElementById('td-comment-form');
        let transferSec = document.getElementById('transferSection');

        let isMainActor = isSameUser(task.assigneeId, user.id) || isSameUser(task.finalizerId, user.id) || isSameUser(task.creatorId, user.id) || user.role === 'admin';
        let infoNotice = document.getElementById('observerNoticeBox');

        if (task.status === 'completed') {
            reportForm.style.display = 'none'; 
            commentForm.style.display = user.role === 'admin' ? 'block' : 'none'; 
            transferSec.style.display = 'none';
            if (infoNotice) infoNotice.remove();
        } else if (task.status === 'pending_approval') {
            reportForm.style.display = 'none'; 
            commentForm.style.display = 'block'; 
            transferSec.style.display = 'none';
            if(isSameUser(task.finalizerId, user.id) || user.role === 'admin') {
                reportForm.style.display = 'block';
                reportForm.innerHTML = `<button class="btn btn-success" onclick="window.approveTask()">✅ تایید گزارش و بستن پرونده</button>
                                        <button class="btn btn-secondary" onclick="window.rejectTask()">❌ رد گزارش و بازگشت به مسئول</button>`;
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
                    reportForm.innerHTML = `<div style="font-size:0.85rem; color:var(--success); margin-bottom:8px;">ثبت گزارش رسمی کار:</div>
                    <input type="file" id="reportImageInput" accept="image/*" style="display: none;" />
                    <div id="reportAttachmentPreview" style="margin-bottom: 8px;"></div>
                    <textarea id="td-new-report" placeholder="گزارش کار..." style="min-height: 60px; margin-bottom: 8px;"></textarea>
                    <div style="display: flex; gap: 8px;"><button id="btnAttachReportImg" class="btn btn-secondary" style="width: 45px;">📷</button><button id="btnSubmitReport" class="btn btn-primary">ثبت گزارش در پرونده</button></div>
                    <button id="btnSubmitFinal" class="btn btn-success" style="margin-top: 8px;">اتمام کار و ارسال برای تایید مدیر</button>`;
                    
                    document.getElementById('btnAttachReportImg').onclick = () => document.getElementById('reportImageInput').click();
                    document.getElementById('reportImageInput').onchange = (e) => {
                        if(e.target.files[0]) compressImageToBase64(e.target.files[0], (b64) => { 
                            pendingReportImage = b64; 
                            document.getElementById('reportAttachmentPreview').innerHTML = `<div style="position:relative; display:inline-block;"><img src="${b64}" class="clickable-image" style="margin:0;"/><span class="remove-attachment-btn" onclick="window.clearReportImage()">✕</span></div>`; 
                        });
                    };
                    document.getElementById('btnSubmitReport').onclick = () => saveActivity('report', false);
                    document.getElementById('btnSubmitFinal').onclick = () => saveActivity('report', true);
                } else { reportForm.style.display = 'none'; }
            }

            if (isSameUser(task.assigneeId, user.id) && !task.transferRequest) {
                transferSec.style.display = 'block';
                let usersData = AuthManager.usersList.filter(u => !isSameUser(u.id, user.id)).map(u => ({ text: u.name, value: u.id }));
                setupCustomSelect('transferUserSelectWrapper', usersData, 'شخص جدید...');
            } else { transferSec.style.display = 'none'; }
        }

        pendingCommentImage = null; document.getElementById('commentAttachmentPreview').innerHTML = '';
        document.getElementById('btnAttachCommentImg').onclick = () => document.getElementById('commentImageInput').click();
        document.getElementById('commentImageInput').onchange = (e) => {
            if(e.target.files[0]) compressImageToBase64(e.target.files[0], (b64) => { 
                pendingCommentImage = b64; 
                document.getElementById('commentAttachmentPreview').innerHTML = `<div style="position:relative; display:inline-block;"><img src="${b64}" class="clickable-image" style="margin:0;"/><span class="remove-attachment-btn" onclick="window.clearCommentImage()">✕</span></div>`; 
            });
        };
        document.getElementById('btnSubmitComment').onclick = () => saveActivity('comment', false);

        document.getElementById('taskDetailModal').classList.add('active');
    }
    
    document.getElementById('btnCloseTaskDetail').addEventListener('click', () => document.getElementById('taskDetailModal').classList.remove('active'));

    async function saveActivity(type, isFinal) {
        let textId = type === 'report' ? 'td-new-report' : 'td-new-comment';
        let textEl = document.getElementById(textId);
        let text = textEl ? textEl.value.trim() : '';
        let image = type === 'report' ? pendingReportImage : pendingCommentImage;
        
        if(!text && !image) return showToast('محتوایی وارد نکردید.', 'error');

        let user = AuthManager.getCurrentUser();
        if(!currentOpenedTask.activities) currentOpenedTask.activities = [];
        currentOpenedTask.activities.push({ id: Date.now(), userId: user.id, userName: user.name, text: text, image: image, type: type, timestamp: Date.now() });
        
        if(isFinal) {
            currentOpenedTask.status = 'pending_approval';
            
            // ارسال نوتیفیکیشن تایید نهایی برای مدیر یا تاییدکننده
            const finalizerTarget = currentOpenedTask.finalizerId || 'admin';
            NotificationManager.sendPush(finalizerTarget, {
                title: '📋 تسک منتظر تایید نهایی',
                body: `تسک "${currentOpenedTask.title}" توسط ${user.name} تکمیل شد و منتظر تایید نهایی است.`,
                priority: 'high',
                tags: ['clipboard', 'hourglass_flowing_sand']
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
                const preview = text ? (text.length > 70 ? text.substring(0, 70) + '...' : text) : 'تصویر ارسال شد';
                NotificationManager.sendPush(recipients, {
                    title: isReport ? `📝 گزارش جدید در "${currentOpenedTask.title}"` : `💬 نظر جدید در "${currentOpenedTask.title}"`,
                    body: `${user.name}: ${preview}`,
                    priority: 'default',
                    tags: isReport ? ['memo'] : ['speech_balloon']
                });
            }
        }
        
        // وقتی پیامی ثبت می‌شود، نشان خوانده شده فقط برای شخص پیام‌دهنده تنظیم می‌شود تا برای بقیه دوباره «جدید» شود
        currentOpenedTask.viewedBy = [user.id];

        await DBManager.saveTask(currentOpenedTask);
        if(type === 'report') pendingReportImage = null; else pendingCommentImage = null;
        if(textEl) textEl.value = '';
        openTaskDetail(currentOpenedTask); renderDashboard();
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
                tags: ['white_check_mark', 'tada']
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
                tags: ['warning', 'recycle']
            });
        }

        showToast('به مسئول برگشت داده شد.', 'error'); openTaskDetail(currentOpenedTask); renderDashboard();
    };

    document.getElementById('btnRequestTransfer').addEventListener('click', async () => {
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
            tags: ['repeat']
        });

        showToast('درخواست ارسال شد.'); document.getElementById('taskDetailModal').classList.remove('active'); renderDashboard();
    });

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
                        tags: ['pushpin', 'repeat']
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
