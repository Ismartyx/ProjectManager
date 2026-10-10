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

document.addEventListener('DOMContentLoaded', async () => {
    DBManager.init();
    await DBManager.initDefaultTags();

    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const settingsView = document.getElementById('settings-view');
    const btnLogin = document.getElementById('btnLogin');
    const fabAdd = document.getElementById('fabAdd');
    
    // متغیرهای مودال تسک
    const taskDetailModal = document.getElementById('taskDetailModal');
    let currentOpenedTask = null;

    checkLoginStatus();

    // ==========================================
    // لاگین و تنظیمات
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

    document.getElementById('btnAddUser').addEventListener('click', () => {
        let name = document.getElementById('newUserName').value.trim(), code = document.getElementById('newUserCode').value.trim(), nat = document.getElementById('newUserNatCode').value.trim();
        if(!name || !code || !nat) return showToast("اطلاعات ناقص است.", "error");
        try {
            AuthManager.addUser(code, name, nat, 'user', document.getElementById('newUserCanAssign').checked);
            document.getElementById('newUserName').value = ''; document.getElementById('newUserCode').value = ''; document.getElementById('newUserNatCode').value = ''; document.getElementById('newUserCanAssign').checked = false;
            showToast("کاربر جدید ثبت شد.");
            renderAdminUserList(); // آپدیت لیست کاربران
        } catch (error) { showToast(error.message, "error"); }
    });

    function renderAdminUserList() {
        const container = document.getElementById('admin-users-list-container');
        if(!container) return;
        container.innerHTML = AuthManager.usersList.map(u => 
            `<div class="user-list-item">
                <span>👤 ${u.name} (کد: ${u.id})</span>
                <span class="tag" style="margin:0;">${u.role === 'admin' ? 'مدیر' : (u.canAssignTasks ? 'سرپرست' : 'کاربر')}</span>
            </div>`
        ).join('');
    }

    // ==========================================
    // پاپ‌آپ افزودن و تگ‌ها (کدهای قبلی)
    // ==========================================
    // ... [تمامی کدهای مربوط به مودال AddModal، انتخاب تگ، ثبت پروژه و تسک در اینجا دست‌نخورده باقی می‌ماند. برای جلوگیری از طولانی شدن بیش از حد، منطق ثبت تسک و پروژه مثل کد قبلی است] ...
    
    // (من کدهای ثبت تسک و پاپ آپ رو برای کارکرد کامل دوباره اینجا میذارم)
    document.getElementById('btnCloseModal').addEventListener('click', () => document.getElementById('addModal').classList.remove('active'));
    document.getElementById('tabProject').addEventListener('click', () => { document.getElementById('tabProject').classList.add('active'); document.getElementById('tabTask').classList.remove('active'); document.getElementById('formProject').style.display = 'block'; document.getElementById('formTask').style.display = 'none'; });
    document.getElementById('tabTask').addEventListener('click', () => { document.getElementById('tabTask').classList.add('active'); document.getElementById('tabProject').classList.remove('active'); document.getElementById('formTask').style.display = 'block'; document.getElementById('formProject').style.display = 'none'; });

    async function reloadTagsInDropdown(user) {
        let sel = document.getElementById('taskTagSelect');
        sel.innerHTML = '<option value="" disabled selected>دسته‌بندی (تگ)...</option>';
        let tags = await DBManager.getTags(user.id);
        tags.forEach(t => sel.innerHTML += `<option value="${t.title}">${t.title}</option>`);
    }

    fabAdd.addEventListener('click', async () => {
        document.getElementById('addModal').classList.add('active');
        let currentUser = AuthManager.getCurrentUser();
        if (currentUser.canAssignTasks || currentUser.role === 'admin') {
            document.getElementById('advancedTaskOptions').style.display = 'block';
            let s1 = document.getElementById('taskAssigneeSelect'), s2 = document.getElementById('taskFinalizerSelect');
            s1.innerHTML = '<option value="" disabled selected>مسئول انجام...</option>'; s2.innerHTML = '<option value="" disabled selected>مسئول نهایی...</option>';
            AuthManager.usersList.forEach(u => { s1.innerHTML += `<option value="${u.id}">${u.name}</option>`; s2.innerHTML += `<option value="${u.id}">${u.name}</option>`; });
        } else { document.getElementById('advancedTaskOptions').style.display = 'none'; }
        document.getElementById('globalTagLabel').style.display = currentUser.role === 'admin' ? 'flex' : 'none';
        let selProj = document.getElementById('taskProjectSelect');
        selProj.innerHTML = '<option value="" disabled selected>انتخاب پروژه...</option>';
        let projects = await DBManager.getProjects();
        projects.forEach(p => selProj.innerHTML += `<option value="${p._id}">${p.title}</option>`);
        await reloadTagsInDropdown(currentUser);
    });

    document.getElementById('btnAddCustomTag').addEventListener('click', async () => {
        let title = document.getElementById('newTagInput').value.trim();
        let user = AuthManager.getCurrentUser();
        if(!title) return;
        await DBManager.saveTag(title, user.id, user.role === 'admin' ? document.getElementById('chkGlobalTag').checked : false);
        document.getElementById('newTagInput').value = '';
        await reloadTagsInDropdown(user);
        document.getElementById('taskTagSelect').value = title;
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
            projectId: document.getElementById('taskProjectSelect').value,
            title: document.getElementById('taskTitle').value.trim(),
            assigneeId: hasPower ? document.getElementById('taskAssigneeSelect').value : user.id,
            finalizerId: hasPower ? document.getElementById('taskFinalizerSelect').value : user.id,
            creatorId: user.id,
            tag: document.getElementById('taskTagSelect').value,
            status: 'pending', transferRequest: null, reports: []
        };
        if(!newTask.projectId || !newTask.title || !newTask.tag) return showToast('فیلدها را پر کنید.', 'error');
        await DBManager.saveTask(newTask);
        document.getElementById('taskTitle').value = ''; document.getElementById('btnCloseModal').click(); renderDashboard();
    });

    // ==========================================
    // رندر داشبورد (درختواره پروژه‌ها)
    // ==========================================
    async function renderDashboard() {
        let currentUser = AuthManager.getCurrentUser();
        if (!currentUser) return;

        let allTasks = await DBManager.getTasks();
        let allProjects = await DBManager.getProjects();
        const container = document.getElementById('tasks-list-container');
        const adminNotif = document.getElementById('admin-notifications');
        const transferList = document.getElementById('transfer-requests-list');

        // 1. هشدارهای مدیر (قابلیت کلیک روی نام تسک)
        if (currentUser.role === 'admin' || currentUser.canAssignTasks) {
            let pending = allTasks.filter(t => t.transferRequest !== null);
            if (pending.length > 0) {
                adminNotif.style.display = 'block'; transferList.innerHTML = '';
                pending.forEach(t => {
                    let reqUser = AuthManager.usersList.find(u => u.id === t.assigneeId)?.name || t.assigneeId;
                    let targetUser = AuthManager.usersList.find(u => u.id === t.transferRequest)?.name || t.transferRequest;
                    transferList.innerHTML += `
                        <div class="transfer-req-box">
                            <div>کاربر <b>${reqUser}</b> درخواست ارجاع تسک 
                                <a href="#" onclick="window.openTaskById('${t._id}')" style="color:var(--primary); font-weight:bold;">«${t.title}»</a> 
                                به <b>${targetUser}</b> را دارد.
                            </div>
                            <div style="margin-top: 10px; display:flex; gap:10px;">
                                <button class="btn btn-success btn-small" onclick="window.handleTransfer('${t._id}', true)">تایید</button>
                                <button class="btn btn-danger btn-small" onclick="window.handleTransfer('${t._id}', false)">رد</button>
                            </div>
                        </div>`;
                });
            } else { adminNotif.style.display = 'none'; }
        }

        // 2. ساخت درختواره پروژه‌ها
        container.innerHTML = '';
        // فیلتر تسک‌هایی که به کاربر مربوط است (ادمین همه را می‌بیند)
        let myTasks = currentUser.role === 'admin' ? allTasks : allTasks.filter(t => t.assigneeId === currentUser.id || t.finalizerId === currentUser.id);
        
        if (myTasks.length === 0) {
            container.innerHTML = '<div class="card empty-state">تسک فعالی ندارید.</div>'; return;
        }

        // پیدا کردن پروژه‌هایی که این کاربر در آن‌ها تسک دارد
        let myProjects = allProjects.filter(p => myTasks.some(t => t.projectId === p._id));
        
        myProjects.forEach(proj => {
            let projTasks = myTasks.filter(t => t.projectId === proj._id);
            let projHTML = `<div class="project-group">
                <div class="project-header">📁 پروژه: ${proj.title} <span>(${projTasks.length} تسک)</span></div>
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
    // منطق مودال جزئیات تسک (گزارش‌ها و تایید)
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

        // رندر کردن لیست گزارش‌ها
        const reportsList = document.getElementById('td-reports-list');
        reportsList.innerHTML = '';
        if(task.reports && task.reports.length > 0) {
            task.reports.forEach(r => {
                let date = new Date(r.timestamp).toLocaleDateString('fa-IR', { hour: '2-digit', minute:'2-digit' });
                reportsList.innerHTML += `
                    <div class="report-item ${r.isFinal ? 'final' : ''}">
                        <div class="report-meta"><span>${r.userName}</span> <span>${date}</span></div>
                        <div>${r.text}</div>
                    </div>`;
            });
        } else {
            reportsList.innerHTML = '<div style="color:var(--text-muted); font-size:0.9rem; text-align:center;">هنوز گزارشی ثبت نشده است.</div>';
        }

        // بررسی دسترسی‌ها برای فرم گزارش و درخواست ارجاع
        let actionForm = document.getElementById('td-action-form');
        let pendingMsg = document.getElementById('td-pending-transfer-msg');
        let transferSection = document.getElementById('transferSection');
        let btnFinal = document.getElementById('btnSubmitFinal');

        // اگر تسک بسته شده باشد
        if (task.status === 'completed') {
            actionForm.style.display = 'none';
            pendingMsg.style.display = 'none';
            transferSection.style.display = 'none';
        } 
        // اگر تسک در انتظار ارجاع است (قفل برای کاربر عادی)
        else if (task.transferRequest !== null) {
            actionForm.style.display = currentUser.role === 'admin' ? 'block' : 'none'; // ادمین بتونه نظر بده
            pendingMsg.style.display = 'block';
            transferSection.style.display = 'none';
        } 
        // حالت عادی (باز)
        else {
            actionForm.style.display = 'block';
            pendingMsg.style.display = 'none';
            
            // دکمه نهایی کردن فقط برای شخص نهایی‌کننده
            btnFinal.style.display = (task.finalizerId === currentUser.id) ? 'inline-block' : 'none';

            // درخواست ارجاع فقط برای مسئول فعلی که قدرت سرپرستی نداره
            if (task.assigneeId === currentUser.id && !currentUser.canAssignTasks) {
                transferSection.style.display = 'block';
                let select = document.getElementById('transferUserSelect');
                select.innerHTML = '<option value="" disabled selected>انتخاب شخص...</option>';
                AuthManager.usersList.forEach(u => { if (u.id !== currentUser.id) select.innerHTML += `<option value="${u.id}">${u.name}</option>`; });
            } else {
                transferSection.style.display = 'none';
            }
        }

        taskDetailModal.classList.add('active');
    }

    document.getElementById('btnCloseTaskDetail').addEventListener('click', () => taskDetailModal.classList.remove('active'));

    // ثبت گزارش / نظر
    document.getElementById('btnSubmitComment').addEventListener('click', () => saveReport(false));
    document.getElementById('btnSubmitFinal').addEventListener('click', () => saveReport(true));

    async function saveReport(isFinal) {
        let text = document.getElementById('td-new-report').value.trim();
        if(!text) return showToast('متن گزارش نمی‌تواند خالی باشد.', 'error');

        let user = AuthManager.getCurrentUser();
        let newRep = {
            id: Date.now(),
            userId: user.id,
            userName: user.name,
            text: text,
            isFinal: isFinal,
            timestamp: Date.now()
        };

        if(!currentOpenedTask.reports) currentOpenedTask.reports = [];
        currentOpenedTask.reports.push(newRep);
        if(isFinal) currentOpenedTask.status = 'completed';

        await DBManager.saveTask(currentOpenedTask);
        document.getElementById('td-new-report').value = '';
        showToast(isFinal ? 'تسک با موفقیت بسته شد.' : 'گزارش ثبت شد.');
        openTaskDetail(currentOpenedTask); // رفرش مودال
        renderDashboard(); // رفرش داشبورد
    }

    // درخواست ارجاع
    document.getElementById('btnRequestTransfer').addEventListener('click', async () => {
        let targetId = document.getElementById('transferUserSelect').value;
        if (!targetId) return showToast('شخص جدید را انتخاب کنید.', 'error');
        currentOpenedTask.transferRequest = targetId;
        await DBManager.saveTask(currentOpenedTask);
        showToast('درخواست ارسال شد.');
        taskDetailModal.classList.remove('active');
        renderDashboard();
    });

    // تایید یا رد ارجاع (مدیر)
    window.handleTransfer = async function(taskId, isApproved) {
        let tasks = await DBManager.getTasks();
        let task = tasks.find(t => t._id === taskId);
        if (task) {
            if (isApproved) { task.assigneeId = task.transferRequest; showToast('تایید شد.'); } 
            else { showToast('رد شد.', 'error'); }
            task.transferRequest = null;
            await DBManager.saveTask(task);
            renderDashboard();
        }
    };

    function checkLoginStatus() {
        let user = AuthManager.getCurrentUser();
        [loginView, dashboardView, settingsView, headerActions, document.getElementById('admin-settings-section'), fabAdd].forEach(el => el.style.display = 'none');
        if (user) {
            dashboardView.style.display = 'block'; headerActions.style.display = 'flex';
            document.getElementById('welcomeName').innerText = user.name;
            fabAdd.style.display = 'flex';
            if(user.role === 'admin') {
                document.getElementById('admin-settings-section').style.display = 'block';
                renderAdminUserList();
            }
            renderDashboard();
        } else { loginView.style.display = 'block'; }
    }
});
