const PouchAdapter = {
    localDB: null,
    remoteDB: null,

    init: function() {
        // ساخت دیتابیس آفلاین روی گوشی
        this.localDB = new PouchDB('local_projects');
        
        // اتصال به دیتابیس روی سرور VPS
        this.remoteDB = new PouchDB(AppConfig.CouchDB_URL);
        
        // راه‌اندازی سینک دو طرفه (همگام‌سازی خودکار در صورت اتصال به اینترنت)
        this.localDB.sync(this.remoteDB, {
            live: true,
            retry: true
        }).on('change', function (info) {
            console.log('Data synced with VPS', info);
        }).on('error', function (err) {
            console.log('Sync error (Offline Mode)', err);
        });
    },

    saveTask: async function(taskData) {
        taskData._id = new Date().toISOString(); // تولید ID یکتا
        return await this.localDB.put(taskData);
    },

    getTasks: async function(projectId) {
        // واکشی تسک‌ها بر اساس ID پروژه
        let result = await this.localDB.allDocs({include_docs: true});
        return result.rows.map(row => row.doc).filter(doc => doc.projectId === projectId);
    }
};
