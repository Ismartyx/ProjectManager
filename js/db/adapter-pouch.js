const PouchAdapter = {
    localDB: null,
    remoteDB: null,
    syncHandler: null,
    isOnline: false,
    activeMode: 'offline', // 'local' | 'online' | 'offline'
    activeUrl: null,
    _isChecking: false,
    // وعده‌ای که وقتی اولین سینک اولیه از سرور کامل شد resolve می‌شود
    _initialSyncPromise: null,
    _initialSyncResolve: null,

    // آدرس سرور محلی کارگاه (پیش‌فرض سیستم کارگاه)
    getLocalUrl: function() {
        return localStorage.getItem('pm_server_url_local') || localStorage.getItem('pm_server_url') || 'http://192.168.1.106:5984/mecav_db_main';
    },

    setLocalUrl: function(newUrl) {
        if (!newUrl) return '';
        newUrl = newUrl.trim().replace(/\/+$/, '');
        if (!newUrl.endsWith('/mecav_db_main') && !newUrl.endsWith('/mecav_db')) {
            newUrl = newUrl + '/mecav_db_main';
        }
        localStorage.setItem('pm_server_url_local', newUrl);
        localStorage.setItem('pm_server_url', newUrl); // حفظ سازگاری قبلی
        return newUrl;
    },

    // آدرس سرور آنلاین (سرور مجازی اینترنتی VPS)
    getOnlineUrl: function() {
        return localStorage.getItem('pm_server_url_online') || 'http://155.117.234.69:5984/mecav_db_main';
    },

    setOnlineUrl: function(newUrl) {
        if (!newUrl) {
            localStorage.removeItem('pm_server_url_online');
            return '';
        }
        newUrl = newUrl.trim().replace(/\/+$/, '');
        if (!newUrl.endsWith('/mecav_db_main') && !newUrl.endsWith('/mecav_db')) {
            newUrl = newUrl + '/mecav_db_main';
        }
        localStorage.setItem('pm_server_url_online', newUrl);
        return newUrl;
    },

    // برای سازگاری با کدهای قبلی
    getServerUrl: function() {
        return this.activeUrl || this.getLocalUrl();
    },

    setServerUrl: function(newUrl) {
        return this.setLocalUrl(newUrl);
    },

    init: function() {
        this.localDB = new PouchDB('mecav_db_main');

        // ساخت یک Promise که به محض پایان اولین pull از سرور، resolve می‌شود
        this._initialSyncPromise = new Promise((resolve) => {
            this._initialSyncResolve = resolve;
        });

        this.checkConnection();

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.activeMode = 'offline';
            this.updateStatusUI('offline');
        });
        window.addEventListener('online', () => {
            this.checkConnection();
        });

        // بررسی دوره‌ای اتصال به سرور محلی و آنلاین
        setInterval(() => {
            this.checkConnection();
        }, 4000);
    },

    // تست دسترسی سریع به یک آدرس با سقف زمانی مشخص
    testServer: function(url, timeoutMs = 2000) {
        if (!url) return Promise.reject(new Error("آدرسی مشخص نشده است."));
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        return fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + btoa('admin:33995333Sma')
            },
            signal: controller.signal
        }).then(res => {
            clearTimeout(timer);
            if (res.ok || res.status === 401 || res.status === 200) {
                return true;
            }
            throw new Error('پاسخ سرور: ' + res.status);
        }).catch(err => {
            clearTimeout(timer);
            throw err;
        });
    },

    // صبر می‌کند تا اولین دریافت داده از سرور کامل شود (حداکثر maxMs میلی‌ثانیه)
    waitForInitialSync: function(maxMs = 8000) {
        return Promise.race([
            this._initialSyncPromise,
            new Promise((resolve) => setTimeout(resolve, maxMs))
        ]);
    },

    updateStatusUI: function(mode) {
        const statusEl = document.getElementById('connection-status');
        if (!statusEl) return;

        if (mode === 'local') {
            statusEl.style.background = '#10b981';
            statusEl.style.color = '#fff';
            statusEl.innerText = '🟢 متصل به سرور محلی کارگاه (شبکه داخلی)';
        } else if (mode === 'online') {
            statusEl.style.background = '#0284c7';
            statusEl.style.color = '#fff';
            statusEl.innerText = '🌐 متصل به سرور آنلاین (اینترنت)';
        } else {
            statusEl.style.background = '#ef4444';
            statusEl.style.color = '#fff';
            statusEl.innerText = '🔴 آفلاین (ذخیره در حافظه دستگاه)';
        }
    },

    // بررسی هوشمند: اول سرور محلی کارگاه، در صورت عدم دسترسی سرور آنلاین VPS
    checkConnection: async function() {
        if (this._isChecking) return;
        this._isChecking = true;

        if (!navigator.onLine) {
            this.isOnline = false;
            this.activeMode = 'offline';
            this.updateStatusUI('offline');
            if (this._initialSyncResolve) { this._initialSyncResolve(); this._initialSyncResolve = null; }
            this._isChecking = false;
            return;
        }

        const localUrl = this.getLocalUrl();
        const onlineUrl = this.getOnlineUrl();

        let chosenUrl = null;
        let chosenMode = 'offline';

        // 1. بررسی سرور محلی کارگاه با تایم‌اوت کوتاه (۱.۵ ثانیه)
        try {
            await this.testServer(localUrl, 1500);
            chosenUrl = localUrl;
            chosenMode = 'local';
        } catch (localErr) {
            // سرور محلی کارگاه در دسترس نیست (کاربر خارج از کارگاه است)
            if (onlineUrl) {
                try {
                    await this.testServer(onlineUrl, 3000);
                    chosenUrl = onlineUrl;
                    chosenMode = 'online';
                } catch (onlineErr) {
                    chosenMode = 'offline';
                }
            } else {
                chosenMode = 'offline';
            }
        }

        if (chosenMode !== 'offline') {
            const serverChanged = this.activeUrl !== chosenUrl;
            this.activeUrl = chosenUrl;
            this.activeMode = chosenMode;
            this.isOnline = true;
            this.updateStatusUI(chosenMode);

            if (serverChanged || !this.remoteDB || !this.syncHandler) {
                this.remoteDB = new PouchDB(chosenUrl, {
                    skipSetup: true,
                    auth: {
                        username: 'admin',
                        password: '33995333Sma'
                    }
                });
                this.startSync();
            }
        } else {
            this.isOnline = false;
            this.activeMode = 'offline';
            this.updateStatusUI('offline');
            if (this._initialSyncResolve) { this._initialSyncResolve(); this._initialSyncResolve = null; }
        }

        this._isChecking = false;
    },

    startSync: function() {
        if (this.syncHandler) {
            try { this.syncHandler.cancel(); } catch (e) {}
        }

        if (!this.remoteDB) return;

        // اولین pull کامل از سرور فعال - وقتی تمام شد، Promise را resolve می‌کنیم
        this.localDB.replicate.from(this.remoteDB)
            .on('complete', () => {
                window.dispatchEvent(new CustomEvent('db_updated', { detail: { source: 'server_sync' } }));
                if (this._initialSyncResolve) { this._initialSyncResolve(); this._initialSyncResolve = null; }
            })
            .on('error', (err) => {
                console.warn("خطای دریافت اولیه از سرور:", err);
                if (this._initialSyncResolve) { this._initialSyncResolve(); this._initialSyncResolve = null; }
            });

        // همگام‌سازی دوطرفه زنده
        this.syncHandler = this.localDB.sync(this.remoteDB, {
            live: true,
            retry: true
        }).on('change', (info) => {
            window.dispatchEvent(new CustomEvent('db_updated', { detail: { source: 'live_sync', info: info } }));
        }).on('error', (err) => {
            console.error("خطای سینک:", err);
            // در صورت بروز خطای قطع اتصال، وضعیت بررسی می‌شود
            this.isOnline = false;
            this.activeMode = 'offline';
            this.updateStatusUI('offline');
        });
    },

    saveItem: async function(itemData) {
        try {
            if (!itemData._id) {
                const prefix = itemData.type ? itemData.type : 'doc';
                itemData._id = prefix + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            } else {
                try {
                    const existingDoc = await this.localDB.get(itemData._id);
                    itemData._rev = existingDoc._rev;
                } catch (err) {
                    delete itemData._rev;
                }
            }

            const response = await this.localDB.put(itemData);
            itemData._rev = response.rev;
            window.dispatchEvent(new CustomEvent('db_updated', { detail: { source: 'local_save' } }));
            return { id: response.id, rev: response.rev, ok: response.ok };
        } catch (error) {
            console.error('❌ خطا در ذخیره آیتم:', error);
            throw error;
        }
    },

    getItemsByType: async function(type) {
        try {
            let result = await this.localDB.allDocs({ include_docs: true });
            return result.rows
                .map(row => row.doc)
                .filter(doc => doc && doc.type === type);
        } catch (error) {
            return [];
        }
    },

    deleteItem: async function(id) {
        try {
            let doc = await this.localDB.get(id);
            let res = await this.localDB.remove(doc);
            window.dispatchEvent(new CustomEvent('db_updated', { detail: { source: 'local_delete' } }));
            return res;
        } catch (e) { 
            console.error("❌ خطا در حذف:", e); 
        }
    }
};
