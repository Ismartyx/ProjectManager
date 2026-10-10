const AuthManager = {
    currentUser: null,

    // لیست کاربرانی که مدیر سیستم تعریف کرده است
    usersList: [
        { id: 'ali', name: 'علی', pin: '1234', role: 'admin' },   // مدیر سیستم
        { id: 'reza', name: 'رضا', pin: '1111', role: 'user' },    // کاربر عادی
        { id: 'milad', name: 'میلاد', pin: '2222', role: 'user' }  // کاربر عادی
    ],

    // تابع لاگین با بررسی پین‌کد
    login: function(userId, enteredPin) {
        // پیدا کردن کاربر از لیست
        let user = this.usersList.find(u => u.id === userId);
        
        if (!user) {
            throw new Error("کاربر یافت نشد!");
        }
        
        if (user.pin !== enteredPin) {
            throw new Error("پین‌کد اشتباه است!");
        }

        // اگر پین درست بود، اطلاعات را ذخیره کن
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
            if (stored) {
                this.currentUser = JSON.parse(stored);
            }
        }
        return this.currentUser;
    },

    // بررسی اینکه آیا کاربر فعلی مدیر است یا نه
    isAdmin: function() {
        let user = this.getCurrentUser();
        return user && user.role === 'admin';
    }
};
