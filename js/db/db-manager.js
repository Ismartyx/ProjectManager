const DBManager = {
    adapter: null,
    init: function() {
        this.adapter = PouchAdapter;
        this.adapter.init();
    },
    
    saveProject: function(titleOrProjectObj, creatorId, isGlobal = false) { 
        if (typeof titleOrProjectObj === 'object' && titleOrProjectObj !== null) {
            titleOrProjectObj.type = 'project';
            return this.adapter.saveItem(titleOrProjectObj);
        }
        let projData = { 
            type: 'project', 
            title: titleOrProjectObj, 
            creatorId: creatorId, 
            isGlobal: isGlobal, 
            isArchived: false 
        };
        return this.adapter.saveItem(projData); 
    },

    getProjects: async function(userId) { 
        let allProjs = await this.adapter.getItemsByType('project');
        if (!userId) return allProjs;
        let currentUser = (typeof AuthManager !== 'undefined' && AuthManager.getCurrentUser) ? AuthManager.getCurrentUser() : null;
        if (currentUser && (currentUser.role === 'admin' || currentUser.id === '100' || currentUser.id === 'admin')) {
            return allProjs;
        }
        return allProjs.filter(p => p.isGlobal || p.creatorId === userId || (userId === '100' && p.creatorId === 'admin') || !p.creatorId);
    },

    deleteProject: function(id) {
        return this.adapter.deleteItem(id);
    },

    saveTask: function(data) { 
        data.type = 'task'; 
        if (!data._id) {
            data.status = data.status || 'pending';
            data.activities = data.activities || []; 
            data.transferRequest = data.transferRequest || null;
        }
        return this.adapter.saveItem(data); 
    },

    getTasks: function() { 
        return this.adapter.getItemsByType('task'); 
    },

    saveTag: function(title, creatorId, isGlobal = false) {
        return this.adapter.saveItem({ type: 'tag', title: title, creatorId: creatorId, isGlobal: isGlobal });
    },

    getTags: async function(userId) {
        let allTags = await this.adapter.getItemsByType('tag');
        if (!userId) return allTags;
        return allTags.filter(t => t.isGlobal || t.creatorId === userId || (userId === '100' && t.creatorId === 'admin'));
    },

    deleteTag: function(id) {
        return this.adapter.deleteItem(id);
    },

    saveUsersToDB: async function(usersList) {
        return await this.adapter.saveItem({
            _id: 'system_users_list',
            type: 'users_sync',
            users: usersList,
            updatedAt: Date.now()
        });
    },

    getUsersFromDB: async function() {
        try {
            let docs = await this.adapter.getItemsByType('users_sync');
            let userDoc = docs.find(d => d._id === 'system_users_list');
            return userDoc ? userDoc.users : null;
        } catch (e) {
            return null;
        }
    },

    initDefaultTags: async function() {
        let existingTags = await this.adapter.getItemsByType('tag');
        if (existingTags.length === 0) {
            await this.saveTag("خرید / مالی", "100", true);
            await this.saveTag("فنی / ساخت", "100", true);
            await this.saveTag("بررسی / تایید", "100", true);
        }
    },

    saveAboutInfo: async function(infoData) {
        // ۱. ذخیره لوکال
        try {
            localStorage.setItem('pm_about_info', JSON.stringify(infoData));
        } catch (e) {}

        let doc = { _id: 'mecav_about_info', type: 'about_info', ...infoData, updatedAt: Date.now() };

        // ۲. ذخیره در دیتابیس محلی PouchDB
        try {
            if (this.adapter && this.adapter.localDB) {
                let existing = await this.adapter.localDB.get('mecav_about_info').catch(() => null);
                if (existing) doc._rev = existing._rev;
                await this.adapter.localDB.put(doc);
            }
        } catch (e) {
            console.warn('[DBManager] error saving about info to localDB:', e);
        }

        // ۳. ذخیره مستقیم و قطعی در سرور آنلاین کارگاه جهت ماندگاری دائمی
        try {
            const activeUrl = (this.adapter && this.adapter.activeUrl) ? this.adapter.activeUrl : 'http://155.117.234.69:5984/mecav_db_main';
            let remoteRes = await fetch(`${activeUrl}/mecav_about_info`, {
                headers: { 'Authorization': 'Basic ' + btoa('admin:33995333Sma') }
            });
            if (remoteRes.ok) {
                let remoteDoc = await remoteRes.json();
                doc._rev = remoteDoc._rev;
            } else {
                delete doc._rev;
            }
            await fetch(`${activeUrl}/mecav_about_info`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + btoa('admin:33995333Sma')
                },
                body: JSON.stringify(doc)
            });
        } catch (ex) {
            console.warn('[DBManager] error direct syncing about info to CouchDB:', ex);
        }
        return doc;
    },

    getAboutInfo: async function() {
        let info = null;
        // ۱. تلاش برای دریافت از دیتابیس لوکال
        try {
            if (this.adapter && this.adapter.localDB) {
                let doc = await this.adapter.localDB.get('mecav_about_info').catch(() => null);
                if (doc && (doc.title || doc.desc)) info = doc;
            }
        } catch (e) {}

        // ۲. اگر در لوکال نبود، دریافت مستقیم از سرور مرکزی CouchDB
        if (!info) {
            try {
                const activeUrl = (this.adapter && this.adapter.activeUrl) ? this.adapter.activeUrl : 'http://155.117.234.69:5984/mecav_db_main';
                let res = await fetch(`${activeUrl}/mecav_about_info?t=${Date.now()}`);
                if (res.ok) {
                    let remoteDoc = await res.json();
                    if (remoteDoc && (remoteDoc.title || remoteDoc.desc)) {
                        info = remoteDoc;
                        localStorage.setItem('pm_about_info', JSON.stringify(remoteDoc));
                        if (this.adapter && this.adapter.localDB) {
                            await this.adapter.localDB.put(remoteDoc).catch(() => {});
                        }
                    }
                }
            } catch (ex) {}
        }

        // ۳. بررسی حافظه ذخیره‌سازی محلی مرورگر
        if (!info) {
            try {
                const stored = localStorage.getItem('pm_about_info');
                if (stored) info = JSON.parse(stored);
            } catch (e) {}
        }

        return info || {
            title: 'مدیریت کارگاه مکاو',
            site: 'https://mechave.ir',
            desc: 'سامانه هوشمند مدیریت کارگاه مکاو جهت پایش پیشرفت پروژه‌ها، تخصیص وظایف، گزارش کار روزانه و نظارت کیفی.',
            phone: '',
            social: '@mechave'
        };
    },

    saveDigikalaSettings: async function(settingsData) {
        try {
            localStorage.setItem('pm_digikala_settings', JSON.stringify(settingsData));
        } catch (e) {}

        let doc = { _id: 'digikala_settings', type: 'digikala_settings', ...settingsData, updatedAt: Date.now() };

        try {
            if (this.adapter && this.adapter.localDB) {
                let existing = await this.adapter.localDB.get('digikala_settings').catch(() => null);
                if (existing) doc._rev = existing._rev;
                await this.adapter.localDB.put(doc);
            }
        } catch (e) {
            console.warn('[DBManager] error saving digikala settings to localDB:', e);
        }

        try {
            const activeUrl = (this.adapter && this.adapter.activeUrl) ? this.adapter.activeUrl : 'http://155.117.234.69:5984/mecav_db_main';
            let remoteRes = await fetch(`${activeUrl}/digikala_settings`, {
                headers: { 'Authorization': 'Basic ' + btoa('admin:33995333Sma') }
            });
            if (remoteRes.ok) {
                let remoteDoc = await remoteRes.json();
                doc._rev = remoteDoc._rev;
            } else {
                delete doc._rev;
            }
            await fetch(`${activeUrl}/digikala_settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + btoa('admin:33995333Sma')
                },
                body: JSON.stringify(doc)
            });
        } catch (ex) {
            console.warn('[DBManager] error direct syncing digikala settings to CouchDB:', ex);
        }
        return doc;
    },

    getDigikalaSettings: async function() {
        let settings = null;
        try {
            if (this.adapter && this.adapter.localDB) {
                let doc = await this.adapter.localDB.get('digikala_settings').catch(() => null);
                if (doc && doc.targetProjectId) settings = doc;
            }
        } catch (e) {}

        if (!settings) {
            try {
                const activeUrl = (this.adapter && this.adapter.activeUrl) ? this.adapter.activeUrl : 'http://155.117.234.69:5984/mecav_db_main';
                let res = await fetch(`${activeUrl}/digikala_settings?t=${Date.now()}`, {
                    headers: { 'Authorization': 'Basic ' + btoa('admin:33995333Sma') }
                });
                if (res.ok) {
                    let remoteDoc = await res.json();
                    if (remoteDoc && remoteDoc.targetProjectId) {
                        settings = remoteDoc;
                        localStorage.setItem('pm_digikala_settings', JSON.stringify(remoteDoc));
                        if (this.adapter && this.adapter.localDB) {
                            await this.adapter.localDB.put(remoteDoc).catch(() => {});
                        }
                    }
                }
            } catch (ex) {}
        }

        if (!settings) {
            try {
                const stored = localStorage.getItem('pm_digikala_settings');
                if (stored) settings = JSON.parse(stored);
            } catch (e) {}
        }

        return settings || {
            targetProjectId: 'project_1792433538439_z9a5e',
            targetProjectTitle: 'فروش',
            assigneeId: '100',
            finalizerId: '100',
            observers: ['100'],
            isImportant: true,
            tag: 'فروش / دیجی‌کالا'
        };
    }
};
