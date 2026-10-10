// سیستم پیام‌های شناور (Toast)
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.innerText = message;
    
    container.appendChild(toast);
    
    // حذف خودکار بعد از 3 ثانیه
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.4s forwards';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    
    DBManager.init();

    const loginView = document.getElementById('login-view');
    const taskView = document.getElementById('task-view');
    const adminView = document.getElementById('admin-view');
    
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const btnAddUser = document.getElementById('btnAddUser');

    checkLoginStatus();

    // فرآیند ورود
    btnLogin.addEventListener('click', () => {
        let pCode = document.getElementById('personnelCodeInput').value.trim();
        let nCode = document.getElementById('nationalCodeInput').value.trim();
        
        if(!pCode || !nCode) {
            showToast("لطفا هر دو فیلد را پر کنید.", "error");
            return;
        }

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

    // خروج
    btnLogout.addEventListener('click', () => {
        AuthManager.logout();
        checkLoginStatus();
    });

    // ثبت کاربر توسط مدیر
    btnAddUser.addEventListener('click', () => {
        let name = document.getElementById('newUserName').value.trim();
        let code = document.getElementById('newUserCode').value.trim();
        let nat = document.getElementById('newUserNatCode').value.trim();

        if(!name || !code || !nat) {
            showToast("اطلاعات پرسنل ناقص است.", "error");
            return;
        }

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

    function checkLoginStatus() {
        let user = AuthManager.getCurrentUser();
        
        loginView.style.display = 'none';
        taskView.style.display = 'none';
        adminView.style.display = 'none';
        btnLogout.style.display = 'none';

        if (user) {
            btnLogout.style.display = 'block';
            taskView.style.display = 'block';
            document.getElementById('welcomeName').innerText = user.name;
            
            // اگر مدیر بود، پنل مدیریت را هم نشان بده
            if(user.role === 'admin') {
                adminView.style.display = 'block';
            }
        } else {
            loginView.style.display = 'block';
        }
    }
});
