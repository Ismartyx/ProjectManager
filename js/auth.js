const AuthManager = {
    currentUser: null,
    usersList: [],

    // بارگذاری کاربران از دیتابیس لوکال هنگام باز شدن برنامه
    init: function() {
        let stored = localStorage.getItem('pm_users_db');
        if (stored) {
            this.usersList = JSON.parse(stored);
        } else {
            // ساخت ادمین پیش‌فرض برای اولین ورود
            this.usersList = [
                { id: 'admin', name: 'مدیر سیستم', pin: 'admin', role: 'admin' }
            ];
            this.saveUsers();
        }
    },

    saveUsers: function() {
        localStorage.setItem('pm_users_db', JSON.stringify(this.usersList));
    },

    // ورود به سیستم
    login: function(personnelCode, nationalCode) {
        let user = this.usersList.find(u => u.id === personnelCode);
        if (!user) throw new Error("کاربری با این کد پرسنلی یافت نشد.");
        if (user.pin !== nationalCode) throw new Error("کد ملی (رمز عبور) اشتباه است.");

        this.currentUser = { id: user.id, name: user.name, role: user.role };
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

    isAdmin: function() {
        let user = this.getCurrentUser();
        return user && user.role === 'admin';
    },

    // افزودن کاربر جدید (توسط مدیر)
    addUser: function(personnelCode, fullName, nationalCode, role = 'user') {
        if (this.usersList.find(u => u.id === personnelCode)) {
            throw new Error("این کد پرسنلی قبلاً ثبت شده است!");
        }
        this.usersList.push({ id: personnelCode, name: fullName, pin: nationalCode, role: role });
        this.saveUsers();
    },

    // وارد کردن لیست گروهی پرسنل (شما بعداً لیست را به این تابع می‌دهید)
    importUsersList: function(array) {
        // ساختار آرایه باید اینطور باشد: [{code: '101', name: 'علی', natCode: '0011223344'}, ...]
        array.forEach(item => {
            if (!this.usersList.find(u => u.id === item.code)) {
                this.usersList.push({ id: item.code, name: item.name, pin: item.natCode, role: 'user' });
            }
        });
        this.saveUsers();
    },

    // تغییر رمز عبور (پین‌کد)
    changePassword: function(targetUserId, newPassword) {
        let user = this.usersList.find(u => u.id === targetUserId);
        if (!user) {
            throw new Error("کاربری با این مشخصات یافت نشد.");
        }
        user.pin = newPassword;
        this.saveUsers(); // ذخیره تغییرات
    },
};

// راه‌اندازی اولیه پایگاه داده کاربران
AuthManager.init();
