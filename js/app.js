document.addEventListener('DOMContentLoaded', () => {
    
    // راه‌اندازی دیتابیس در شروع برنامه
    DBManager.init();

    const loginView = document.getElementById('login-view');
    const taskView = document.getElementById('task-view');
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const usernameInput = document.getElementById('usernameInput');
    const btnSubmitFinal = document.getElementById('btnSubmitFinal');

    // یک تسک فرضی برای تست که مسئول آن "ali" است
    let currentTask = {
        id: 'task_1',
        title: 'ساخت نمونه اولیه',
        assigneeId: 'ali', 
        status: 'pending',
        reports: []
    };

    // بررسی اینکه آیا کسی از قبل لاگین هست یا خیر
    checkLoginStatus();

    // رویداد دکمه ورود
    const userSelect = document.getElementById('userSelect'); // تغییر یافته

    btnLogin.addEventListener('click', () => {
        let username = userSelect.value; // گرفتن مقدار از لیست کشویی
        
        if(username) {
            AuthManager.login(username, username); 
            checkLoginStatus();
        } else {
            alert("لطفاً نام خود را از لیست انتخاب کنید.");
        }
    });

    // رویداد دکمه خروج
    btnLogout.addEventListener('click', () => {
        AuthManager.logout();
        checkLoginStatus();
    });

    function checkLoginStatus() {
        let user = AuthManager.getCurrentUser();
        if (user) {
            loginView.style.display = 'none';
            taskView.style.display = 'block';
            btnLogout.style.display = 'block';
            renderTaskPage(user);
        } else {
            loginView.style.display = 'block';
            taskView.style.display = 'none';
            btnLogout.style.display = 'none';
        }
    }

    function renderTaskPage(user) {
        // استفاده از لاجیک بررسی مسئول تسک
        let isUserAssignee = TaskLogic.isAssignee(currentTask, user.id);

        if (isUserAssignee) {
            btnSubmitFinal.style.display = 'block'; // نمایش دکمه سبز گزارش نهایی
        } else {
            btnSubmitFinal.style.display = 'none'; // مخفی کردن دکمه نهایی برای سایرین
        }
    }
});
