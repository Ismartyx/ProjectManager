const AuthManager = {
    currentUser: null,
    usersList: [],

    init: function() {
        let stored = localStorage.getItem('pm_users_db');
        if (stored) {
            this.usersList = JSON.parse(stored);
            this.ensureNumericAdmin();
        } else {
            // در اولین اجرای برنامه روی یک دستگاه جدید، هیچ کاربری (حتی ادمین پیش‌فرض) وجود ندارد
            // تا کاربر مجبور باشد برای بار اول به سرور کارگاه وصل شود و لیست واقعی را بگیرد
            this.usersList = [];
        }
    },

    ensureNumericAdmin: function() {
        if (this.usersList.length === 0) return;
        let oldAdmin = this.usersList.find(u => u.id === 'admin');
        let numAdmin = this.usersList.find(u => u.id === '100');
        
        if (oldAdmin && !numAdmin) {
            oldAdmin.id = '100';
            if (oldAdmin.pin === 'admin') oldAdmin.pin = '100';
        }
    },

    saveUsers: function() {
        if (this.usersList.length === 0) return;
        this.ensureNumericAdmin();
        localStorage.setItem('pm_users_db', JSON.stringify(this.usersList));
        if (typeof DBManager !== 'undefined' && DBManager.saveUsersToDB) {
            DBManager.saveUsersToDB(this.usersList);
        }
    },

    fetchUsersDirectlyFromServer: async function() {
        if (typeof PouchAdapter === 'undefined') return null;
        const urlsToTry = (window.location.protocol === 'https:')
            ? [PouchAdapter.getOnlineUrl()]
            : [PouchAdapter.getLocalUrl(), PouchAdapter.getOnlineUrl()].filter(Boolean);

        const fetchOne = async (base) => {
            const endpoint = base.replace(/\/+$/, '') + '/system_users_list';
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3000);
            try {
                const res = await fetch(endpoint, {
                    headers: { 'Authorization': 'Basic ' + btoa('admin:33995333Sma') },
                    signal: controller.signal
                });
                clearTimeout(timer);
                if (res.ok) {
                    const doc = await res.json();
                    if (doc && doc.users && Array.isArray(doc.users) && doc.users.length > 0) {
                        return doc.users;
                    }
                }
            } catch (e) {
                clearTimeout(timer);
            }
            throw new Error('Failed to fetch from ' + base);
        };

        try {
            return await Promise.any(urlsToTry.map(fetchOne));
        } catch (e) {
            return null;
        }
    },

    syncFromDB: async function() {
        if (typeof DBManager !== 'undefined' && DBManager.getUsersFromDB) {
            let dbUsers = await DBManager.getUsersFromDB();
            if (dbUsers && dbUsers.length > 0) {
                this.usersList = dbUsers;
                this.ensureNumericAdmin();
                localStorage.setItem('pm_users_db', JSON.stringify(this.usersList));
                this.refreshCurrentUserFromList();
                return;
            }
        }

        let directUsers = await this.fetchUsersDirectlyFromServer();
        if (directUsers && directUsers.length > 0) {
            this.usersList = directUsers;
            this.ensureNumericAdmin();
            localStorage.setItem('pm_users_db', JSON.stringify(this.usersList));
            this.refreshCurrentUserFromList();
            if (typeof DBManager !== 'undefined' && DBManager.saveUsersToDB) {
                DBManager.saveUsersToDB(this.usersList);
            }
        }
    },

    syncFromDBWithWait: async function() {
        let directUsers = await this.fetchUsersDirectlyFromServer();
        if (directUsers && directUsers.length > 0) {
            this.usersList = directUsers;
            this.ensureNumericAdmin();
            localStorage.setItem('pm_users_db', JSON.stringify(this.usersList));
            if (typeof DBManager !== 'undefined' && DBManager.saveUsersToDB) {
                DBManager.saveUsersToDB(this.usersList);
            }
            return;
        }

        if (typeof PouchAdapter !== 'undefined') {
            try {
                await PouchAdapter.checkConnection();
                if (PouchAdapter._initialSyncPromise) {
                    await PouchAdapter.waitForInitialSync(4000);
                }
            } catch (e) {}
        }
        await this.syncFromDB();
    },

    login: function(personnelCode, nationalCode) {
        let searchCode = (personnelCode.toLowerCase() === 'admin') ? '100' : personnelCode;

        if (!this.usersList || this.usersList.length === 0) {
            throw new Error("ارتباط با سرور برقرار نشد. لطفاً اینترنت/شبکه را بررسی کرده و چند لحظه بعد مجدداً دکمه ورود را بزنید.");
        }

        let user = this.usersList.find(u => u.id === searchCode);
        
        if (!user) throw new Error("کاربری با این کد پرسنلی یافت نشد.");
        if (user.pin !== nationalCode) throw new Error("رمز عبور اشتباه است.");

        this.currentUser = { id: user.id, name: user.name, role: user.role, canAssignTasks: user.canAssignTasks };
        localStorage.setItem('pm_currentUser', JSON.stringify(this.currentUser));
        return true;
    },

    logout: function() {
        this.currentUser = null;
        localStorage.removeItem('pm_currentUser');
    },

    refreshCurrentUserFromList: function() {
        if (!this.currentUser) {
            let stored = localStorage.getItem('pm_currentUser');
            if (stored) {
                this.currentUser = JSON.parse(stored);
                if (this.currentUser.id === 'admin') this.currentUser.id = '100';
            }
        }
        if (this.currentUser && this.usersList && this.usersList.length > 0) {
            let latest = this.usersList.find(u => u.id === this.currentUser.id || (this.currentUser.id === '100' && u.id === 'admin'));
            if (latest) {
                this.currentUser.name = latest.name;
                this.currentUser.role = latest.role;
                this.currentUser.canAssignTasks = Boolean(latest.canAssignTasks);
                localStorage.setItem('pm_currentUser', JSON.stringify(this.currentUser));
            }
        }
    },

    getCurrentUser: function() {
        this.refreshCurrentUserFromList();
        return this.currentUser;
    },

    addUser: function(personnelCode, fullName, nationalCode, role = 'user', canAssignTasks = false) {
        if (this.usersList.find(u => u.id === personnelCode)) {
            throw new Error("این کد پرسنلی قبلاً ثبت شده است!");
        }
        this.usersList.push({ 
            id: personnelCode, 
            name: fullName, 
            pin: nationalCode, 
            role: role,
            canAssignTasks: canAssignTasks 
        });
        this.saveUsers();
    },

    changePassword: function(targetUserId, newPassword, oldPassword = null) {
        let user = this.usersList.find(u => u.id === targetUserId);
        if (!user) throw new Error("کاربری با این مشخصات یافت نشد.");
        
        if (oldPassword !== null && user.pin !== oldPassword) {
            throw new Error("رمز عبور فعلی اشتباه است!");
        }
        
        user.pin = newPassword;
        this.saveUsers();
    },

    updateUserPermission: function(targetUserId, canAssign) {
        let user = this.usersList.find(u => u.id === targetUserId);
        if (user) {
            user.canAssignTasks = canAssign;
            this.saveUsers();
            this.refreshCurrentUserFromList();
        }
    },

    updateUserName: function(targetUserId, newName) {
        let user = this.usersList.find(u => u.id === targetUserId);
        if (!user) throw new Error("کاربری با این مشخصات یافت نشد.");
        
        user.name = newName;
        this.saveUsers();
        this.refreshCurrentUserFromList();
    }
};

AuthManager.init();
