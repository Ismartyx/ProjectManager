const DBManager = {
    adapter: null,
    init: function() {
        this.adapter = PouchAdapter;
        this.adapter.init();
    },
    
    saveProject: function(titleOrProjectObj, creatorId, isGlobal = false) { 
        if (typeof titleOrProjectObj === 'object' && titleOrProjectObj !== null) {
            titleOrProjectObj.type = 'project';
            return this.adapter.saveItem(titleOrProjectObj);
        }
        let projData = { 
            type: 'project', 
            title: titleOrProjectObj, 
            creatorId: creatorId, 
            isGlobal: isGlobal, 
            isArchived: false 
        };
        return this.adapter.saveItem(projData); 
    },

    getProjects: async function(userId) { 
        let allProjs = await this.adapter.getItemsByType('project');
        if (!userId) return allProjs;
        return allProjs.filter(p => p.isGlobal || p.creatorId === userId || (userId === '100' && p.creatorId === 'admin') || !p.creatorId);
    },

    deleteProject: function(id) {
        return this.adapter.deleteItem(id);
    },

    saveTask: function(data) { 
        data.type = 'task'; 
        if (!data._id) {
            data.status = data.status || 'pending';
            data.activities = data.activities || []; 
            data.transferRequest = data.transferRequest || null;
        }
        return this.adapter.saveItem(data); 
    },

    getTasks: function() { 
        return this.adapter.getItemsByType('task'); 
    },

    saveTag: function(title, creatorId, isGlobal = false) {
        return this.adapter.saveItem({ type: 'tag', title: title, creatorId: creatorId, isGlobal: isGlobal });
    },

    getTags: async function(userId) {
        let allTags = await this.adapter.getItemsByType('tag');
        if (!userId) return allTags;
        return allTags.filter(t => t.isGlobal || t.creatorId === userId || (userId === '100' && t.creatorId === 'admin'));
    },

    deleteTag: function(id) {
        return this.adapter.deleteItem(id);
    },

    saveUsersToDB: async function(usersList) {
        return await this.adapter.saveItem({
            _id: 'system_users_list',
            type: 'users_sync',
            users: usersList,
            updatedAt: Date.now()
        });
    },

    getUsersFromDB: async function() {
        try {
            let docs = await this.adapter.getItemsByType('users_sync');
            let userDoc = docs.find(d => d._id === 'system_users_list');
            return userDoc ? userDoc.users : null;
        } catch (e) {
            return null;
        }
    },

    initDefaultTags: async function() {
        let existingTags = await this.adapter.getItemsByType('tag');
        if (existingTags.length === 0) {
            await this.saveTag("خرید / مالی", "100", true);
            await this.saveTag("فنی / ساخت", "100", true);
            await this.saveTag("بررسی / تایید", "100", true);
        }
    }
};
