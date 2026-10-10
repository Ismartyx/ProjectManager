const PouchAdapter = {
    localDB: null,

    init: function() {
        // ایجاد دیتابیس لوکال روی حافظه گوشی
        this.localDB = new PouchDB('mecav_db');
    },

    // تابع جامع برای ذخیره هر نوع آیتمی (پروژه یا تسک)
    saveItem: async function(itemData) {
        // اگر آیدی نداشت، یک آیدی یکتا بر اساس زمان برایش می‌سازیم
        if(!itemData._id) {
            itemData._id = itemData.type + '_' + Date.now();
        }
        return await this.localDB.put(itemData);
    },

    // تابع جامع برای گرفتن اطلاعات بر اساس نوع (project یا task)
    getItemsByType: async function(type) {
        let result = await this.localDB.allDocs({include_docs: true});
        return result.rows.map(row => row.doc).filter(doc => doc.type === type);
    }
};
