// سیستم پیام‌های شناور (Toast)
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

    // بخش‌های مختلف صفحه
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const settingsView = document.getElementById('settings-view');
    const adminSettingsSection = document.getElementById('admin-settings-section');
    const headerActions = document.getElementById('headerActions');
    
    // دکمه‌ها
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const btnSettings = document.getElementById('btnSettings');
    const btnBackToDashboard = document.getElementById('btnBackToDashboard');
    const btnAddUser = document.getElementById('btnAddUser');
    const btnChangeMyPass = document.getElementById('btnChangeMyPass');
    const btnAdminChangePass = document.getElementById('btnAdminChangePass');

    // ورودی‌های لاگین
    const personnelCodeInput = document.getElementById('personnelCodeInput');
    const nationalCodeInput = document.getElementById('nationalCodeInput');

    checkLoginStatus();

    // هندل کردن کلید اینتر برای لاگین
    const handleEnterPress = (event) => {
        if (event.key === 'Enter') btnLogin.click();
    };
    personnelCodeInput.addEventListener('keypress', handleEnterPress);
    nationalCodeInput.addEventListener('keypress', handleEnterPress);

    // ورود
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

    // خروج
    btnLogout.addEventListener('click', () => {
        AuthManager.logout();
        checkLoginStatus();
    });

    // جابجایی به تنظیمات
    btnSettings.addEventListener('click', () => {
        dashboardView.style.display = 'none';
        settingsView.style.display = 'block';
    });

    // بازگشت به داشبورد
    btnBackToDashboard.addEventListener('click', () => {
        settingsView.style.display = 'none';
        dashboardView.style.display = 'block';
    });

    // ثبت کاربر جدید (ادمین)
    btnAddUser.addEventListener('click', () => {
        let name = document.getElementById('newUserName').value.trim();
        let code = document.getElementById('newUserCode').value.trim();
        let nat = document.getElementById('newUserNatCode').value.trim();

        if(!name || !code || !nat) return showToast("اطلاعات پرسنل ناقص است.", "error");

        try {
            AuthManager.addUser(code, name, nat);
            document.getElementById('newUserName').value = '';
            document.getElementById('newUserCode').value = '';
            document.getElementById('newUserNatCode').value = '';
            showToast("کاربر جدید با موفقیت ثبت شد.");
        } catch (error) {
            showToast(error.message, "error");
        }
    });

    // تغییر رمز شخصی
    btnChangeMyPass.addEventListener('click', () => {
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

    // تغییر رمز پرسنل توسط ادمین
    btnAdminChangePass.addEventListener('click', () => {
        let targetCode = document.getElementById('targetUserCode').value.trim();
        let newPass = document.getElementById('targetNewPassword').value.trim();
        
        if(!targetCode || !newPass) return showToast("لطفا کد و رمز جدید را وارد کنید.", "error");
        
        try {
            AuthManager.changePassword(targetCode, newPass);
            document.getElementById('targetUserCode').value = '';
            document.getElementById('targetNewPassword').value = '';
            showToast("رمز عبور کاربر با موفقیت تغییر کرد.");
        } catch (error) {
            showToast(error.message, "error");
        }
    });

    // مدیریت نمایش صفحات بر اساس لاگین
    function checkLoginStatus() {
        let user = AuthManager.getCurrentUser();
        
        loginView.style.display = 'none';
        dashboardView.style.display = 'none';
        settingsView.style.display = 'none';
        headerActions.style.display = 'none';
        adminSettingsSection.style.display = 'none';

        if (user) {
            // کاربر لاگین کرده است: نمایش داشبورد اصلی
            dashboardView.style.display = 'block';
            headerActions.style.display = 'flex'; // نمایش آیکون چرخ‌دنده و خروج
            document.getElementById('welcomeName').innerText = user.name;
            
            // اگر مدیر است، بخش مدیریت تنظیمات را هم فعال کن
            if(user.role === 'admin') {
                adminSettingsSection.style.display = 'block';
            }
        } else {
            // کاربر لاگین نکرده است: نمایش صفحه ورود
            loginView.style.display = 'block';
        }
    }
    // ==========================================
    // منطق مربوط به دکمه شناور و مودال افزودن
    // ==========================================
    
    const fabAdd = document.getElementById('fabAdd');
    const addModal = document.getElementById('addModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    
    const tabProject = document.getElementById('tabProject');
    const tabTask = document.getElementById('tabTask');
    const formProject = document.getElementById('formProject');
    const formTask = document.getElementById('formTask');

    const taskProjectSelect = document.getElementById('taskProjectSelect');
    const taskAssigneeSelect = document.getElementById('taskAssigneeSelect');

    // باز کردن مودال (و لود کردن پویای لیست پروژه‌ها و پرسنل)
    fabAdd.addEventListener('click', async () => {
        addModal.classList.add('active');
        
        // ۱. پر کردن لیست پرسنل از AuthManager
        taskAssigneeSelect.innerHTML = '<option value="" disabled selected>مسئول انجام کار...</option>';
        AuthManager.usersList.forEach(u => {
            let opt = document.createElement('option');
            opt.value = u.id;
            opt.innerText = `${u.name} (${u.id})`;
            taskAssigneeSelect.appendChild(opt);
        });

        // ۲. پر کردن لیست پروژه‌ها از دیتابیس
        taskProjectSelect.innerHTML = '<option value="" disabled selected>انتخاب پروژه مرتبط...</option>';
        let projects = await DBManager.getProjects();
        projects.forEach(p => {
            let opt = document.createElement('option');
            opt.value = p._id;
            opt.innerText = p.title;
            taskProjectSelect.appendChild(opt);
        });
    });

    // بستن مودال
    btnCloseModal.addEventListener('click', () => {
        addModal.classList.remove('active');
    });

    // تغییر تب بین پروژه و تسک
    tabProject.addEventListener('click', () => {
        tabProject.classList.add('active');
        tabTask.classList.remove('active');
        formProject.style.display = 'block';
        formTask.style.display = 'none';
    });

    tabTask.addEventListener('click', () => {
        tabTask.classList.add('active');
        tabProject.classList.remove('active');
        formTask.style.display = 'block';
        formProject.style.display = 'none';
    });

    // ثبت پروژه در دیتابیس
    document.getElementById('btnSaveProject').addEventListener('click', async () => {
        let title = document.getElementById('projTitle').value.trim();
        let desc = document.getElementById('projDesc').value.trim();

        if(!title) return showToast('عنوان پروژه الزامی است!', 'error');

        try {
            await DBManager.saveProject({ title: title, description: desc, createdBy: AuthManager.getCurrentUser().id });
            document.getElementById('projTitle').value = '';
            document.getElementById('projDesc').value = '';
            showToast('پروژه با موفقیت ایجاد شد.');
            btnCloseModal.click();
        } catch (err) {
            showToast('خطا در ثبت پروژه', 'error');
        }
    });

    // ثبت تسک در دیتابیس
    document.getElementById('btnSaveTask').addEventListener('click', async () => {
        let projId = taskProjectSelect.value;
        let title = document.getElementById('taskTitle').value.trim();
        let assignee = taskAssigneeSelect.value;
        let tag = document.getElementById('taskTag').value;

        if(!projId || !title || !assignee || !tag) {
            return showToast('لطفاً تمام فیلدها را پر کنید.', 'error');
        }

        try {
            await DBManager.saveTask({
                projectId: projId,
                title: title,
                assigneeId: assignee,
                tag: tag,
                creatorId: AuthManager.getCurrentUser().id
            });
            
            document.getElementById('taskTitle').value = '';
            showToast('تسک جدید با موفقیت ارجاع داده شد.');
            btnCloseModal.click();
        } catch (err) {
            showToast('خطا در ثبت تسک', 'error');
        }
    });
});
