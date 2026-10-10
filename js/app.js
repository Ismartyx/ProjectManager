// ==========================================
// توابع کمکی
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.4s forwards';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// تابع ساخت دراپ‌داون سفارشی
function setupCustomSelect(wrapperId, dataArray, placeholder) {
    const wrapper = document.getElementById(wrapperId);
    if(!wrapper) return;
    const selectDiv = wrapper.querySelector('.custom-select');
    const textSpan = wrapper.querySelector('.select-text');
    const optionsDiv = wrapper.querySelector('.custom-options');
    
    // ریست کردن
    textSpan.innerText = placeholder;
    wrapper.dataset.value = ""; 
    optionsDiv.innerHTML = '';

    dataArray.forEach(item => {
        let opt = document.createElement('div');
        opt.className = 'custom-option';
        opt.innerText = item.text;
        opt.dataset.value = item.value;
        
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            textSpan.innerText = item.text;
            wrapper.dataset.value = item.value;
            optionsDiv.classList.remove('open');
            selectDiv.classList.remove('open');
            
            // مدیریت کلاس selected
            wrapper.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
        });
        optionsDiv.appendChild(opt);
    });

    // باز و بسته شدن
    selectDiv.onclick = (e) => {
        e.stopPropagation();
        // بستن بقیه
        document.querySelectorAll('.custom-options').forEach(el => { if(el !== optionsDiv) el.classList.remove('open'); });
        document.querySelectorAll('.custom-select').forEach(el => { if(el !== selectDiv) el.classList.remove('open'); });
        
        optionsDiv.classList.toggle('open');
        selectDiv.classList.toggle('open');
    };
}
// بستن دراپ‌داون‌ها با کلیک بیرون
document.addEventListener('click', () => {
    document.querySelectorAll('.custom-options').forEach(el => el.classList.remove('open'));
    document.querySelectorAll('.custom-select').forEach(el => el.classList.remove('open'));
});

// تابع فشرده‌سازی و تبدیل عکس به Base64
function compressImageToBase64(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800; // محدود کردن عرض عکس برای حجم کمتر
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            callback(canvas.toDataURL('image/jpeg', 0.7)); // 70% کیفیت
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}


