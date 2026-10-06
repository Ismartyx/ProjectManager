// ثبت Service Worker برای قابلیت آفلاین و PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => {
        console.log('Service Worker Registered');
    });
}

// دیتابیس محلی (IndexedDB)
let db;
const request = indexedDB.open('ProjectManagerDB', 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains('reports')) {
        db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
    }
};
request.onsuccess = function(event) { db = event.target.result; };

let currentUser = null;
let currentTask = { id: 1, assignee: 'ali', status: 'open' }; // دیتای تستی

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function login() {
    const user = document.getElementById('username').value;
    if(user) {
        currentUser = user;
        showScreen('dashboard-screen');
        loadDummyProjects();
    }
}

function loadDummyProjects() {
    const list = document.getElementById('project-list');
    list.innerHTML = `
        <div class="task-card" onclick="openTask(1)">
            <h3>طراحی قالب قالب‌‌زنی</h3>
            <span class="tag">فنی</span>
            <p>مسئول: ali</p>
        </div>
    `;
}

function openTask(taskId) {
    showScreen('task-screen');
    document.getElementById('task-assignee').innerText = currentTask.assignee;
    
    // فقط مسئول تسک می‌تواند تایید نهایی کند
    const completeBtn = document.getElementById('complete-btn');
    if (currentUser === currentTask.assignee) {
        completeBtn.disabled = false;
    } else {
        completeBtn.disabled = true;
    }
    loadOfflineReports();
}

function addReport() {
    const text = document.getElementById('report-text').value;
    if (!text) return;

    const report = {
        taskId: currentTask.id,
        user: currentUser,
        text: text,
        timestamp: new Date().toLocaleString('fa-IR'),
        synced: false
    };

    // ذخیره در دیتابیس لوکال گوشی
    const tx = db.transaction('reports', 'readwrite');
    tx.objectStore('reports').add(report);
    tx.oncomplete = () => {
        document.getElementById('report-text').value = '';
        loadOfflineReports();
        // در اینجا تلاش برای ارسال به سرور انجام می‌شود
    };
}

function loadOfflineReports() {
    const list = document.getElementById('reports-list');
    list.innerHTML = '';
    const tx = db.transaction('reports', 'readonly');
    tx.objectStore('reports').getAll().onsuccess = (e) => {
        e.target.result.forEach(rep => {
            list.innerHTML += `
                <div class="report-item">
                    <strong>${rep.user}:</strong> ${rep.text}
                    <span class="report-time">${rep.timestamp} ${rep.synced ? '✓' : '⏳'}</span>
                </div>
            `;
        });
    };
}

function completeTask() {
    alert('تسک با موفقیت بسته شد!');
    // ارسال درخواست تغییر وضعیت به سرور
}

function syncData() {
    // خواندن داده‌های سینک نشده از IndexedDB و ارسال با Fetch API به سرور
    alert('در حال همگام‌سازی با سرور...');
}
