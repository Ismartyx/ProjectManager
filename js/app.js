function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'fadeOut 0.3s forwards'; setTimeout(() => toast.remove(), 300); }, 2500);
}

// تابع ساخت دراپ‌داون + قابلیت اضافه کردن دکمه حذف (برای تگ‌ها)
function setupCustomSelect(wrapperId, dataArray, placeholder, onDeleteClick = null) {
    const wrapper = document.getElementById(wrapperId);
    if(!wrapper) return;
    const selectDiv = wrapper.querySelector('.custom-select');
    const textSpan = wrapper.querySelector('.select-text');
    const optionsDiv = wrapper.querySelector('.custom-options');
    
    textSpan.innerText = placeholder; wrapper.dataset.value = ""; optionsDiv.innerHTML = '';

    dataArray.forEach(item => {
        let opt = document.createElement('div');
        opt.className = 'custom-option';
        
        // اگر قابلیت حذف داشت و کاربر مجاز بود
        if(onDeleteClick && item.canDelete) {
            opt.innerHTML = `<span>${item.text}</span> <span class="delete-tag-btn" style="color:red; font-size:1.2rem;">✕</span>`;
            opt.querySelector('.delete-tag-btn').onclick = (e) => {
                e.stopPropagation(); // جلوگیری از انتخاب شدن
                if(confirm(`آیا از حذف تگ "${item.text}" مطمئن هستید؟`)) onDeleteClick(item.rawId);
            };
        } else {
            opt.innerText = item.text;
        }

        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            textSpan.innerText = item.text; wrapper.dataset.value = item.value;
            optionsDiv.classList.remove('open');
            wrapper.querySelectorAll('.custom-option').forEach(o => o.style.color = '');
            opt.style.color = 'var(--primary)';
        });
        optionsDiv.appendChild(opt);
    });

    selectDiv.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-options').forEach(el => { if(el !== optionsDiv) el.classList.remove('open'); });
        optionsDiv.classList.toggle('open');
    };
}
document.addEventListener('click', () => document.querySelectorAll('.custom-options').forEach(el => el.classList.remove('open')));

