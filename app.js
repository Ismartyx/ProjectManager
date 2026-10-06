// مدیریت دیتابیس محلی آفلاین
let db;
const request = indexedDB.open('ProjectManagerDB', 2); // ورژن ۲ برای ایجاد ۳ جدول

request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
    }
    if (!db.objectStoreNames.contains('tasks')) {
        let taskStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
        taskStore.createIndex('projectId', 'projectId', { unique: false });
    }
    if (!db.objectStoreNames.contains('reports')) {
        let reportStore = db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
        reportStore.createIndex('taskId', 'taskId', { unique: false });
    }
};

request.onsuccess = function(event) {
    db = event.target.result;
    console.log("Database initialized");
};

// متغیرهای سراسری سیستم
let currentUser = null;
let currentProjectId = null;
let currentTask = null;

// --- توابع رابط کاربری ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function openModal(modalId) { document.getElementById(modalId).classList.add('active'); }
function closeModal(modalId) { document.getElementById(modalId).classList.remove('active'); }

function getPersianDate() {
    return new Date().toLocaleString('fa-IR', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit' 
    });
}

function login() {
    const user = document.getElementById('username').value.trim();
    if(user) {
        currentUser = user;
        showScreen('dashboard-screen');
        loadProjects();
    } else {
        alert("لطفا نام کاربری را وارد کنید");
    }
}

// --- عملیات پروژه‌ها ---
function addProject() {
    const title = document.getElementById('new-project-title').value.trim();
    if (!title) return;

    const project = { title: title, date: getPersianDate(), createdBy: currentUser };
    const tx = db.transaction('projects', 'readwrite');
    tx.objectStore('projects').add(project);
    tx.oncomplete = () => {
        document.getElementById('new-project-title').value = '';
        closeModal('project-modal');
        loadProjects();
    };
}

function loadProjects() {
    const list = document.getElementById('project-list');
    list.innerHTML = '';
    const tx = db.transaction('projects', 'readonly');
    tx.objectStore('projects').getAll().onsuccess = (e) => {
        const projects = e.target.result;
        if(projects.length === 0) list.innerHTML = '<p style="text-align:center; color:#7f8c8d; margin-top:20px;">هیچ پروژه‌ای یافت نشد. اولین پروژه را بسازید.</p>';
        projects.forEach(proj => {
            list.innerHTML += `
                <div class="card" onclick="openProject(${proj.id}, '${proj.title}')">
                    <h3>${proj.title}</h3>
                    <div class="card-meta">
                        <span>ایجاد: ${proj.createdBy}</span>
                        <span class="timestamp">${proj.date}</span>
                    </div>
                </div>
            `;
        });
    };
}

function openProject(id, title) {
    currentProjectId = id;
    document.getElementById('current-project-title').innerText = title;
    showScreen('project-details-screen');
    loadTasks();
}

// --- عملیات تسک‌ها ---
function addTask() {
    const title = document.getElementById('new-task-title').value.trim();
    const tag = document.getElementById('new-task-tag').value.trim() || 'عمومی';
    const assignee = document.getElementById('new-task-assignee').value.trim();
    
    if (!title || !assignee) { alert("عنوان و مسئول الزامی است!"); return; }

    const task = { 
        projectId: currentProjectId, 
        title: title, 
        tag: tag, 
        assignee: assignee,
        status: 'در حال انجام',
        date: getPersianDate(),
        createdBy: currentUser
    };

    const tx = db.transaction('tasks', 'readwrite');
    tx.objectStore('tasks').add(task);
    tx.oncomplete = () => {
        document.getElementById('new-task-title').value = '';
        document.getElementById('new-task-tag').value = '';
        document.getElementById('new-task-assignee').value = '';
        closeModal('task-modal');
        loadTasks();
    };
}

