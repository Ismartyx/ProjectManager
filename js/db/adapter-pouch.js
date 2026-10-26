const PouchAdapter = {
    localDB: null,
    remoteDB: null,
    syncHandler: null,
    isOnline: false,
    // وعده‌ای که وقتی اولین سینک اولیه از سرور کامل شد resolve می‌شود
    _initialSyncPromise: null,
    _initialSyncResolve: null,

    getServerUrl: function() {
        return localStorage.getItem('pm_server_url') || 'http://192.168.1.106:5984/mecav_db_main';
    },

    setServerUrl: function(newUrl) {
        if (!newUrl) return;
        newUrl = newUrl.trim().replace(/\/+$/, '');
        // اگر کاربر فقط آدرس سرور داد و نام دیتابیس را ننوشت، نام پیش‌فرض را اضافه کن
        if (!newUrl.endsWith('/mecav_db_main') && !newUrl.endsWith('/mecav_db')) {
            newUrl = newUrl + '/mecav_db_main';
        }
        localStorage.setItem('pm_server_url', newUrl);
        return newUrl;
    },

    init: function() {
        this.localDB = new PouchDB('mecav_db_main');

        // آدرس سرور (از تنظیمات یا پیش‌فرض)
        const serverUrl = this.getServerUrl();
        
        // احراز هویت استاندارد PouchDB (جلوگیری از خطای مرورگر)
        this.remoteDB = new PouchDB(serverUrl, { 
            skipSetup: true,
            auth: {
                username: 'admin',
                password: '33995333Sma' // 🔴 رمز عبور واقعی ادمین CouchDB
            }
        });

        // ساخت یک Promise که به محض پایان اولین pull از سرور، resolve می‌شود
        this._initialSyncPromise = new Promise((resolve) => {
            this._initialSyncResolve = resolve;
        });

        this.checkConnection();

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateStatusUI(false);
        });
        window.addEventListener('online', () => {
            this.checkConnection();
        });

        setInterval(() => {
            this.checkConnection();
        }, 3500);
    },

    // صبر می‌کند تا اولین دریافت داده از سرور کامل شود (حداکثر maxMs میلی‌ثانیه)
    waitForInitialSync: function(maxMs = 8000) {
        return Promise.race([
            this._initialSyncPromise,
            new Promise((resolve) => setTimeout(resolve, maxMs))
        ]);
    },

    updateStatusUI: function(online) {
        const statusEl = document.getElementById('connection-status');
        if (!statusEl) return;

        if (online) {
            statusEl.style.background = '#10b981';
            statusEl.style.color = '#fff';
            statusEl.innerText = '🟢 متصل به سرور کارگاه (آنلاین)';
        } else {
            statusEl.style.background = '#ef4444';
            statusEl.style.color = '#fff';
            statusEl.innerText = '🔴 آفلاین (ذخیره در حافظه دستگاه)';
        }
    },

    checkConnection: function() {
        if (!navigator.onLine) {
            this.isOnline = false;
            this.updateStatusUI(false);
            // اگر آفلاین هستیم، سینک اولیه را resolve می‌کنیم تا صفحه ورود منتظر نماند
            if (this._initialSyncResolve) { this._initialSyncResolve(); this._initialSyncResolve = null; }
            return;
        }

        this.remoteDB.info()
            .then(() => {
                if (!this.isOnline) {
                    this.isOnline = true;
                    this.updateStatusUI(true);
                    this.startSync();
                } else {
                    this.updateStatusUI(true);
                }
            })
            .catch((err) => {
                console.error("خطای اتصال به سرور:", err);
                this.isOnline = false;
                this.updateStatusUI(false);
                // اگر سرور در دسترس نیست، سینک اولیه را resolve می‌کنیم تا صفحه ورود منتظر نماند
                if (this._initialSyncResolve) { this._initialSyncResolve(); this._initialSyncResolve = null; }
            });
    },

    startSync: function() {
        if (this.syncHandler) {
            try { this.syncHandler.cancel(); } catch (e) {}
        }

        // اولین pull کامل از سرور - وقتی تمام شد، Promise را resolve می‌کنیم
        this.localDB.replicate.from(this.remoteDB)
            .on('complete', () => {
                window.dispatchEvent(new CustomEvent('db_updated', { detail: { source: 'server_sync' } }));
                // اعلام پایان سینک اولیه
                if (this._initialSyncResolve) { this._initialSyncResolve(); this._initialSyncResolve = null; }
            })
            .on('error', () => {
                // حتی در صورت خطا، Promise را resolve می‌کنیم تا ورود block نشود
                if (this._initialSyncResolve) { this._initialSyncResolve(); this._initialSyncResolve = null; }
            });

        this.syncHandler = this.localDB.sync(this.remoteDB, {
            live: true,
            retry: true
        }).on('change', (info) => {
            window.dispatchEvent(new CustomEvent('db_updated', { detail: { source: 'live_sync', info: info } }));
        }).on('error', (err) => {
            console.error("خطای سینک:", err);
            this.isOnline = false;
            this.updateStatusUI(false);
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