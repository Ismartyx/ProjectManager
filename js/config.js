const AppConfig = {
    // مقدار می‌تواند 'pouchdb' یا 'firebase' باشد
    ACTIVE_DB: 'pouchdb', 
    
    // تنظیمات سرور شخصی شما
    CouchDB_URL: 'http://your-vps-ip:5984/projects_db',
    
    // تنظیمات فایربیس (در صورت استفاده)
    Firebase_Config: {
        apiKey: "YOUR_API_KEY",
        projectId: "YOUR_PROJECT_ID",
        // ...
    }
};
