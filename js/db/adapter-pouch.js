const PouchAdapter = {
    localDB: null,
    init: function() {
        this.localDB = new PouchDB('mecav_db');
    },
    saveItem: async function(itemData) {
        if(!itemData._id) {
            itemData._id = itemData.type + '_' + Date.now();
        }
        return await this.localDB.put(itemData);
    },
    getItemsByType: async function(type) {
        let result = await this.localDB.allDocs({include_docs: true});
        return result.rows.map(row => row.doc).filter(doc => doc.type === type);
    },
    // تابع جدید برای پاک کردن یک آیتم (مثل تگ)
    deleteItem: async function(id) {
        try {
            let doc = await this.localDB.get(id);
            return await this.localDB.remove(doc);
        } catch (e) {
            console.error("خطا در حذف:", e);
        }
    }
};
