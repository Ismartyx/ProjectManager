const AuthManager = {
    currentUser: null,
    usersList: [],

    init: function() {
        let stored = localStorage.getItem('pm_users_db');
        if (stored) {
            this.usersList = JSON.parse(stored);
        } else {
            // ادمین پیش‌فرض تمام دسترسی‌ها را دارد
            this.usersList = [
                { id: 'admin', name: 'مدیر سیستم', pin: 'admin', role: 'admin', canAssignTasks: true }
            ];
            this.saveUsers();
        }
    },

    saveUsers: function() {
        localStorage.setItem('pm_users_db', JSON.stringify(this.usersList));
    },

    login: function(personnelCode, nationalCode) {
        let user = this.usersList.find(u => u.id === personnelCode);
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
            if (stored) this.currentUser = JSON.parse(stored);
        }
        return this.currentUser;
    },

    // افزودن کاربر با امکان تعیین مجوز ارجاع تسک
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

    changePassword: function(targetUserId, newPassword) {
        let user = this.usersList.find(u => u.id === targetUserId);
        if (!user) throw new Error("کاربری با این مشخصات یافت نشد.");
        user.pin = newPassword;
        this.saveUsers();
    },

    // تغییر سطح دسترسی یک کاربر توسط مدیر
    updateUserPermission: function(targetUserId, canAssign) {
        let user = this.usersList.find(u => u.id === targetUserId);
        if (user) {
            user.canAssignTasks = canAssign;
            this.saveUsers();
        }
    }
};

AuthManager.init();
