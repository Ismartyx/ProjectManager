const DBManager = {
    adapter: null,
    init: function() {
        this.adapter = PouchAdapter;
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
        // 🔴 رفع باگ: فقط وقتی تسک جدید است وضعیت را صفر کن
        if (!data._id) {
            data.status = 'pending'; 
            data.reports = []; 
            data.transferRequest = null;
        }
        return this.adapter.saveItem(data); 
    },
    getTasks: function() { 
        return this.adapter.getItemsByType('task'); 
    },
    saveTag: function(title, creatorId, isGlobal = false) {
        let tagData = { type: 'tag', title: title, creatorId: creatorId, isGlobal: isGlobal };
        return this.adapter.saveItem(tagData);
    },
    getTags: async function(userId) {
        let allTags = await this.adapter.getItemsByType('tag');
        return allTags.filter(t => t.isGlobal || t.creatorId === userId);
    },
    deleteTag: function(id) {
        return this.adapter.deleteItem(id);
    },
    initDefaultTags: async function() {
        let existingTags = await this.adapter.getItemsByType('tag');
        if (existingTags.length === 0) {
            await this.saveTag("خرید / مالی", "admin", true);
            await this.saveTag("فنی / ساخت", "admin", true);
            await this.saveTag("بررسی / تایید", "admin", true);
        }
    }
};
