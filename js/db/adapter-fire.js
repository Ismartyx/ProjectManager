const FirebaseAdapter = {
    db: null,

    init: function() {
        firebase.initializeApp(AppConfig.Firebase_Config);
        this.db = firebase.firestore();
        
        // فعال‌سازی قابلیت کار در حالت آفلاین
        this.db.enablePersistence().catch(function(err) {
            console.log('Firebase Offline Error:', err);
        });
    },

    saveTask: async function(taskData) {
        return await this.db.collection('tasks').add(taskData);
    },

    getTasks: async function(projectId) {
        let snapshot = await this.db.collection('tasks').where("projectId", "==", projectId).get();
        let tasks = [];
        snapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        return tasks;
    }
};
