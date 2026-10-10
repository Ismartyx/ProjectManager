const DBManager = {
    adapter: null,

    init: function() {
        this.adapter = PouchAdapter;
        this.adapter.init();
    },

    // ... (توابع قبلی مربوط به پروژه و تسک) ...
    saveProject: function(data) { data.type = 'project'; return this.adapter.saveItem(data); },
    getProjects: function() { return this.adapter.getItemsByType('project'); },
    saveTask: function(data) { data.type = 'task'; data.status = 'pending'; data.reports = []; return this.adapter.saveItem(data); },
    getTasks: function() { return this.adapter.getItemsByType('task'); },

    // ====== سیستم جدید تگ‌ها ======
    saveTag: function(title, creatorId, isGlobal = false) {
        let tagData = {
            type: 'tag',
            title: title,
            creatorId: creatorId,
            isGlobal: isGlobal // اگر true باشد، همه می‌بینند. اگر false باشد، فقط سازنده می‌بیند.
        };
        return this.adapter.saveItem(tagData);
    },
    getTags: async function(userId) {
        let allTags = await this.adapter.getItemsByType('tag');
        // تگ‌های عمومی + تگ‌های شخصی کاربر
        return allTags.filter(t => t.isGlobal || t.creatorId === userId);
    },
    
    // تابع کمکی برای ایجاد تگ‌های پیش‌فرض در اولین اجرا
    initDefaultTags: async function() {
        let existingTags = await this.adapter.getItemsByType('tag');
        if (existingTags.length === 0) {
            await this.saveTag("خرید / مالی", "admin", true);
            await this.saveTag("فنی / ساخت", "admin", true);
            await this.saveTag("بررسی / تایید", "admin", true);
        }
    }
};
