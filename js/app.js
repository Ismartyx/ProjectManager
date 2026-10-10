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

document.addEventListener('DOMContentLoaded', () => {
    DBManager.init();

    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const settingsView = document.getElementById('settings-view');
    const headerActions = document.getElementById('headerActions');
    
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const btnSettings = document.getElementById('btnSettings');
    const btnBackToDashboard = document.getElementById('btnBackToDashboard');

    // المان‌های پاپ‌آپ افزودن
    const fabAdd = document.getElementById('fabAdd');
    const addModal = document.getElementById('addModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    
    // المان‌های مودال جزئیات تسک
    const taskDetailModal = document.getElementById('taskDetailModal');
    const btnCloseTaskDetail = document.getElementById('btnCloseTaskDetail');
    let currentOpenedTask = null; // نگهداری تسکی که الان باز است

    checkLoginStatus();

    // ==========================================
    // هندل کردن ورود
    // ==========================================
    const handleEnterPress = (event) => {
        if (event.key === 'Enter') btnLogin.click();
    };
    document.getElementById('personnelCodeInput').addEventListener('keypress', handleEnterPress);
    document.getElementById('nationalCodeInput').addEventListener('keypress', handleEnterPress);

    btnLogin.addEventListener('click', () => {
        let pCode = document.getElementById('personnelCodeInput').value.trim();
        let nCode = document.getElementById('nationalCodeInput').value.trim();
        
        if(!pCode || !nCode) return showToast("لطفا هر دو فیلد را پر کنید.", "error");

        try {
            AuthManager.login(pCode, nCode);
            document.getElementById('personnelCodeInput').value = '';
            document.getElementById('nationalCodeInput').value = '';
            showToast("با موفقیت وارد شدید.");
            checkLoginStatus();
        } catch (error) {
            showToast(error.message, "error");
        }
    });

    btnLogout.addEventListener('click', () => {
        AuthManager.logout();
        checkLoginStatus();
    });

    btnSettings.addEventListener('click', () => {
        dashboardView.style.display = 'none';
        settingsView.style.display = 'block';
    });

    btnBackToDashboard.addEventListener('click', () => {
        settingsView.style.display = 'none';
        dashboardView.style.display = 'block';
        renderDashboard(); // رفرش داشبورد هنگام بازگشت
    });

    // ==========================================
    // پاپ‌آپ افزودن (پروژه/تسک)
    // ==========================================
    fabAdd.addEventListener('click', async () => {
        addModal.classList.add('active');
        let currentUser = AuthManager.getCurrentUser();
        
        if (currentUser.canAssignTasks || currentUser.role === 'admin') {
            document.getElementById('advancedTaskOptions').style.display = 'block';
            let selectAssignee = document.getElementById('taskAssigneeSelect');
            let selectFinalizer = document.getElementById('taskFinalizerSelect');
            selectAssignee.innerHTML = '<option value="" disabled selected>مسئول انجام...</option>';
            selectFinalizer.innerHTML = '<option value="" disabled selected>مسئول نهایی...</option>';
            
            AuthManager.usersList.forEach(u => {
                selectAssignee.innerHTML += `<option value="${u.id}">${u.name}</option>`;
                selectFinalizer.innerHTML += `<option value="${u.id}">${u.name}</option>`;
            });
        } else {
            document.getElementById('advancedTaskOptions').style.display = 'none';
        }

        let selectProj = document.getElementById('taskProjectSelect');
        selectProj.innerHTML = '<option value="" disabled selected>انتخاب پروژه...</option>';
        let projects = await DBManager.getProjects();
        projects.forEach(p => {
            selectProj.innerHTML += `<option value="${p._id}">${p.title}</option>`;
        });
    });

    btnCloseModal.addEventListener('click', () => addModal.classList.remove('active'));

    document.getElementById('tabProject').addEventListener('click', () => {
        document.getElementById('tabProject').classList.add('active');
        document.getElementById('tabTask').classList.remove('active');
        document.getElementById('formProject').style.display = 'block';
        document.getElementById('formTask').style.display = 'none';
    });

    document.getElementById('tabTask').addEventListener('click', () => {
        document.getElementById('tabTask').classList.add('active');
        document.getElementById('tabProject').classList.remove('active');
        document.getElementById('formTask').style.display = 'block';
        document.getElementById('formProject').style.display = 'none';
    });

    document.getElementById('btnSaveProject').addEventListener('click', async () => {
        let title = document.getElementById('projTitle').value.trim();
        if(!title) return showToast('عنوان الزامی است!', 'error');
        await DBManager.saveProject({ title: title, createdBy: AuthManager.getCurrentUser().id });
        document.getElementById('projTitle').value = '';
        showToast('پروژه ذخیره شد.');
        btnCloseModal.click();
        renderDashboard();
    });

    document.getElementById('btnSaveTask').addEventListener('click', async () => {
        let currentUser = AuthManager.getCurrentUser();
        let hasPower = currentUser.canAssignTasks || currentUser.role === 'admin';
        
        let newTask = {
            projectId: document.getElementById('taskProjectSelect').value,
            title: document.getElementById('taskTitle').value.trim(),
            assigneeId: hasPower ? document.getElementById('taskAssigneeSelect').value : currentUser.id,
            finalizerId: hasPower ? document.getElementById('taskFinalizerSelect').value : currentUser.id,
            creatorId: currentUser.id,
            tag: document.getElementById('taskTag').value,
            status: 'pending',
            transferRequest: null
        };

        if(!newTask.projectId || !newTask.title || !newTask.tag) return showToast('فیلدها را پر کنید.', 'error');

        await DBManager.saveTask(newTask);
        document.getElementById('taskTitle').value = '';
        showToast('تسک ذخیره شد.');
        btnCloseModal.click();
        renderDashboard();
    });

    // ==========================================
    // منطق داشبورد و ارجاع تسک
    // ==========================================
    async function renderDashboard() {
        let currentUser = AuthManager.getCurrentUser();
        if (!currentUser) return;

        let allTasks = await DBManager.getTasks();
        const tasksContainer = document.getElementById('tasks-list-container');
        const adminNotif = document.getElementById('admin-notifications');
        const transferList = document.getElementById('transfer-requests-list');

        // 1. نمایش درخواست‌های ارجاع به مدیر
        if (currentUser.role === 'admin' || currentUser.canAssignTasks) {
            let pendingTransfers = allTasks.filter(t => t.transferRequest !== null);
            if (pendingTransfers.length > 0) {
                adminNotif.style.display = 'block';
                transferList.innerHTML = '';
                
                pendingTransfers.forEach(t => {
                    let reqUser = AuthManager.usersList.find(u => u.id === t.assigneeId)?.name || t.assigneeId;
                    let targetUser = AuthManager.usersList.find(u => u.id === t.transferRequest)?.name || t.transferRequest;
                    
                    let box = document.createElement('div');
                    box.className = 'transfer-req-box';
                    box.innerHTML = `
                        <div>کاربر <b>${reqUser}</b> درخواست ارجاع تسک <b>${t.title}</b> به <b>${targetUser}</b> را دارد.</div>
                        <div style="margin-top: 10px; display:flex; gap:10px;">
                            <button class="btn btn-success btn-small" onclick="window.handleTransfer('${t._id}', true)">تایید ارجاع</button>
                            <button class="btn btn-danger btn-small" onclick="window.handleTransfer('${t._id}', false)">رد درخواست</button>
                        </div>
                    `;
                    transferList.appendChild(box);
                });
            } else {
                adminNotif.style.display = 'none';
            }
        }

        // 2. ساخت کارت‌های تسک برای کاربر
        let myTasks = allTasks.filter(t => t.assigneeId === currentUser.id);
        tasksContainer.innerHTML = '';
        
        if (myTasks.length === 0) {
            tasksContainer.innerHTML = '<div class="card empty-state"><p>در حال حاضر تسک فعالی برای شما وجود ندارد.</p></div>';
        } else {
            myTasks.forEach(t => {
                let card = document.createElement('div');
                card.className = 'task-card';
                card.innerHTML = `
                    <span class="tag">${t.tag}</span>
                    <h3>${t.title}</h3>
                    <div class="task-info-row">
                        <span>وضعیت: </span>
                        <span class="highlight">${t.status === 'pending' ? 'در حال انجام' : 'تکمیل شده'}</span>
                    </div>
                `;
                // با کلیک روی کارت، مودال جزئیات باز می‌شود
                card.onclick = () => openTaskDetail(t);
                tasksContainer.appendChild(card);
            });
        }
    }

    // باز کردن پنجره جزئیات تسک
    function openTaskDetail(task) {
        currentOpenedTask = task;
        document.getElementById('td-title').innerText = task.title;
        document.getElementById('td-assignee').innerText = AuthManager.usersList.find(u => u.id === task.assigneeId)?.name || task.assigneeId;
        document.getElementById('td-finalizer').innerText = AuthManager.usersList.find(u => u.id === task.finalizerId)?.name || task.finalizerId;

        let currentUser = AuthManager.getCurrentUser();
        let transferSection = document.getElementById('transferSection');
        
        // اگر کاربر عادی است و قبلاً درخواست نداده، فرم ارجاع را ببیند
        if (task.assigneeId === currentUser.id && !currentUser.canAssignTasks && task.transferRequest === null) {
            transferSection.style.display = 'block';
            let select = document.getElementById('transferUserSelect');
            select.innerHTML = '<option value="" disabled selected>انتخاب شخص جدید...</option>';
            AuthManager.usersList.forEach(u => {
                if (u.id !== currentUser.id) {
                    select.innerHTML += `<option value="${u.id}">${u.name}</option>`;
                }
            });
        } else {
            transferSection.style.display = 'none';
        }

        taskDetailModal.classList.add('active');
    }

    btnCloseTaskDetail.addEventListener('click', () => taskDetailModal.classList.remove('active'));

    // ثبت درخواست ارجاع توسط کاربر عادی
    document.getElementById('btnRequestTransfer').addEventListener('click', async () => {
        let targetUserId = document.getElementById('transferUserSelect').value;
        if (!targetUserId) return showToast('شخص جدید را انتخاب کنید.', 'error');
        
        currentOpenedTask.transferRequest = targetUserId; // ثبت آیدی شخص جدید
        await DBManager.saveTask(currentOpenedTask);      // آپدیت در دیتابیس
        
        showToast('درخواست ارجاع برای مدیر ارسال شد.');
        taskDetailModal.classList.remove('active');
        renderDashboard();
    });

    // تابع سراسری برای تایید یا رد ارجاع (که از داخل HTML فراخوانی می‌شود)
    window.handleTransfer = async function(taskId, isApproved) {
        let allTasks = await DBManager.getTasks();
        let task = allTasks.find(t => t._id === taskId);
        
        if (task) {
            if (isApproved) {
                task.assigneeId = task.transferRequest; // انتقال وظیفه به شخص جدید
                showToast('ارجاع تسک با موفقیت تایید شد.');
            } else {
                showToast('درخواست ارجاع رد شد.', 'error');
            }
            task.transferRequest = null; // پاک کردن فیلد درخواست
            await DBManager.saveTask(task);
            renderDashboard(); // رفرش صفحه مدیر
        }
    };

    // ==========================================
    // سایر تنظیمات و رویدادهای ادمین (کدهای قبلی)
    // ==========================================
    document.getElementById('btnAddUser').addEventListener('click', () => { /* ... کدهای قبلی ... */ });
    document.getElementById('btnChangeMyPass').addEventListener('click', () => { /* ... کدهای قبلی ... */ });
    document.getElementById('btnAdminChangePass').addEventListener('click', () => { /* ... کدهای قبلی ... */ });

    function checkLoginStatus() {
        let user = AuthManager.getCurrentUser();
        loginView.style.display = 'none';
        dashboardView.style.display = 'none';
        settingsView.style.display = 'none';
        headerActions.style.display = 'none';
        document.getElementById('admin-settings-section').style.display = 'none';
        fabAdd.style.display = 'none';

        if (user) {
            dashboardView.style.display = 'block';
            headerActions.style.display = 'flex';
            document.getElementById('welcomeName').innerText = user.name;
            fabAdd.style.display = 'flex';
            if(user.role === 'admin') document.getElementById('admin-settings-section').style.display = 'block';
            
            // مهم: وقتی کاربر لاگین کرد، تسک‌ها را واکشی و رندر کن
            renderDashboard();
        } else {
            loginView.style.display = 'block';
        }
    }
});
