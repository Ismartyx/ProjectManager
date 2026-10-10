// === در ابتدای فایل، داخل DOMContentLoaded ===
    document.addEventListener('DOMContentLoaded', async () => { // async اضافه شد
        DBManager.init();
        await DBManager.initDefaultTags(); // لود تگ‌های پیش‌فرض
        
        // ... (بقیه متغیرهای DOM) ...
        const taskTagSelect = document.getElementById('taskTagSelect');
        const btnAddCustomTag = document.getElementById('btnAddCustomTag');
        const globalTagLabel = document.getElementById('globalTagLabel');
        const chkGlobalTag = document.getElementById('chkGlobalTag');

        // ... (بخش ثبت کاربر - این بخش حتماً درست کار خواهد کرد) ...
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

        // ... (بخش باز شدن مودال FAB) ...
        fabAdd.addEventListener('click', async () => {
            addModal.classList.add('active');
            let currentUser = AuthManager.getCurrentUser();
            
            // نمایش چک‌باکس "تگ سراسری" فقط برای ادمین
            if (currentUser.role === 'admin') {
                globalTagLabel.style.display = 'flex';
            } else {
                globalTagLabel.style.display = 'none';
            }

            // لود کردن پروژه‌ها، پرسنل و **تگ‌ها**
            await reloadTagsInDropdown(currentUser);
            // ... (بقیه کدهای لود پرسنل و پروژه)
        });

        // === تابع جدید برای لود کردن تگ‌ها ===
        async function reloadTagsInDropdown(user) {
            taskTagSelect.innerHTML = '<option value="" disabled selected>دسته‌بندی (تگ)...</option>';
            let tags = await DBManager.getTags(user.id);
            tags.forEach(t => {
                taskTagSelect.innerHTML += `<option value="${t.title}">${t.title}</option>`;
            });
        }

        // === افزودن تگ دلخواه ===
        btnAddCustomTag.addEventListener('click', async () => {
            let tagTitle = document.getElementById('newTagInput').value.trim();
            let currentUser = AuthManager.getCurrentUser();
            
            if(!tagTitle) return showToast('نام تگ را بنویسید.', 'error');
            
            // ادمین می‌تواند تصمیم بگیرد تگ برای همه باشد یا فقط خودش
            let isGlobal = currentUser.role === 'admin' ? chkGlobalTag.checked : false;

            try {
                await DBManager.saveTag(tagTitle, currentUser.id, isGlobal);
                document.getElementById('newTagInput').value = '';
                chkGlobalTag.checked = false;
                showToast('تگ جدید اضافه شد.');
                // رفرش لیست تگ‌ها
                await reloadTagsInDropdown(currentUser);
                // انتخاب خودکار تگ جدید
                taskTagSelect.value = tagTitle;
            } catch (err) {
                showToast('خطا در ثبت تگ', 'error');
            }
        });
        
        // ... (ثبت تسک - تغییر دریافت مقدار تگ از فیلد جدید)
        document.getElementById('btnSaveTask').addEventListener('click', async () => {
            // ... (متغیرها)
            let tag = taskTagSelect.value; // گرفتن مقدار از Select جدید
            
            if(!projId || !title || !tag || (hasPower && (!assignee || !finalizer))) {
                return showToast('لطفاً تمام فیلدها را پر کنید.', 'error');
            }
            // ...
        });

        // ... (بقیه توابع) ...
    });
