const DBManager = {
    adapter: null,

    init: function() {
        this.adapter = PouchAdapter; // فعلاً روی حالت PouchDB (آفلاین) تنظیم است
        this.adapter.init();
    },

    saveProject: function(data) {
        data.type = 'project';
        return this.adapter.saveItem(data);
    },
    getProjects: function() {
        return this.adapter.getItemsByType('project');
    },
    
    saveTask: function(data) {
        data.type = 'task';
        data.status = 'pending';
        data.reports = []; // آرایه خالی برای گزارش‌های آینده
        return this.adapter.saveItem(data);
    },
    getTasks: function() {
        return this.adapter.getItemsByType('task');
    }
};
