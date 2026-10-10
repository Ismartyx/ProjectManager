const TaskLogic = {
    
    // ۱. بررسی اینکه آیا کاربر فعلی، مسئول این تسک هست یا نه؟
    isAssignee: function(task, userId) {
        return task.assigneeId === userId;
    },

    // ۲. تغییر مسئول تسک (که گفتید باید قابلیت تغییر داشته باشه)
    changeAssignee: async function(task, newAssigneeId) {
        task.assigneeId = newAssigneeId;
        // فراخوانی دیتابیس برای ذخیره تغییرات (از فایلی که در مرحله قبل ساختیم)
        await DBManager.saveTask(task);
        return task;
    },

    // ۳. ثبت گزارش یا نظر
    addReport: async function(task, text, isFinalReport, attachments = []) {
        let user = AuthManager.getCurrentUser();
        
        if (!user) {
            throw new Error("لطفاً ابتدا وارد حساب کاربری خود شوید.");
        }

        // کنترل دسترسی: اگر گزارش نهایی است، فقط مسئول تسک حق ثبت دارد
        if (isFinalReport && !this.isAssignee(task, user.id)) {
            throw new Error("شما مسئول این کار نیستید و فقط می‌توانید نظر ثبت کنید، نه گزارش نهایی!");
        }

        let newReport = {
            id: 'rep_' + Date.now(),
            userId: user.id,
            userName: user.name,
            text: text,
            isFinal: isFinalReport,
            attachments: attachments, // برای عکس و لینک
            timestamp: Date.now() // تاریخ و ساعت دقیق سرور/گوشی
        };

        // اگر آرایه گزارش‌ها وجود نداشت، آن را بساز
        if (!task.reports) {
            task.reports = [];
        }
        
        task.reports.push(newReport);

        // اگر گزارش نهایی بود، وضعیت تسک را به «انجام شده» تغییر بده
        if (isFinalReport) {
            task.status = 'completed';
        }

        // ذخیره تغییرات در دیتابیس
        await DBManager.saveTask(task);
        return task;
    }
};