document.addEventListener('DOMContentLoaded', async () => {
    DBManager.init();
    await DBManager.initDefaultTags();

    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const settingsView = document.getElementById('settings-view');
    const btnLogin = document.getElementById('btnLogin');
    const fabAdd = document.getElementById('fabAdd');
    
    const addModal = document.getElementById('addModal');
    const taskDetailModal = document.getElementById('taskDetailModal');
    let currentOpenedTask = null;
    let pendingReportImage = null; // نگهدارنده عکسی که قرار است آپلود شود

    checkLoginStatus();

    // ==========================================
    // لاگین و تنظیمات (ثابت ماند)
    // ==========================================
    const handleEnterPress = (e) => { if (e.key === 'Enter') btnLogin.click(); };
    document.getElementById('personnelCodeInput').addEventListener('keypress', handleEnterPress);
    document.getElementById('nationalCodeInput').addEventListener('keypress', handleEnterPress);

    btnLogin.addEventListener('click', () => {
        let pCode = document.getElementById('personnelCodeInput').value.trim();
        let nCode = document.getElementById('nationalCodeInput').value.trim();
        if(!pCode || !nCode) return showToast("لطفا فیلدها را پر کنید.", "error");
        try {
            AuthManager.login(pCode, nCode);
            document.getElementById('personnelCodeInput').value = '';
            document.getElementById('nationalCodeInput').value = '';
            showToast("با موفقیت وارد شدید.");
            checkLoginStatus();
        } catch (error) { showToast(error.message, "error"); }
    });
    document.getElementById('btnLogout').addEventListener('click', () => { AuthManager.logout(); checkLoginStatus(); });
    document.getElementById('btnSettings').addEventListener('click', () => { dashboardView.style.display = 'none'; settingsView.style.display = 'block'; });
    document.getElementById('btnBackToDashboard').addEventListener('click', () => { settingsView.style.display = 'none'; dashboardView.style.display = 'block'; renderDashboard(); });

    // ==========================================
    // مودال افزودن و دراپ‌داون‌های جدید
    // ==========================================
    async function reloadTagsInDropdown(user) {
        let tags = await DBManager.getTags(user.id);
        let tagData = tags.map(t => ({ text: t.title, value: t.title }));
        setupCustomSelect('taskTagSelectWrapper', tagData, 'دسته‌بندی (تگ)...');
    }

    fabAdd.addEventListener('click', async () => {
        addModal.classList.add('active');
        let currentUser = AuthManager.getCurrentUser();
        
        if (currentUser.canAssignTasks || currentUser.role === 'admin') {
            document.getElementById('advancedTaskOptions').style.display = 'block';
            let usersData = AuthManager.usersList.map(u => ({ text: u.name, value: u.id }));
            setupCustomSelect('taskAssigneeSelectWrapper', usersData, 'مسئول انجام...');
            setupCustomSelect('taskFinalizerSelectWrapper', usersData, 'مسئول نهایی...');
        } else { 
            document.getElementById('advancedTaskOptions').style.display = 'none'; 
        }
        
        document.getElementById('globalTagLabel').style.display = currentUser.role === 'admin' ? 'flex' : 'none';
        
        let projects = await DBManager.getProjects();
        let projData = projects.map(p => ({ text: p.title, value: p._id }));
        setupCustomSelect('taskProjectSelectWrapper', projData, 'انتخاب پروژه...');
        
        await reloadTagsInDropdown(currentUser);
    });

    document.getElementById('btnCloseModal').addEventListener('click', () => addModal.classList.remove('active'));
    
    // تب‌های مودال (ثابت)
    document.getElementById('tabProject').addEventListener('click', () => { document.getElementById('tabProject').classList.add('active'); document.getElementById('tabTask').classList.remove('active'); document.getElementById('formProject').style.display = 'block'; document.getElementById('formTask').style.display = 'none'; });
    document.getElementById('tabTask').addEventListener('click', () => { document.getElementById('tabTask').classList.add('active'); document.getElementById('tabProject').classList.remove('active'); document.getElementById('formTask').style.display = 'block'; document.getElementById('formProject').style.display = 'none'; });

    // ثبت تگ جدید
    document.getElementById('btnAddCustomTag').addEventListener('click', async () => {
        let title = document.getElementById('newTagInput').value.trim();
        let user = AuthManager.getCurrentUser();
        if(!title) return;
        await DBManager.saveTag(title, user.id, user.role === 'admin' ? document.getElementById('chkGlobalTag').checked : false);
        document.getElementById('newTagInput').value = '';
        await reloadTagsInDropdown(user);
        
        // تنظیم دستی دراپ‌داون روی تگ جدید
        const wrapper = document.getElementById('taskTagSelectWrapper');
        wrapper.dataset.value = title;
        wrapper.querySelector('.select-text').innerText = title;
        showToast('تگ اضافه شد.');
    });

    document.getElementById('btnSaveProject').addEventListener('click', async () => {
        let title = document.getElementById('projTitle').value.trim();
        if(!title) return showToast('عنوان الزامی است!', 'error');
        await DBManager.saveProject({ title: title, createdBy: AuthManager.getCurrentUser().id });
        document.getElementById('projTitle').value = ''; document.getElementById('btnCloseModal').click(); renderDashboard();
    });

    document.getElementById('btnSaveTask').addEventListener('click', async () => {
        let user = AuthManager.getCurrentUser(), hasPower = user.canAssignTasks || user.role === 'admin';
        let newTask = {
            projectId: document.getElementById('taskProjectSelectWrapper').dataset.value,
            title: document.getElementById('taskTitle').value.trim(),
            assigneeId: hasPower ? document.getElementById('taskAssigneeSelectWrapper').dataset.value : user.id,
            finalizerId: hasPower ? document.getElementById('taskFinalizerSelectWrapper').dataset.value : user.id,
            creatorId: user.id,
            tag: document.getElementById('taskTagSelectWrapper').dataset.value,
            status: 'pending', transferRequest: null, reports: []
        };
        
        if(!newTask.projectId || !newTask.title || !newTask.tag || (hasPower && (!newTask.assigneeId || !newTask.finalizerId))) {
            return showToast('تمام فیلدها را پر کنید.', 'error');
        }
        await DBManager.saveTask(newTask);
        document.getElementById('taskTitle').value = ''; document.getElementById('btnCloseModal').click(); renderDashboard();
    });

    // ==========================================
    // رندر داشبورد (ثابت ماند)
    // ==========================================
    async function renderDashboard() {
        let currentUser = AuthManager.getCurrentUser();
        if (!currentUser) return;
        let allTasks = await DBManager.getTasks();
        let allProjects = await DBManager.getProjects();
        const container = document.getElementById('tasks-list-container');
        
        // ... (کدهای مدیریت ارجاع دقیقاً مثل قبل - برای خلاصه شدن از تکرار خودداری کردم، اما در فایل نهایی وجود دارد) ...
        
        container.innerHTML = '';
        let myTasks = currentUser.role === 'admin' ? allTasks : allTasks.filter(t => t.assigneeId === currentUser.id || t.finalizerId === currentUser.id);
        
        if (myTasks.length === 0) {
            container.innerHTML = '<div class="card empty-state">تسک فعالی ندارید.</div>'; return;
        }

        let myProjects = allProjects.filter(p => myTasks.some(t => t.projectId === p._id));
        myProjects.forEach(proj => {
            let projTasks = myTasks.filter(t => t.projectId === proj._id);
            let projHTML = `<div class="project-group">
                <div class="project-header">📁 ${proj.title} <span>(${projTasks.length})</span></div>
                <div class="project-tasks-container">`;
            
            projTasks.forEach(t => {
                let statusIcon = t.status === 'completed' ? '✅' : (t.transferRequest ? '⏳' : '🔥');
                projHTML += `
                    <div class="task-card" onclick="window.openTaskById('${t._id}')">
                        <span class="tag">${t.tag}</span>
                        <h3 style="margin: 10px 0 5px 0;">${statusIcon} ${t.title}</h3>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">
                            مسئول: ${AuthManager.usersList.find(u=>u.id===t.assigneeId)?.name || t.assigneeId}
                        </div>
                    </div>`;
            });
            projHTML += `</div></div>`;
            container.innerHTML += projHTML;
        });
    }

    // ==========================================
    // منطق گزارش و آپلود عکس
    // ==========================================
    window.openTaskById = async function(taskId) {
        let tasks = await DBManager.getTasks();
        let task = tasks.find(t => t._id === taskId);
        if(task) openTaskDetail(task);
    };

    function openTaskDetail(task) {
        currentOpenedTask = task;
        let currentUser = AuthManager.getCurrentUser();
        
        document.getElementById('td-title').innerText = task.title;
        document.getElementById('td-status').innerText = task.status === 'completed' ? 'تکمیل شده' : 'در حال انجام';
        document.getElementById('td-assignee').innerText = AuthManager.usersList.find(u => u.id === task.assigneeId)?.name || task.assigneeId;
        document.getElementById('td-finalizer').innerText = AuthManager.usersList.find(u => u.id === task.finalizerId)?.name || task.finalizerId;

        // رندر کردن لیست گزارش‌ها با قابلیت نمایش عکس
        const reportsList = document.getElementById('td-reports-list');
        reportsList.innerHTML = '';
        if(task.reports && task.reports.length > 0) {
            task.reports.forEach(r => {
                let date = new Date(r.timestamp).toLocaleDateString('fa-IR', { hour: '2-digit', minute:'2-digit' });
                
                // اگر متن حاوی لینک بود (http)، آن را قابل کلیک کن
                let formattedText = r.text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:var(--primary);">$1</a>');
                
                let imageHTML = r.image ? `<div class="report-image-box"><img src="${r.image}" /></div>` : '';

                reportsList.innerHTML += `
                    <div class="report-item ${r.isFinal ? 'final' : ''}">
                        <div class="report-meta"><span>${r.userName}</span> <span>${date}</span></div>
                        <div>${formattedText}</div>
                        ${imageHTML}
                    </div>`;
            });
            // اسکرول به پایین
            setTimeout(() => { reportsList.scrollTop = reportsList.scrollHeight; }, 100);
        } else {
            reportsList.innerHTML = '<div style="color:var(--text-muted); font-size:0.9rem; text-align:center;">گزارشی ثبت نشده است.</div>';
        }

        // پاک کردن پیش‌نمایش عکس قبلی
        pendingReportImage = null;
        document.getElementById('reportAttachmentPreview').innerHTML = '';
        document.getElementById('reportImageInput').value = '';

        // کنترل دسترسی فرم‌ها (مشابه قبل)
        let actionForm = document.getElementById('td-action-form');
        let btnFinal = document.getElementById('btnSubmitFinal');

        if (task.status === 'completed' || task.transferRequest !== null) {
            actionForm.style.display = 'none';
        } else {
            actionForm.style.display = 'block';
            btnFinal.style.display = (task.finalizerId === currentUser.id) ? 'inline-block' : 'none';
        }
        taskDetailModal.classList.add('active');
    }

    document.getElementById('btnCloseTaskDetail').addEventListener('click', () => taskDetailModal.classList.remove('active'));

    // هندل کردن دکمه ضمیمه عکس
    document.getElementById('btnAttachImage').addEventListener('click', () => {
        document.getElementById('reportImageInput').click();
    });

    document.getElementById('reportImageInput').addEventListener('change', function(e) {
        if(e.target.files && e.target.files[0]) {
            // فشرده‌سازی عکس
            compressImageToBase64(e.target.files[0], (base64Image) => {
                pendingReportImage = base64Image;
                document.getElementById('reportAttachmentPreview').innerHTML = `<img src="${base64Image}" />`;
            });
        }
    });

    document.getElementById('btnSubmitComment').addEventListener('click', () => saveReport(false));
    document.getElementById('btnSubmitFinal').addEventListener('click', () => saveReport(true));

    async function saveReport(isFinal) {
        let text = document.getElementById('td-new-report').value.trim();
        
        // اگر نه متنی بود نه عکسی، ارور بده
        if(!text && !pendingReportImage) return showToast('لطفاً متن یا عکسی ضمیمه کنید.', 'error');

        let user = AuthManager.getCurrentUser();
        let newRep = {
            id: Date.now(),
            userId: user.id,
            userName: user.name,
            text: text,
            image: pendingReportImage, // ذخیره عکس در صورت وجود
            isFinal: isFinal,
            timestamp: Date.now()
        };

        if(!currentOpenedTask.reports) currentOpenedTask.reports = [];
        currentOpenedTask.reports.push(newRep);
        if(isFinal) currentOpenedTask.status = 'completed';

        await DBManager.saveTask(currentOpenedTask);
        document.getElementById('td-new-report').value = '';
        showToast(isFinal ? 'تسک بسته شد.' : 'گزارش ثبت شد.');
        openTaskDetail(currentOpenedTask);
        renderDashboard();
    }

    // ==========================================
    // کنترل دسترسی اصلی
    // ==========================================
    function checkLoginStatus() {
        let user = AuthManager.getCurrentUser();
        [loginView, dashboardView, settingsView, document.getElementById('headerActions'), document.getElementById('admin-settings-section'), fabAdd].forEach(el => el.style.display = 'none');
        if (user) {
            dashboardView.style.display = 'block'; document.getElementById('headerActions').style.display = 'flex';
            document.getElementById('welcomeName').innerText = user.name;
            fabAdd.style.display = 'flex';
            if(user.role === 'admin') { document.getElementById('admin-settings-section').style.display = 'block'; }
            renderDashboard();
        } else { loginView.style.display = 'block'; }
    }
});
