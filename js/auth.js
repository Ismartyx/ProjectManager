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

    syncFromDB: async function() {
        if (typeof DBManager !== 'undefined' && DBManager.getUsersFromDB) {
            let dbUsers = await DBManager.getUsersFromDB();
            if (dbUsers && dbUsers.length > 0) {
                // دریافت لیست واقعی پرسنل و مدیر از سرور کارگاه
                this.usersList = dbUsers;
                this.ensureNumericAdmin();
                localStorage.setItem('pm_users_db', JSON.stringify(this.usersList));
            } else if (PouchAdapter && PouchAdapter.isOnline) {
                // فقط در صورتی که به سرور کارگاه وصل هستیم و سرور واقعاً تازه نصب شده و هیچ کاربری ندارد، ادمین 100 را بساز
                if (this.usersList.length === 0) {
                    this.usersList = [
                        { id: '100', name: 'مدیر سیستم', pin: '100', role: 'admin', canAssignTasks: true }
                    ];
                }
                this.saveUsers();
            }
        }
    },

    // اگر لیست کاربران خالی باشد، صبر می‌کند تا سینک اولیه از سرور کامل شود و سپس مجدداً بارگذاری می‌کند
    syncFromDBWithWait: async function() {
        // اگر از قبل داده داریم، همان را سریع برگردان
        if (this.usersList && this.usersList.length > 0) {
            await this.syncFromDB();
            return;
        }
        // داده نداریم - اگر آنلاین هستیم، منتظر اتمام pull اولیه می‌مانیم
        if (typeof PouchAdapter !== 'undefined' && PouchAdapter._initialSyncPromise) {
            await PouchAdapter.waitForInitialSync(8000);
        }
        // حالا دوباره از دیتابیس محلی می‌خوانیم (که باید پر شده باشد)
        await this.syncFromDB();
    },

    login: function(personnelCode, nationalCode) {
        // اگر دستگاه جدید است و هنوز یک بار هم به سرور کارگاه وصل نشده است:
        if (!this.usersList || this.usersList.length === 0) {
            throw new Error("برای اولین ورود، لطفاً به وای‌فای کارگاه متصل شوید تا اطلاعات حساب‌ها از سرور دریافت شود.");
        }

        let searchCode = (personnelCode.toLowerCase() === 'admin') ? '100' : personnelCode;
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

    getCurrentUser: function() {
        if (!this.currentUser) {
            let stored = localStorage.getItem('pm_currentUser');
            if (stored) {
                this.currentUser = JSON.parse(stored);
                if (this.currentUser.id === 'admin') this.currentUser.id = '100';
            }
        }
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
        }
    },

    updateUserName: function(targetUserId, newName) {
        let user = this.usersList.find(u => u.id === targetUserId);
        if (!user) throw new Error("کاربری با این مشخصات یافت نشد.");
        
        user.name = newName;
        if (this.currentUser && (this.currentUser.id === targetUserId || (targetUserId === '100' && this.currentUser.id === 'admin'))) {
            this.currentUser.name = newName;
            localStorage.setItem('pm_currentUser', JSON.stringify(this.currentUser));
        }
        this.saveUsers();
    }
};

AuthManager.init();
