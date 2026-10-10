const AuthManager = {
    currentUser: null,

    // تابع ورود به سیستم (فعلاً ساده و با ذخیره در حافظه لوکال)
    login: function(userId, userName) {
        this.currentUser = { id: userId, name: userName };
        // ذخیره در گوشی تا با بستن برنامه خارج نشود
        localStorage.setItem('pm_currentUser', JSON.stringify(this.currentUser));
        console.log(`${userName} وارد سیستم شد.`);
    },

    // خروج از حساب
    logout: function() {
        this.currentUser = null;
        localStorage.removeItem('pm_currentUser');
    },

    // گرفتن اطلاعات کاربری که لاگین کرده
    getCurrentUser: function() {
        if (!this.currentUser) {
            let stored = localStorage.getItem('pm_currentUser');
            if (stored) {
                this.currentUser = JSON.parse(stored);
            }
        }
        return this.currentUser;
    }
};
