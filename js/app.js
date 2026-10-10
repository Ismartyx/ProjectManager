// ==========================================
// سیستم پیام‌های شناور (Toast)
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

document.addEventListener('DOMContentLoaded', async () => {
    
    // راه‌اندازی دیتابیس و لود تگ‌های پیش‌فرض
    DBManager.init();
    await DBManager.initDefaultTags();

    // ==========================================
    // دریافت المان‌های HTML
    // ==========================================
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const settingsView = document.getElementById('settings-view');
    const adminSettingsSection = document.getElementById('admin-settings-section');
    const headerActions = document.getElementById('headerActions');
    
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const btnSettings = document.getElementById('btnSettings');
    const btnBackToDashboard = document.getElementById('btnBackToDashboard');

    const personnelCodeInput = document.getElementById('personnelCodeInput');
    const nationalCodeInput = document.getElementById('nationalCodeInput');

    const fabAdd = document.getElementById('fabAdd');
    const addModal = document.getElementById('addModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    
    const taskDetailModal = document.getElementById('taskDetailModal');
    const btnCloseTaskDetail = document.getElementById('btnCloseTaskDetail');
    let currentOpenedTask = null;

    const taskTagSelect = document.getElementById('taskTagSelect');
    const btnAddCustomTag = document.getElementById('btnAddCustomTag');
    const globalTagLabel = document.getElementById('globalTagLabel');
    const chkGlobalTag = document.getElementById('chkGlobalTag');

    checkLoginStatus();

    // ==========================================
    // ورود و خروج
    // ==========================================
    const handleEnterPress = (event) => {
        if (event.key === 'Enter') btnLogin.click();
    };
    personnelCodeInput.addEventListener('keypress', handleEnterPress);
    nationalCodeInput.addEventListener('keypress', handleEnterPress);

    btnLogin.addEventListener('click', () => {
        let pCode = personnelCodeInput.value.trim();
        let nCode = nationalCodeInput.value.trim();
        
        if(!pCode || !nCode) return showToast("لطفا هر دو فیلد را پر کنید.", "error");

        try {
            AuthManager.login(pCode, nCode);
            personnelCodeInput.value = '';
            nationalCodeInput.value = '';
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

    // ==========================================
    // نویگیشن (جابجایی صفحات)
    // ==========================================
    btnSettings.addEventListener('click', () => {
        dashboardView.style.display = 'none';
        settingsView.style.display = 'block';
    });

    btnBackToDashboard.addEventListener('click', () => {
        settingsView.style.display = 'none';
        dashboardView.style.display = 'block';
        renderDashboard();
    });

    // ==========================================
    // صفحه تنظیمات (ثبت کاربر و تغییر رمز)
    // ==========================================
    document.getElementById('btnAddUser').addEventListener('click', () => {
        let name = document.getElementById('newUserName').value.trim();
        let code = document.getElementById('newUserCode').value.trim();
        let nat = document.getElementById('newUserNatCode').value.trim();
        let canAssign = document.getElementById('newUserCanAssign').checked;

        if(!name || !code || !nat) return showToast("اطلاعات پرسنل ناقص است.", "error");

        try {
            AuthManager.addUser(code, name, nat, 'user', canAssign);
            document.getElementById('newUserName').value = '';
            document.getElementById('newUserCode').value = '';
            document.getElementById('newUserNatCode').value = '';
            document.getElementById('newUserCanAssign').checked = false;
            showToast("کاربر جدید با موفقیت ثبت شد.");
        } catch (error) {
            showToast(error.message, "error");
        }
    });

    document.getElementById('btnChangeMyPass').addEventListener('click', () => {
        let newPass = document.getElementById('myNewPassword').value.trim();
        let currentUser = AuthManager.getCurrentUser();
        
        if(!newPass) return showToast("لطفا رمز جدید را وارد کنید.", "error");
        
        try {
            AuthManager.changePassword(currentUser.id, newPass);
            document.getElementById('myNewPassword').value = '';
            showToast("رمز عبور شما با موفقیت تغییر کرد.");
        } catch (error) {
            showToast(error.message, "error");
        }
    });

    document.getElementById('btnAdminChangePass').addEventListener('click', () => {
        let targetCode = document.getElementById('targetUserCode').value.trim();
        let newPass = document.getElementById('targetNewPassword').value.trim();
        
        if(!targetCode || !newPass) return showToast("لطفا کد و رمز جدید را وارد کنید.", "error");
        
        try {
            AuthManager.changePassword(targetCode, newPass);
            document.getElementById('targetUserCode').value = '';
            document.getElementById('targetNewPassword').value = '';
            showToast("رمز عبور کاربر تغییر کرد.");
        } catch (error) {
            showToast(error.message, "error");
        }
    });

    // ==========================================
    // پاپ‌آپ افزودن و سیستم تگ‌ها
    // ==========================================
    async function reloadTagsInDropdown(user) {
        taskTagSelect.innerHTML = '<option value="" disabled selected>دسته‌بندی (تگ)...</option>';
        let tags = await DBManager.getTags(user.id);
        tags.forEach(t => {
            taskTagSelect.innerHTML += `<option value="${t.title}">${t.title}</option>`;
        });
    }

    fabAdd.addEventListener('click', async () => {
        addModal.classList.add('active');
        let currentUser = AuthManager.getCurrentUser();
        
        // نمایش/مخفی کردن امکانات پیشرفته بر اساس مجوز
        if (currentUser.canAssignTasks || currentUser.role === 'admin') {
            document.getElementById('advancedTaskOptions').style.display = 'block';
            
            let selectAssignee = document.getElementById('taskAssigneeSelect');
            let selectFinalizer = document.getElementById('taskFinalizerSelect');
            selectAssignee.innerHTML = '<option value="" disabled selected>مسئول انجام کار...</option>';
            selectFinalizer.innerHTML = '<option value="" disabled selected>مسئول نهایی کردن...</option>';
            
            AuthManager.usersList.forEach(u => {
                selectAssignee.innerHTML += `<option value="${u.id}">${u.name}</option>`;
                selectFinalizer.innerHTML += `<option value="${u.id}">${u.name}</option>`;
            });
        } else {
            document.getElementById('advancedTaskOptions').style.display = 'none';
        }

        // نمایش تگ سراسری فقط برای مدیر
        globalTagLabel.style.display = currentUser.role === 'admin' ? 'flex' : 'none';

        // لود پروژه‌ها و تگ‌ها
        let selectProj = document.getElementById('taskProjectSelect');
        selectProj.innerHTML = '<option value="" disabled selected>انتخاب پروژه...</option>';
        let projects = await DBManager.getProjects();
        projects.forEach(p => {
            selectProj.innerHTML += `<option value="${p._id}">${p.title}</option>`;
        });

        await reloadTagsInDropdown(currentUser);
    });

    btnCloseModal.addEventListener('click', () => addModal.classList.remove('active'));

    // افزودن تگ دلخواه
    btnAddCustomTag.addEventListener('click', async () => {
        let tagTitle = document.getElementById('newTagInput').value.trim();
        let currentUser = AuthManager.getCurrentUser();
        
        if(!tagTitle) return showToast('نام تگ را بنویسید.', 'error');
        
        let isGlobal = currentUser.role === 'admin' ? chkGlobalTag.checked : false;

        try {
            await DBManager.saveTag(tagTitle, currentUser.id, isGlobal);
            document.getElementById('newTagInput').value = '';
            chkGlobalTag.checked = false;
            showToast('تگ جدید اضافه شد.');
            
            await reloadTagsInDropdown(currentUser);
            taskTagSelect.value = tagTitle; // انتخاب خودکار تگ جدید
        } catch (err) {
            showToast('خطا در ثبت تگ', 'error');
        }
    });

    // تب‌های مودال
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

    // ثبت پروژه و تسک
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
            tag: taskTagSelect.value, // از لیست جدید تگ‌ها
            status: 'pending',
            transferRequest: null
        };

        if(!newTask.projectId || !newTask.title || !newTask.tag) {
            return showToast('فیلدها را پر کنید.', 'error');
        }

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

        // مدیریت هشدارهای ارجاع برای مدیر
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
                            <button class="btn btn-success btn-small" onclick="window.handleTransfer('${t._id}', true)">تایید</button>
                            <button class="btn btn-danger btn-small" onclick="window.handleTransfer('${t._id}', false)">رد</button>
                        </div>
                    `;
                    transferList.appendChild(box);
                });
            } else {
                adminNotif.style.display = 'none';
            }
        }

        // نمایش تسک‌های شخص
        let myTasks = allTasks.filter(t => t.assigneeId === currentUser.id);
        tasksContainer.innerHTML = '';
        
        if (myTasks.length === 0) {
            tasksContainer.innerHTML = '<div class="card empty-state"><p>تسک فعالی برای شما وجود ندارد.</p></div>';
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
                card.onclick = () => openTaskDetail(t);
                tasksContainer.appendChild(card);
            });
        }
    }

    // باز کردن مودال جزئیات تسک
    function openTaskDetail(task) {
        currentOpenedTask = task;
        document.getElementById('td-title').innerText = task.title;
        document.getElementById('td-assignee').innerText = AuthManager.usersList.find(u => u.id === task.assigneeId)?.name || task.assigneeId;
        document.getElementById('td-finalizer').innerText = AuthManager.usersList.find(u => u.id === task.finalizerId)?.name || task.finalizerId;

        let currentUser = AuthManager.getCurrentUser();
        let transferSection = document.getElementById('transferSection');
        
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

    document.getElementById('btnRequestTransfer').addEventListener('click', async () => {
        let targetUserId = document.getElementById('transferUserSelect').value;
        if (!targetUserId) return showToast('شخص جدید را انتخاب کنید.', 'error');
        
        currentOpenedTask.transferRequest = targetUserId;
        await DBManager.saveTask(currentOpenedTask);
        
        showToast('درخواست ارجاع برای مدیر ارسال شد.');
        taskDetailModal.classList.remove('active');
        renderDashboard();
    });

    window.handleTransfer = async function(taskId, isApproved) {
        let allTasks = await DBManager.getTasks();
        let task = allTasks.find(t => t._id === taskId);
        
        if (task) {
            if (isApproved) {
                task.assigneeId = task.transferRequest;
                showToast('ارجاع تسک تایید شد.');
            } else {
                showToast('درخواست رد شد.', 'error');
            }
            task.transferRequest = null;
            await DBManager.saveTask(task);
            renderDashboard();
        }
    };

    // ==========================================
    // کنترل دسترسی اصلی صفحات
    // ==========================================
    function checkLoginStatus() {
        let user = AuthManager.getCurrentUser();
        
        loginView.style.display = 'none';
        dashboardView.style.display = 'none';
        settingsView.style.display = 'none';
        headerActions.style.display = 'none';
        adminSettingsSection.style.display = 'none';
        fabAdd.style.display = 'none';

        if (user) {
            dashboardView.style.display = 'block';
            headerActions.style.display = 'flex';
            document.getElementById('welcomeName').innerText = user.name;
            fabAdd.style.display = 'flex';
            if(user.role === 'admin') adminSettingsSection.style.display = 'block';
            
            renderDashboard();
        } else {
            loginView.style.display = 'block';
        }
    }
});