function loadTasks() {
    const list = document.getElementById('task-list');
    list.innerHTML = '';
    const tx = db.transaction('tasks', 'readonly');
    const store = tx.objectStore('tasks');
    const index = store.index('projectId');
    
    index.getAll(currentProjectId).onsuccess = (e) => {
        const tasks = e.target.result;
        if(tasks.length === 0) list.innerHTML = '<p style="text-align:center; color:#7f8c8d; margin-top:20px;">تسکی برای این پروژه ثبت نشده است.</p>';
        tasks.forEach(task => {
            list.innerHTML += `
                <div class="card" onclick="openTask(${task.id})" style="${task.status === 'انجام شد' ? 'border-color: #27ae60; opacity: 0.7;' : ''}">
                    <h3>${task.title}</h3>
                    <div class="card-meta">
                        <span class="tag">${task.tag}</span>
                        <span>مسئول: ${task.assignee}</span>
                    </div>
                </div>
            `;
        });
    };
}

function openTask(taskId) {
    const tx = db.transaction('tasks', 'readonly');
    tx.objectStore('tasks').get(taskId).onsuccess = (e) => {
        currentTask = e.target.result;
        document.getElementById('task-title').innerText = currentTask.title;
        document.getElementById('task-tag').innerText = currentTask.tag;
        document.getElementById('task-date').innerText = currentTask.date;
        document.getElementById('task-assignee').innerText = currentTask.assignee;
        document.getElementById('task-status').innerText = currentTask.status;
        
        // کنترل دکمه تایید نهایی بر اساس یوزر
        const completeBtn = document.getElementById('complete-btn');
        if (currentUser === currentTask.assignee && currentTask.status !== 'انجام شد') {
            completeBtn.disabled = false;
        } else {
            completeBtn.disabled = true;
        }
        
        showScreen('task-screen');
        loadReports();
    };
}

function completeTask() {
    if(!confirm("آیا از پایان یافتن این تسک مطمئن هستید؟")) return;
    
    currentTask.status = 'انجام شد';
    const tx = db.transaction('tasks', 'readwrite');
    tx.objectStore('tasks').put(currentTask);
    tx.oncomplete = () => {
        document.getElementById('task-status').innerText = 'انجام شد';
        document.getElementById('complete-btn').disabled = true;
        // ثبت یک گزارش اتوماتیک
        addSystemReport("تسک توسط مسئول مربوطه تایید و بسته شد.");
    };
}

// --- عملیات گزارش‌ها ---
function addReport() {
    const text = document.getElementById('report-text').value.trim();
    if (!text) return;
    saveReport(text, currentUser);
}

function addSystemReport(text) {
    saveReport(text, 'سیستم');
}

function saveReport(text, author) {
    const report = {
        taskId: currentTask.id,
        user: author,
        text: text,
        date: getPersianDate(),
        synced: false
    };

    const tx = db.transaction('reports', 'readwrite');
    tx.objectStore('reports').add(report);
    tx.oncomplete = () => {
        document.getElementById('report-text').value = '';
        loadReports();
    };
}

function loadReports() {
    const list = document.getElementById('reports-list');
    list.innerHTML = '';
    const tx = db.transaction('reports', 'readonly');
    const index = tx.objectStore('reports').index('taskId');
    
    index.getAll(currentTask.id).onsuccess = (e) => {
        const reports = e.target.result;
        reports.forEach(rep => {
            // تبدیل لینک‌های متنی به تگ a قابل کلیک
            let formattedText = rep.text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
            list.innerHTML += `
                <div class="report-item">
                    <div class="report-header">
                        <span>👤 ${rep.user}</span>
                        <span class="timestamp">${rep.date} ${rep.synced ? '✓' : '⏳'}</span>
                    </div>
                    <div class="report-text">${formattedText}</div>
                </div>
            `;
        });
    };
}

function syncData() {
    alert('این دکمه در آینده داده‌های لوکال را به سرور بک‌اند شما (Node/Python) ارسال خواهد کرد.');
}
