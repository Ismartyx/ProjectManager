const DBManager = {
    adapter: null,

    init: function() {
        // بر اساس تنظیمات، آداپتور مورد نظر را لود می‌کنیم
        if (AppConfig.ACTIVE_DB === 'pouchdb') {
            this.adapter = PouchAdapter;
        } else {
            this.adapter = FirebaseAdapter;
        }
        this.adapter.init();
    },

    // توابع عمومی که UI صدا می‌زند
    saveTask: function(taskData) {
        return this.adapter.saveTask(taskData);
    },

    getTasks: function(projectId) {
        return this.adapter.getTasks(projectId);
    }
};
