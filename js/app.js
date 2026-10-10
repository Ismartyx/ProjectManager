// سیستم پیام‌های شناور (Toast)
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    
    // حذف خودکار پیام بعد از 3 ثانیه
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.4s forwards';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    // راه‌اندازی دیتابیس
    DBManager.init();

    // ==========================================
    // دریافت المان‌های HTML
    // ==========================================
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const settingsView = document.getElementById('settings-view');
    const adminSettingsSection = document.getElementById('admin-settings-section');
    const headerActions = document.getElementById('headerActions');
    
    // دکمه‌های اصلی و نویگیشن
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const btnSettings = document.getElementById('btnSettings');
    const btnBackToDashboard = document.getElementById('btnBackToDashboard');
    
    // دکمه‌های تنظیمات
    const btnAddUser = document.getElementById('btnAddUser');
    const btnChangeMyPass = document.getElementById('btnChangeMyPass');
    const btnAdminChangePass = document.getElementById('btnAdminChangePass');

    // ورودی‌های لاگین
    const personnelCodeInput = document.getElementById('personnelCodeInput');
    const nationalCodeInput = document.getElementById('nationalCodeInput');

    // المان‌های مودال (پاپ‌آپ ایجاد پروژه/تسک)
    const fabAdd = document.getElementById('fabAdd');
    const addModal = document.getElementById('addModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    
    const tabProject = document.getElementById('tabProject');
    const tabTask = document.getElementById('tabTask');
    const formProject = document.getElementById('formProject');
    const formTask = document.getElementById('formTask');

    const taskProjectSelect = document.getElementById('taskProjectSelect');
    const advancedTaskOptions = document.getElementById('advancedTaskOptions');
    const taskAssigneeSelect = document.getElementById('taskAssigneeSelect');
    const taskFinalizerSelect = document.getElementById('taskFinalizerSelect');
    const taskTag = document.getElementById('taskTag');

    const btnSaveProject = document.getElementById('btnSaveProject');
    const btnSaveTask = document.getElementById('btnSaveTask');

    // بررسی وضعیت ورود در زمان باز شدن برنامه
    checkLoginStatus();

    // ==========================================
    // هندل کردن ورود و خروج
    // ==========================================
    
    // امکان زدن کلید اینتر برای ورود
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
    // جابجایی بین داشبورد و تنظیمات
    // ==========================================
    btnSettings.addEventListener('click', () => {
        dashboardView.style.display = 'none';
        settingsView.style.display = 'block';
    });

    btnBackToDashboard.addEventListener('click', () => {
        settingsView.style.display = 'none';
        dashboardView.style.display = 'block';
    });

    // ==========================================
    // عملیات صفحه تنظیمات (تغییر رمز و ثبت کاربر)
    // ==========================================
    btnAddUser.addEventListener('click', () => {
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

    // ==========================================
    // منطق پاپ‌آپ افزودن (دکمه شناور +)
    // ==========================================
    fabAdd.addEventListener('click', async () => {
        addModal.classList.add('active');
        
        let currentUser = AuthManager.getCurrentUser();
        
        // نمایش/مخفی کردن فیلدهای پیشرفته بر اساس مجوز کاربر
        if (currentUser.canAssignTasks || currentUser.role === 'admin') {
            advancedTaskOptions.style.display = 'block';
            
            taskAssigneeSelect.innerHTML = '<option value="" disabled selected>مسئول انجام کار...</option>';
            taskFinalizerSelect.innerHTML = '<option value="" disabled selected>مسئول نهایی کردن و تایید تسک...</option>';
            
            AuthManager.usersList.forEach(u => {
                let opt1 = document.createElement('option');
                opt1.value = u.id; opt1.innerText = `${u.name} (${u.id})`;
                taskAssigneeSelect.appendChild(opt1);

                let opt2 = document.createElement('option');
                opt2.value = u.id; opt2.innerText = `${u.name} (${u.id})`;
                taskFinalizerSelect.appendChild(opt2);
            });
        } else {
            advancedTaskOptions.style.display = 'none';
        }

        // لود کردن پروژه‌ها از دیتابیس
        taskProjectSelect.innerHTML = '<option value="" disabled selected>انتخاب پروژه مرتبط...</option>';
        let projects = await DBManager.getProjects();
        projects.forEach(p => {
            let opt = document.createElement('option');
            opt.value = p._id;
            opt.innerText = p.title;
            taskProjectSelect.appendChild(opt);
        });
    });

    btnCloseModal.addEventListener('click', () => {
        addModal.classList.remove('active');
    });

    // جابجایی بین تب‌های "پروژه جدید" و "تسک جدید"
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

    // ==========================================
    // ثبت اطلاعات در دیتابیس
    // ==========================================
    
    // ثبت پروژه
    btnSaveProject.addEventListener('click', async () => {
        let title = document.getElementById('projTitle').value.trim();
        let desc = document.getElementById('projDesc').value.trim();

        if(!title) return showToast('عنوان پروژه الزامی است!', 'error');

        try {
            await DBManager.saveProject({ 
                title: title, 
                description: desc, 
                createdBy: AuthManager.getCurrentUser().id 
            });
            document.getElementById('projTitle').value = '';
            document.getElementById('projDesc').value = '';
            showToast('پروژه با موفقیت ایجاد شد.');
            btnCloseModal.click(); // بستن پاپ‌آپ
        } catch (err) {
            showToast('خطا در ثبت پروژه', 'error');
        }
    });

    // ثبت تسک
    btnSaveTask.addEventListener('click', async () => {
        let currentUser = AuthManager.getCurrentUser();
        // بررسی اینکه آیا کاربر حق ارجاع به دیگران را دارد یا خیر
        let hasPower = currentUser.canAssignTasks || currentUser.role === 'admin';
        
        let projId = taskProjectSelect.value;
        let title = document.getElementById('taskTitle').value.trim();
        let tag = taskTag.value;
        
        // اگر شخص معمولی است، وظایف مستقیم به نام خودش ثبت می‌شود
        let assignee = hasPower ? taskAssigneeSelect.value : currentUser.id;
        let finalizer = hasPower ? taskFinalizerSelect.value : currentUser.id;

        if(!projId || !title || !tag || (hasPower && (!assignee || !finalizer))) {
            return showToast('لطفاً تمام فیلدها را پر کنید.', 'error');
        }

        let newTask = {
            projectId: projId,
            title: title,
            assigneeId: assignee,      // کسی که الان وظیفه انجامش را دارد
            finalizerId: finalizer,    // تنها کسی که حق دارد تسک را کامل کند
            creatorId: currentUser.id,
            tag: tag,
            status: 'pending',
            observers: [currentUser.id, 'admin'], // سازنده و ادمین همیشه در جریان کار هستند
            transferRequest: null      // درخواست انتقالی در لحظه ثبت وجود ندارد
        };

        try {
            await DBManager.saveTask(newTask);
            document.getElementById('taskTitle').value = '';
            showToast('تسک با موفقیت ایجاد شد.');
            btnCloseModal.click();
        } catch (err) {
            showToast('خطا در ثبت تسک', 'error');
        }
    });

    // ==========================================
    // تابع کنترل سطوح دسترسی در صفحات
    // ==========================================
    function checkLoginStatus() {
        let user = AuthManager.getCurrentUser();
        
        // در ابتدا همه چیز را مخفی کن
        loginView.style.display = 'none';
        dashboardView.style.display = 'none';
        settingsView.style.display = 'none';
        headerActions.style.display = 'none';
        adminSettingsSection.style.display = 'none';
        fabAdd.style.display = 'none';

        if (user) {
            // کاربر لاگین کرده است: نمایش داشبورد
            dashboardView.style.display = 'block';
            headerActions.style.display = 'flex'; // دکمه خروج و چرخ‌دنده
            document.getElementById('welcomeName').innerText = user.name;
            
            // دکمه شناور (+) برای همه کاربران لاگین شده فعال است
            fabAdd.style.display = 'flex';
            
            // اگر مدیر است، بخش مدیریت تنظیمات (ثبت کاربر و تغییر رمز بقیه) فعال شود
            if(user.role === 'admin') {
                adminSettingsSection.style.display = 'block';
            }
        } else {
            // کاربر لاگین نکرده است: نمایش صفحه ورود
            loginView.style.display = 'block';
        }
    }
});