// فشرده‌سازی عکس
function compressImageToBase64(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600; 
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            callback(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

document.addEventListener('DOMContentLoaded', async () => {
    DBManager.init();
    await DBManager.initDefaultTags();

    // درخواست مجوز نوتیفیکیشن سیستم
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }

    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const settingsView = document.getElementById('settings-view');
    
    let currentOpenedTask = null;
    let pendingReportImage = null;

    checkLoginStatus();

    // ==========================================
    // لاگین
    // ==========================================
    document.getElementById('btnLogin').addEventListener('click', () => {
        let pCode = document.getElementById('personnelCodeInput').value.trim();
        let nCode = document.getElementById('nationalCodeInput').value.trim();
        try {
            AuthManager.login(pCode, nCode);
            showToast("وارد شدید.");
            checkLoginStatus();
        } catch (e) { showToast(e.message, "error"); }
    });
    document.getElementById('btnLogout').addEventListener('click', () => { AuthManager.logout(); checkLoginStatus(); });
    
    // نویگیشن
    document.getElementById('btnSettings').addEventListener('click', () => { dashboardView.style.display = 'none'; settingsView.style.display = 'block'; });
    document.getElementById('btnBackToDashboard').addEventListener('click', () => { settingsView.style.display = 'none'; dashboardView.style.display = 'block'; renderDashboard(); });

    // ثبت کاربر در تنظیمات
    document.getElementById('btnAddUser').addEventListener('click', () => {
        let name = document.getElementById('newUserName').value, code = document.getElementById('newUserCode').value, nat = document.getElementById('newUserNatCode').value;
        if(!name || !code || !nat) return;
        try {
            AuthManager.addUser(code, name, nat, 'user', document.getElementById('newUserCanAssign').checked);
            showToast("کاربر ثبت شد."); renderAdminUserList();
        } catch (e) { showToast(e.message, "error"); }
    });

    function renderAdminUserList() {
        const container = document.getElementById('admin-users-list-container');
        if(!container) return;
        container.innerHTML = AuthManager.usersList.map(u => 
            `<div style="padding: 5px; border-bottom: 1px solid #333;">👤 ${u.name} - کد: ${u.id} 
            <span class="tag" style="float:left">${u.role === 'admin' ? 'مدیر' : (u.canAssignTasks ? 'سرپرست' : 'کاربر')}</span></div>`
        ).join('');
    }

    // ==========================================
    // پاپ‌آپ افزودن و سیستم تگ
    // ==========================================
    async function reloadTagsInDropdown(user) {
        let tags = await DBManager.getTags(user.id);
        let tagData = tags.map(t => ({ 
            text: t.title, 
            value: t.title, 
            rawId: t._id,
            // حق حذف: اگر خودش ساخته یا مدیر است
            canDelete: (t.creatorId === user.id || user.role === 'admin')
        }));
        
        setupCustomSelect('taskTagSelectWrapper', tagData, 'تگ...', async (tagId) => {
            await DBManager.deleteTag(tagId);
            showToast('تگ حذف شد.');
            reloadTagsInDropdown(user);
        });
    }

    document.getElementById('fabAdd').addEventListener('click', async () => {
        document.getElementById('addModal').classList.add('active');
        let currentUser = AuthManager.getCurrentUser();
        
        if (currentUser.canAssignTasks || currentUser.role === 'admin') {
            document.getElementById('advancedTaskOptions').style.display = 'block';
            let usersData = AuthManager.usersList.map(u => ({ text: u.name, value: u.id }));
            setupCustomSelect('taskAssigneeSelectWrapper', usersData, 'مسئول انجام...');
            setupCustomSelect('taskFinalizerSelectWrapper', usersData, 'مسئول نهایی...');
        } else { document.getElementById('advancedTaskOptions').style.display = 'none'; }
        
        document.getElementById('globalTagLabel').style.display = currentUser.role === 'admin' ? 'flex' : 'none';
        
        let projects = await DBManager.getProjects();
        setupCustomSelect('taskProjectSelectWrapper', projects.map(p => ({ text: p.title, value: p._id })), 'انتخاب پروژه...');
        await reloadTagsInDropdown(currentUser);
    });

    document.getElementById('btnCloseModal').addEventListener('click', () => document.getElementById('addModal').classList.remove('active'));
    
    document.getElementById('tabProject').addEventListener('click', () => { document.getElementById('tabProject').classList.add('active'); document.getElementById('tabTask').classList.remove('active'); document.getElementById('formProject').style.display = 'block'; document.getElementById('formTask').style.display = 'none'; });
    document.getElementById('tabTask').addEventListener('click', () => { document.getElementById('tabTask').classList.add('active'); document.getElementById('tabProject').classList.remove('active'); document.getElementById('formTask').style.display = 'block'; document.getElementById('formProject').style.display = 'none'; });

    document.getElementById('btnAddCustomTag').addEventListener('click', async () => {
        let title = document.getElementById('newTagInput').value.trim();
        let user = AuthManager.getCurrentUser();
        if(!title) return;
        await DBManager.saveTag(title, user.id, user.role === 'admin' ? document.getElementById('chkGlobalTag').checked : false);
        document.getElementById('newTagInput').value = '';
        await reloadTagsInDropdown(user);
        showToast('تگ اضافه شد.');
    });

    document.getElementById('btnSaveProject').addEventListener('click', async () => {
        let title = document.getElementById('projTitle').value;
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
            creatorId: user.id, tag: document.getElementById('taskTagSelectWrapper').dataset.value
        };
        
        if(!newTask.projectId || !newTask.title || !newTask.tag || (hasPower && (!newTask.assigneeId || !newTask.finalizerId))) {
            return showToast('تمام فیلدها را پر کنید.', 'error');
        }
        await DBManager.saveTask(newTask);
        
        // نوتیفیکیشن لوکال برای تست
        if(Notification.permission === "granted" && newTask.assigneeId !== user.id) {
            new Notification("تسک جدید", { body: `تسک "${newTask.title}" به شما ارجاع شد.` });
        }

        document.getElementById('taskTitle').value = ''; document.getElementById('btnCloseModal').click(); renderDashboard();
    });

    // ==========================================
    // داشبورد و اکسپند/کلپس پروژه‌ها
    // ==========================================
    window.toggleProject = function(headerElement) {
        let container = headerElement.nextElementSibling;
        let arrow = headerElement.querySelector('.proj-arrow');
        container.classList.toggle('collapsed');
        arrow.innerText = container.classList.contains('collapsed') ? '◀' : '▼';
    };

    async function renderDashboard() {
        let currentUser = AuthManager.getCurrentUser();
        if (!currentUser) return;
        let allTasks = await DBManager.getTasks();
        let allProjects = await DBManager.getProjects();
        const container = document.getElementById('tasks-list-container');
        
        let pending = allTasks.filter(t => t.transferRequest !== null);
        let adminNotif = document.getElementById('admin-notifications');
        if ((currentUser.role === 'admin' || currentUser.canAssignTasks) && pending.length > 0) {
            adminNotif.style.display = 'block'; 
            document.getElementById('transfer-requests-list').innerHTML = pending.map(t => 
                `<div style="font-size:0.85rem; padding:8px; background:rgba(255,0,0,0.1); border-radius:6px; margin-bottom:5px;">
                    ارجاع <b>${t.title}</b> به ${AuthManager.usersList.find(u=>u.id===t.transferRequest)?.name}.
                    <button onclick="window.handleTransfer('${t._id}', true)" class="btn-small btn-success">تایید</button>
                    <button onclick="window.handleTransfer('${t._id}', false)" class="btn-small btn-secondary">رد</button>
                </div>`
            ).join('');
        } else { adminNotif.style.display = 'none'; }

        container.innerHTML = '';
        let myTasks = currentUser.role === 'admin' ? allTasks : allTasks.filter(t => t.assigneeId === currentUser.id || t.finalizerId === currentUser.id);
        if (myTasks.length === 0) { container.innerHTML = '<div class="card">تسکی ندارید.</div>'; return; }

        let myProjects = allProjects.filter(p => myTasks.some(t => t.projectId === p._id));
        myProjects.forEach(proj => {
            let projTasks = myTasks.filter(t => t.projectId === proj._id);
            let projHTML = `<div class="project-group">
                <div class="project-header" onclick="toggleProject(this)">
                    <span>📁 ${proj.title} <span style="font-size:0.8rem">(${projTasks.length})</span></span>
                    <span class="proj-arrow">▼</span>
                </div>
                <div class="project-tasks-container">`;
            
            projTasks.forEach(t => {
                let statusIcon = t.status === 'completed' ? '✅' : '🔥';
                let lastRep = (t.reports && t.reports.length > 0) ? t.reports[t.reports.length - 1].text : '';
                let repSnippet = lastRep ? `<div class="task-last-report">💬 ${lastRep.substring(0, 30)}...</div>` : '';
                
                projHTML += `
                    <div class="task-card" onclick="window.openTaskById('${t._id}')">
                        <span class="tag">${t.tag}</span>
                        <h3>${statusIcon} ${t.title}</h3>
                        ${repSnippet}
                    </div>`;
            });
            projHTML += `</div></div>`;
            container.innerHTML += projHTML;
        });
    }

    // ==========================================
    // چت و گزارش‌ها (مدل واتساپ)
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

        const chatBox = document.getElementById('td-reports-list');
        chatBox.innerHTML = '';
        if(task.reports && task.reports.length > 0) {
            task.reports.forEach(r => {
                let isAssignee = (r.userId === task.assigneeId);
                let bubbleClass = isAssignee ? 'chat-assignee' : 'chat-others';
                let date = new Date(r.timestamp).toLocaleDateString('fa-IR', { hour: '2-digit', minute:'2-digit' });
                let text = r.text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color:var(--accent)">$1</a>');
                let imgHTML = r.image ? `<div class="chat-image"><img src="${r.image}" /></div>` : '';

                chatBox.innerHTML += `
                    <div class="chat-bubble ${bubbleClass}">
                        <div class="chat-meta"><span>${r.userName}</span><span>${date}</span></div>
                        <div>${text}</div>
                        ${imgHTML}
                    </div>`;
            });
            setTimeout(() => { chatBox.scrollTop = chatBox.scrollHeight; }, 100);
        }

        pendingReportImage = null;
        document.getElementById('reportAttachmentPreview').innerHTML = '';
        
        let actionForm = document.getElementById('td-action-form');
        let btnFinal = document.getElementById('btnSubmitFinal');
        let transferSec = document.getElementById('transferSection');

        if (task.status === 'completed' || task.transferRequest !== null) {
            actionForm.style.display = 'none'; transferSec.style.display = 'none';
        } else {
            actionForm.style.display = 'block';
            btnFinal.style.display = (task.finalizerId === currentUser.id) ? 'inline-block' : 'none';
            if (task.assigneeId === currentUser.id && !currentUser.canAssignTasks) {
                transferSec.style.display = 'block';
                let usersData = AuthManager.usersList.filter(u => u.id !== currentUser.id).map(u => ({ text: u.name, value: u.id }));
                setupCustomSelect('transferUserSelectWrapper', usersData, 'شخص جدید...');
            } else { transferSec.style.display = 'none'; }
        }
        document.getElementById('taskDetailModal').classList.add('active');
    }

    document.getElementById('btnCloseTaskDetail').addEventListener('click', () => document.getElementById('taskDetailModal').classList.remove('active'));

    document.getElementById('btnAttachImage').addEventListener('click', () => document.getElementById('reportImageInput').click());
    document.getElementById('reportImageInput').addEventListener('change', function(e) {
        if(e.target.files[0]) compressImageToBase64(e.target.files[0], (base64) => {
            pendingReportImage = base64;
            document.getElementById('reportAttachmentPreview').innerHTML = `<img src="${base64}" style="width:50px; border-radius:5px; margin-bottom:5px;"/>`;
        });
    });

    document.getElementById('btnSubmitComment').addEventListener('click', () => saveReport(false));
    document.getElementById('btnSubmitFinal').addEventListener('click', () => saveReport(true));

    async function saveReport(isFinal) {
        let text = document.getElementById('td-new-report').value.trim();
        if(!text && !pendingReportImage) return showToast('متن یا عکس وارد کنید.', 'error');

        let user = AuthManager.getCurrentUser();
        if(!currentOpenedTask.reports) currentOpenedTask.reports = [];
        currentOpenedTask.reports.push({
            id: Date.now(), userId: user.id, userName: user.name, text: text, image: pendingReportImage, isFinal: isFinal, timestamp: Date.now()
        });
        
        if(isFinal) currentOpenedTask.status = 'completed';
        await DBManager.saveTask(currentOpenedTask);
        
        document.getElementById('td-new-report').value = '';
        openTaskDetail(currentOpenedTask); renderDashboard();
    }

    document.getElementById('btnRequestTransfer').addEventListener('click', async () => {
        let targetId = document.getElementById('transferUserSelectWrapper').dataset.value;
        if (!targetId) return;
        currentOpenedTask.transferRequest = targetId;
        await DBManager.saveTask(currentOpenedTask);
        document.getElementById('taskDetailModal').classList.remove('active');
        renderDashboard();
    });

    window.handleTransfer = async function(taskId, isApproved) {
        let tasks = await DBManager.getTasks();
        let task = tasks.find(t => t._id === taskId);
        if (task) {
            if (isApproved) { task.assigneeId = task.transferRequest; showToast('تایید شد.'); } 
            task.transferRequest = null;
            await DBManager.saveTask(task); renderDashboard();
        }
    };

    function checkLoginStatus() {
        let user = AuthManager.getCurrentUser();
        [loginView, dashboardView, settingsView, document.getElementById('headerActions'), document.getElementById('admin-settings-section'), fabAdd].forEach(el => el.style.display = 'none');
        if (user) {
            dashboardView.style.display = 'block'; document.getElementById('headerActions').style.display = 'flex';
            fabAdd.style.display = 'flex';
            if(user.role === 'admin') { document.getElementById('admin-settings-section').style.display = 'block'; renderAdminUserList(); }
            renderDashboard();
        } else { loginView.style.display = 'block'; }
    }
});
