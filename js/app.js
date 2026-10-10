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

    const loginView = document.getElementById('login-view');
    const taskView = document.getElementById('task-view');
    const adminView = document.getElementById('admin-view');
    
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const btnAddUser = document.getElementById('btnAddUser');
    
    // دکمه‌های تغییر رمز
    const btnChangeMyPass = document.getElementById('btnChangeMyPass');
    const btnAdminChangePass = document.getElementById('btnAdminChangePass');

    const personnelCodeInput = document.getElementById('personnelCodeInput');
    const nationalCodeInput = document.getElementById('nationalCodeInput');

    checkLoginStatus();

    // ====== مشکل اینتر: پشتیبانی از زدن کلید Enter برای ورود ======
    const handleEnterPress = (event) => {
        if (event.key === 'Enter') {
            btnLogin.click(); // شبیه‌سازی کلیک روی دکمه ورود
        }
    };
    personnelCodeInput.addEventListener('keypress', handleEnterPress);
    nationalCodeInput.addEventListener('keypress', handleEnterPress);

    // فرآیند ورود
    btnLogin.addEventListener('click', () => {
        let pCode = personnelCodeInput.value.trim();
        let nCode = nationalCodeInput.value.trim();
        
        if(!pCode || !nCode) {
            return showToast("لطفا هر دو فیلد را پر کنید.", "error");
        }

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

    // ====== ثبت کاربر توسط مدیر ======
    btnAddUser.addEventListener('click', () => {
        let name = document.getElementById('newUserName').value.trim();
        let code = document.getElementById('newUserCode').value.trim();
        let nat = document.getElementById('newUserNatCode').value.trim();

        if(!name || !code || !nat) {
            return showToast("اطلاعات پرسنل ناقص است.", "error");
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

    // ====== تغییر رمز توسط خود شخص ======
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

    // ====== تغییر رمز پرسنل توسط مدیر ======
    btnAdminChangePass.addEventListener('click', () => {
        let targetCode = document.getElementById('targetUserCode').value.trim();
        let newPass = document.getElementById('targetNewPassword').value.trim();
        
        if(!targetCode || !newPass) return showToast("لطفا کد پرسنلی و رمز جدید را وارد کنید.", "error");
        
        try {
            AuthManager.changePassword(targetCode, newPass);
            document.getElementById('targetUserCode').value = '';
            document.getElementById('targetNewPassword').value = '';
            showToast("رمز عبور کاربر با موفقیت تغییر کرد.");
        } catch (error) {
            showToast(error.message, "error");
        }
    });

    // بررسی وضعیت لاگین
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
            
            if(user.role === 'admin') {
                adminView.style.display = 'block';
            }
        } else {
            loginView.style.display = 'block';
        }
    }
});
